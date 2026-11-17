import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  executeContentStudioAgent,
  validateProductClaims,
  resolveProductGrounding,
  detectProductConflicts,
  lookupProductRecord,
} from '@/lib/services/content-studio';
import { ContentAgentOutputSchema } from '@/lib/agents/schemas';

// Mock the Gemini client wrapper so tests run deterministically in CI/test environments
vi.mock('@/lib/ai/gemini-client', () => ({
  getGeminiClient: vi.fn(),
  generateStructuredWithGemini: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    from: (table: string) => ({
      insert: (rows: any[]) => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'mock-content-uuid-phase2a1' }, error: null }),
        }),
      }),
    }),
  }),
}));

// Mock Approval request service
vi.mock('@/lib/services/approvals', () => ({
  createApprovalRequest: vi.fn().mockResolvedValue({
    success: true,
    data: {
      id: 'mock-approval-uuid-phase2a1',
      status: 'pending',
      action_type: 'content_publish',
    },
  }),
}));

import { generateStructuredWithGemini } from '@/lib/ai/gemini-client';
import { createApprovalRequest } from '@/lib/services/approvals';

describe('Phase 2A.1 — Product Claim Verification & Grounding Safeguards', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.GEMINI_API_KEY = 'valid-test-gemini-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1. Unsupported Absolute Claims Removal (Requirement 2)', () => {
    it('detects and rejects unsupported absolute claims such as "never scratches" and "zero scratches"', () => {
      const check1 = validateProductClaims('This acrylic frame features a flush magnet that never scratches metallic surfaces');
      expect(check1.valid).toBe(false);
      expect(check1.forbiddenClaimsFound[0]).toContain('never scratches');

      const check2 = validateProductClaims('Guaranteed zero scratches on any refrigerator or steel surface');
      expect(check2.valid).toBe(false);
      expect(check2.forbiddenClaimsFound[0]).toContain('never scratches');
    });

    it('detects and rejects absolute "scratch-proof" claims while permitting qualified "scratch-resistant"', () => {
      const checkScratchProof = validateProductClaims('Our 100% scratch-proof acrylic magnet keeps photos pristine');
      expect(checkScratchProof.valid).toBe(false);

      const checkScratchResistant = validateProductClaims('Features a scratch-resistant gloss seal and diamond-polished edges');
      expect(checkScratchResistant.valid).toBe(true);
      expect(checkScratchResistant.forbiddenClaimsFound.length).toBe(0);
    });

    it('detects and rejects absolute durability claims ("unbreakable", "indestructible", "bulletproof")', () => {
      const checkUnbreakable = validateProductClaims('Unbreakable cast acrylic core with indestructible edges');
      expect(checkUnbreakable.valid).toBe(false);
      expect(checkUnbreakable.forbiddenClaimsFound).toContain(
        'unsupported durability claim (unbreakable / indestructible)'
      );

      const checkBulletproof = validateProductClaims('Bulletproof monolithic block design');
      expect(checkBulletproof.valid).toBe(false);
      expect(checkBulletproof.forbiddenClaimsFound).toContain('bulletproof');
    });

    it('rejects agent execution immediately when user prompt contains "never scratches"', async () => {
      const result = await executeContentStudioAgent({
        sku: 'KRA-SQU-0303',
        topic_or_prompt: 'Emphasize that our flush magnet never scratches your premium refrigerator',
      });

      expect(result.success).toBe(false);
      expect(result.execution_mode).toBe('error');
      expect(result.error).toContain('never scratches');
      expect(result.model_invoked).toBe(false);
      expect(generateStructuredWithGemini).not.toHaveBeenCalled();
    });
  });

  describe('2. Supporting Records Requirement & No Automatic Assumptions (Requirements 1 & 3)', () => {
    it('does NOT automatically assume N35 magnets for products without magnetic hardware (e.g. keychains)', () => {
      const grounding = resolveProductGrounding({
        sku: 'KRA-KEY-CIR25',
      });

      expect(grounding.hasSupportingRecords).toBe(true);
      expect(grounding.sku).toBe('KRA-KEY-CIR25');

      // Verify that N35 magnet is NOT in verified specs for keychains
      const hasMagnetSpec = grounding.verifiedSpecs.some((s) => s.toLowerCase().includes('magnet'));
      expect(hasMagnetSpec).toBe(false);

      // Verify hardware is chrome swivel ring
      const hasSwivelRing = grounding.verifiedSpecs.some((s) => s.toLowerCase().includes('swivel'));
      expect(hasSwivelRing).toBe(true);
    });

    it('grounds MAPF products on approved factory standards (92% transmission, N52 magnets, 20mm), NOT 93% or N35', () => {
      const grounding = resolveProductGrounding({
        sku: 'MAPF-0406-CL',
      });

      expect(grounding.hasSupportingRecords).toBe(true);
      expect(grounding.sku).toBe('MAPF-0406-CL');

      // Must have 92% transmission (factory record), NOT 93%
      const specsString = grounding.verifiedSpecs.join(' ');
      expect(specsString).toContain('92% light transmission');
      expect(specsString).not.toContain('93% optical clarity');

      // Must have N52 magnets, NOT N35
      expect(specsString).toContain('N52');
      expect(specsString).not.toContain('N35');

      // Must have 20mm thickness, NOT 2mm
      expect(specsString).toContain('20mm');
      expect(specsString).not.toContain('2mm monolithic');
    });

    it('does NOT automatically invent 93% clarity, diamond edges, N35 magnets, or location for unverified items', () => {
      const grounding = resolveProductGrounding({
        product_name: 'Custom Acrylic Wedding Plaque',
      });

      expect(grounding.hasSupportingRecords).toBe(false);

      const specsString = grounding.verifiedSpecs.join(' ');
      expect(specsString).not.toContain('93% optical clarity');
      expect(specsString).not.toContain('diamond-polished');
      expect(specsString).not.toContain('N35');
      expect(specsString).not.toContain('Hyderabad');
      expect(specsString).toContain('No verified factory specifications on record');
    });
  });

  describe('3. Omission of Unavailable Specifications (Requirement 5)', () => {
    it('omits SKU, dimensions, and materials rather than inventing defaults when not provided', () => {
      const grounding = resolveProductGrounding({
        topic_or_prompt: 'Write marketing copy about personalized acrylic gifts',
      });

      expect(grounding.sku).toBeUndefined();
      expect(grounding.dimensions).toBeUndefined();
      expect(grounding.productName).toBeUndefined();

      // Does NOT invent KRA-SQU-0303 or 3x3 inches
      expect(grounding.sku).not.toBe('KRA-SQU-0303');
      expect(grounding.dimensions).not.toBe('3 × 3 inches (2mm cell-cast acrylic with grade N35 flush neodymium magnet)');
    });

    it('omits edge finish when not explicitly recorded in the product specifications', () => {
      const record = lookupProductRecord({ sku: 'KRA-KEY-CIR25' });
      expect(record).toBeDefined();

      const grounding = resolveProductGrounding({ sku: 'KRA-KEY-CIR25' });
      // Keychain record has no diamond-polished edges
      const hasDiamondPolish = grounding.verifiedSpecs.some((s) => s.toLowerCase().includes('diamond-polished'));
      expect(hasDiamondPolish).toBe(false);
    });
  });

  describe('4. Conflicting Product Data Detection (Requirement 6)', () => {
    it('detects dimension conflict when user requests 8x10 frame for a 2x2 inch product', () => {
      const record = lookupProductRecord({ sku: 'KRA-SQU-0202' });
      expect(record).toBeDefined();

      const conflicts = detectProductConflicts(record!, {
        dimensions: '8x10 inches',
        topic_or_prompt: 'Showcase large 8x10 photo frame display',
      });

      expect(conflicts.length).toBeGreaterThan(0);
      const dimConflict = conflicts.find((c) => c.field === 'dimensions');
      expect(dimConflict).toBeDefined();
      expect(dimConflict?.verifiedValue).toContain('2 × 2');
      expect(dimConflict?.resolution).toContain('take precedence');
    });

    it('detects category and magnet conflict when user asks for fridge magnet on a tabletop MAPF block', () => {
      const record = lookupProductRecord({ sku: 'MAPF-0406-CL' });
      expect(record).toBeDefined();

      const conflicts = detectProductConflicts(record!, {
        topic_or_prompt: 'Compact fridge magnet that sticks to refrigerator with n35 magnets',
      });

      expect(conflicts.length).toBeGreaterThanOrEqual(2);
      const catConflict = conflicts.find((c) => c.field === 'product_category');
      const magnetConflict = conflicts.find((c) => c.field === 'magnet_grade');

      expect(catConflict).toBeDefined();
      expect(catConflict?.resolution).toContain('tabletop');

      expect(magnetConflict).toBeDefined();
      expect(magnetConflict?.verifiedValue).toContain('N52');
    });

    it('detects magnet conflict when user asks for magnetic fridge attachment on a keychain', () => {
      const record = lookupProductRecord({ sku: 'KRA-KEY-CIR25' });
      expect(record).toBeDefined();

      const conflicts = detectProductConflicts(record!, {
        topic_or_prompt: 'Double-sided keychain with magnetic fridge attachment',
      });

      expect(conflicts.length).toBeGreaterThan(0);
      const magnetConflict = conflicts.find((c) => c.field === 'magnet_attachment');
      expect(magnetConflict).toBeDefined();
      expect(magnetConflict?.resolution).toContain('no magnetic hardware');
    });

    it('passes conflict directives in execution and logs conflicts to approval request', async () => {
      const mockAiOutput = {
        title: 'Tabletop Elegance: 4x6 Acrylic Photo Frame',
        content_type: 'instagram_caption',
        body: 'Elevate your desk with our 20mm dual-block acrylic frame. Crafted from Grade-A imported virgin cast acrylic with 92% light transmission and secure N52 neodymium corner magnets.',
        target_audience: 'Executive desks, wedding studios',
        suggested_cta: 'Inquire for wholesale orders.',
        keywords_used: ['acrylic photo frame', 'desk frame'],
        recommended_visuals: 'Side-angle desk flatlay showing 20mm thickness.',
        reasoning_summary: 'Targeting executive desk decor with verified 20mm thickness and N52 magnets.',
        sources: ['MAPF Factory Standards'],
        verified_facts: [
          'Grade-A imported virgin cast acrylic (92% light transmission)',
          'N52 nickel-plated neodymium corner magnets',
          'Dimensions: 20mm (10mm + 10mm dual blocks)',
        ],
        user_provided_claims: ['User requested fridge magnet placement (corrected to tabletop desk display)'],
        ai_generated_suggestions: ['Suggest pairing with gold foil gift box packaging'],
        assumptions: ['Clients prioritize optical depth over lightweight fridge magnets'],
      };

      vi.mocked(generateStructuredWithGemini).mockResolvedValueOnce({
        data: mockAiOutput,
        model: 'gemini-3.5-flash-lite',
        rawJson: JSON.stringify(mockAiOutput),
      });

      const result = await executeContentStudioAgent({
        sku: 'MAPF-0406-CL',
        topic_or_prompt: 'Compact fridge magnet with N35 magnets',
      });

      expect(result.success).toBe(true);
      expect(result.conflicts_detected).toBeDefined();
      expect(result.conflicts_detected!.length).toBeGreaterThan(0);

      // Verify conflicts were forwarded to the approval request for reviewer audit
      expect(createApprovalRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          proposed_content: expect.objectContaining({
            conflicts_detected: expect.arrayContaining([
              expect.objectContaining({ field: 'product_category' }),
            ]),
          }),
        })
      );
    });
  });

  describe('5. Clean Separation of Verified Facts, User Claims & AI Suggestions (Requirement 4)', () => {
    it('returns separated verified_facts, user_provided_claims, and ai_generated_suggestions in output schema', async () => {
      const mockOutput = {
        title: 'Minimalist Square Keepsake (3x3")',
        content_type: 'product_description',
        body: 'Crafted from 2mm monolithic cell-cast acrylic with 93% optical clarity. Equipped with a flush N35 neodymium magnet designed to protect surfaces.',
        target_audience: 'Modern home decor',
        suggested_cta: 'Order personalized batch today.',
        keywords_used: ['acrylic magnet', 'hyderabad manufacturing'],
        recommended_visuals: 'Overhead macro shot on stainless steel surface.',
        reasoning_summary: 'Clean copy grounded strictly on verified factory specs.',
        sources: ['KRIA Catalog Specifications Matrix'],
        verified_facts: [
          '2mm monolithic cell-cast acrylic',
          'Grade N35 flush neodymium magnet',
          '93% optical clarity',
          'Manufactured in Hyderabad, India',
        ],
        user_provided_claims: [
          'Focus on young couples looking for anniversary return favors',
        ],
        ai_generated_suggestions: [
          'Highlight reflection of natural sunlight across diamond-beveled perimeter',
        ],
        assumptions: ['Couples prefer flush scratch-free mounts over protruding ceramic magnets'],
      };

      vi.mocked(generateStructuredWithGemini).mockResolvedValueOnce({
        data: mockOutput,
        model: 'gemini-3.5-flash-lite',
        rawJson: JSON.stringify(mockOutput),
      });

      const result = await executeContentStudioAgent({
        sku: 'KRA-SQU-0303',
        topic_or_prompt: 'Focus on young couples looking for anniversary return favors',
      });

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();

      const parsed = ContentAgentOutputSchema.parse(result.output);

      // Verify clean separation
      expect(parsed.verified_facts).toHaveLength(4);
      expect(parsed.verified_facts).toContain('2mm monolithic cell-cast acrylic');
      expect(parsed.verified_facts).not.toContain('Focus on young couples looking for anniversary return favors');

      expect(parsed.user_provided_claims).toContain(
        'Focus on young couples looking for anniversary return favors'
      );

      expect(parsed.ai_generated_suggestions).toContain(
        'Highlight reflection of natural sunlight across diamond-beveled perimeter'
      );
    });
  });
});
