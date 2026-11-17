import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  executeContentStudioAgent,
  validateProductClaims,
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
          single: () => Promise.resolve({ data: { id: 'mock-content-uuid-123' }, error: null }),
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
      id: 'mock-approval-uuid-456',
      status: 'pending',
      action_type: 'content_publish',
    },
  }),
}));

import { generateStructuredWithGemini } from '@/lib/ai/gemini-client';
import { createApprovalRequest } from '@/lib/services/approvals';

describe('Phase 2A — Real Content Studio AI Agent & Gemini Integration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.GEMINI_API_KEY = 'valid-test-gemini-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1. Successful Model Invocation & Structured Output', () => {
    it('successfully invokes Gemini, validates schema, persists to Supabase, and returns honest live_ai metadata', async () => {
      const mockAiOutput = {
        title: 'Timeless Keepsakes: Minimal Square Acrylic Photo Magnet (3x3")',
        content_type: 'instagram_caption',
        body: 'Transform everyday moments into modern fridge art. ✨ Crafted from 2mm monolithic cast acrylic with 93% optical clarity, complete with a flush N35 magnet that protects your surfaces. Made in Hyderabad, India.',
        target_audience: 'Modern home decor, wedding return gifts, family keepsakes',
        suggested_cta: 'DM to order personalized bulk batches or sample kits.',
        keywords_used: ['acrylic photo magnet', 'fridge magnet wholesale', 'hyderabad manufacturing'],
        recommended_visuals: 'Overhead flatlay on a metallic stainless steel surface showing flush magnet alignment.',
        reasoning_summary: 'Crafted high-contrast caption emphasizing 93% clarity and flush scratch-free magnet.',
        sources: ['KRIA TECH Hyderabad Manufacturing Matrix'],
        verified_facts: [
          '2mm monolithic cell-cast acrylic',
          'Grade N35 flush neodymium magnet',
          '93% optical clarity with diamond-polished edges',
        ],
        assumptions: ['Audience values scratch-free magnets over cheap promotional plastic.'],
      };

      vi.mocked(generateStructuredWithGemini).mockResolvedValueOnce({
        data: mockAiOutput,
        model: 'gemini-3.5-flash-lite',
        rawJson: JSON.stringify(mockAiOutput),
      });

      const result = await executeContentStudioAgent({
        sku: 'KRA-SQU-0303',
        product_name: 'Minimal Square Acrylic Photo Magnet (3×3")',
        content_type: 'instagram_caption',
        target_audience: 'Modern home decor lovers',
      });

      // Assertions on honest execution metadata (Requirement 8)
      expect(result.success).toBe(true);
      expect(result.execution_mode).toBe('live_ai');
      expect(result.model_invoked).toBe(true);
      expect(result.is_simulated).toBe(false);
      expect(result.model_name).toBe('gemini-3.5-flash-lite');

      // Assertions on structured Zod schema (Requirement 5)
      expect(result.output).toBeDefined();
      const parsed = ContentAgentOutputSchema.parse(result.output);
      expect(parsed.title).toContain('Minimal Square');
      expect(parsed.verified_facts.length).toBeGreaterThanOrEqual(1);

      // Assertions on Supabase content_items persistence (Requirement 7)
      expect(result.saved_content_id).toBe('mock-content-uuid-123');

      // Assertions on human approval gate (Requirement 9)
      expect(result.approval_id).toBe('mock-approval-uuid-456');
      expect(createApprovalRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          action_type: 'content_publish',
          risk_level: 'medium',
        })
      );
    });
  });

  describe('2. Missing API Key Guardrail', () => {
    it('returns an explicit error and NEVER silently falls back to hardcoded templates when key is missing', async () => {
      delete process.env.GEMINI_API_KEY;

      vi.mocked(generateStructuredWithGemini).mockRejectedValueOnce(
        new Error('GEMINI_API_KEY is missing or unconfigured. Server-side AI model invocation cannot proceed.')
      );

      const result = await executeContentStudioAgent({
        sku: 'KRA-REC-0604',
        content_type: 'product_description',
      });

      expect(result.success).toBe(false);
      expect(result.execution_mode).toBe('error');
      expect(result.model_invoked).toBe(false);
      expect(result.is_simulated).toBe(false);
      expect(result.output).toBeUndefined();
      expect(result.error).toContain('GEMINI_API_KEY is missing');
    });
  });

  describe('3. Provider Failure (Network / 500 / 503)', () => {
    it('explicitly reports provider failure and NEVER masks errors with fake responses', async () => {
      vi.mocked(generateStructuredWithGemini).mockRejectedValueOnce(
        new Error('Gemini AI invocation failed (gemini-3.5-flash-lite): 503 Service Unavailable')
      );

      const result = await executeContentStudioAgent({
        sku: 'KRA-REC-0604',
        content_type: 'article',
      });

      expect(result.success).toBe(false);
      expect(result.execution_mode).toBe('error');
      expect(result.model_invoked).toBe(false);
      expect(result.is_simulated).toBe(false);
      expect(result.output).toBeUndefined();
      expect(result.error).toContain('503 Service Unavailable');
    });
  });

  describe('4. Input Validation & Schema Failures', () => {
    it('catches and reports schema validation errors if model returns malformed data', async () => {
      vi.mocked(generateStructuredWithGemini).mockRejectedValueOnce(
        new Error('Gemini response failed schema validation: verified_facts: Must list at least one verified fact.')
      );

      const result = await executeContentStudioAgent({
        sku: 'KRA-REC-0604',
        content_type: 'product_description',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('failed schema validation');
      expect(result.model_invoked).toBe(false);
    });
  });

  describe('5. Unsupported Product Claims Defense (Requirement 6)', () => {
    it('detects and flags unverified claims (bulletproof, ISO 9001, military grade)', () => {
      const check1 = validateProductClaims('Make this acrylic magnet look bulletproof and indestructible');
      expect(check1.valid).toBe(false);
      expect(check1.forbiddenClaimsFound).toContain('bulletproof');

      const check2 = validateProductClaims('State that KRIA has ISO-9001 aerospace certification');
      expect(check2.valid).toBe(false);
      expect(check2.forbiddenClaimsFound).toContain('unverified ISO certification');
      expect(check2.forbiddenClaimsFound).toContain('unsupported military/aerospace claim');

      const check3 = validateProductClaims('Describe 93% optical clarity with flush N35 magnet and diamond beveled edges');
      expect(check3.valid).toBe(true);
      expect(check3.forbiddenClaimsFound.length).toBe(0);
    });

    it('rejects execution immediately when user prompts contain forbidden false claims', async () => {
      const result = await executeContentStudioAgent({
        sku: 'KRA-SQU-0303',
        topic_or_prompt: 'Claim that our frames are bulletproof and have a lifetime warranty',
      });

      expect(result.success).toBe(false);
      expect(result.execution_mode).toBe('error');
      expect(result.error).toContain('Unsupported or false product claims detected');
      expect(result.error).toContain('bulletproof');
      expect(result.model_invoked).toBe(false);
      expect(generateStructuredWithGemini).not.toHaveBeenCalled();
    });
  });

  describe('6. Approval Workflow & Draft Enforcement (Requirement 9)', () => {
    it('guarantees that generated content remains in draft status and is routed to human review', async () => {
      const mockOutput = {
        title: 'Draft Post for Review',
        content_type: 'reels_script',
        body: 'Scene 1: Close up on 20mm crystal acrylic block...',
        target_audience: 'Photographers',
        suggested_cta: 'Order sample',
        keywords_used: ['acrylic'],
        recommended_visuals: 'Studio shot',
        reasoning_summary: 'Targeting photographers',
        sources: ['Catalog'],
        verified_facts: ['20mm thickness'],
        assumptions: ['High demand in wedding season'],
      };

      vi.mocked(generateStructuredWithGemini).mockResolvedValueOnce({
        data: mockOutput,
        model: 'gemini-3.5-flash-lite',
        rawJson: JSON.stringify(mockOutput),
      });

      const result = await executeContentStudioAgent({
        sku: 'MAPF-0406-CL',
        content_type: 'reels_script',
      });

      expect(result.success).toBe(true);
      expect(createApprovalRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          action_type: 'content_publish',
          agent_id: 'content-agent',
          risk_level: 'medium',
        })
      );
    });
  });
});
