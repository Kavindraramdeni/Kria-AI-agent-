import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeCompetitorAgent } from '@/lib/services/competitor-intelligence';
import { CompetitorAgentOutputSchema } from '@/lib/agents/schemas';
import { NextRequest } from 'next/server';

// Mock the Gemini client wrapper
vi.mock('@/lib/ai/gemini-client', () => ({
  getGeminiClient: vi.fn(),
  generateStructuredWithGemini: vi.fn(),
}));

// Top-level controllable mock state
const mockSessionState = {
  currentSession: null as any,
};

vi.mock('@/lib/auth/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/session')>();
  return {
    ...actual,
    getServerSession: vi.fn().mockImplementation(() => Promise.resolve(mockSessionState.currentSession)),
    isAuthorizedOwner: vi.fn().mockImplementation(() => {
      const s = mockSessionState.currentSession;
      return Promise.resolve(Boolean(s && (s.role === 'owner' || s.role === 'admin')));
    }),
  };
});

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    from: (table: string) => ({
      insert: (rows: any[]) => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'mock-report-uuid-phase2d' }, error: null }),
        }),
      }),
      update: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
  }),
}));

// Mock Approval request service
vi.mock('@/lib/services/approvals', () => ({
  createApprovalRequest: vi.fn().mockResolvedValue({
    success: true,
    data: {
      id: 'mock-approval-uuid-phase2d',
      status: 'pending',
      action_type: 'campaign_launch',
    },
  }),
}));

import { generateStructuredWithGemini } from '@/lib/ai/gemini-client';
import { createApprovalRequest } from '@/lib/services/approvals';
import { POST as runAgent } from '@/app/api/agents/[agentId]/run/route';

describe('Phase 2D — Real Competitor Intelligence AI Agent & Market Gap Matrix', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.GEMINI_API_KEY = 'valid-test-gemini-key';
    mockSessionState.currentSession = {
      id: 'test-owner-001',
      email: 'admin@kriatech.com',
      role: 'owner',
      fullName: 'Kria Owner',
      isDemo: false,
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1. Real Gemini AI Competitor Benchmarking & Gap Analysis', () => {
    it('accurately benchmarks competitor against KRIA factory specifications, persists report, and submits to approval queue', async () => {
      const mockCompetitorOutput = {
        competitor_name: 'Mass Market Acrylic Suppliers (Aggregators)',
        products_analyzed: [
          {
            product_name: 'Standard 4x6 Acrylic Magnetic Frame',
            estimated_price: '₹599 - ₹699',
            thickness_spec: '12mm to 15mm extruded acrylic',
          },
        ],
        pricing_gap_vs_kria:
          'Competitors sell thinner 15mm extruded acrylic at ₹699. KRIA TECH direct factory price is ₹549 for 20mm premium cast acrylic (MAPF-0406-CL), giving KRIA a 21% retail price advantage and 33% thicker cross section.',
        kria_competitive_advantages: [
          'Virgin cast acrylic provides 92% optical transmission and will not yellow or craze under UV sunlight.',
          'Solid 20mm cross-section (10+10mm) provides self-standing stability on executive desks without wobbling.',
          'High-strength N52 nickel-plated corner magnets provide tight seal without image slipping.',
          'Direct Hyderabad factory fabrication eliminates middleman distributor markups.',
        ],
        opportunities: [
          'Target corporate gifting agencies and interior stylists looking for premium heavyweight acrylic blocks.',
          'Highlight risk of competitor frame yellowing and wobbling in B2B comparison marketing.',
        ],
        reasoning_summary:
          'Comprehensive ethical benchmarking comparing physical polymer grade, cross-sectional thickness, and direct factory pricing against public marketplace aggregators.',
        sources: [
          'Public Marketplace Listings',
          'Amazon India Acrylic Frame Benchmark',
          'KRIA Material Testing Specs',
        ],
        verified_facts: [
          'KRIA MAPF-0406-CL features 20mm total thickness (10+10mm) with diamond-beveled polish.',
          'KRIA factory direct price is ₹549 retail, ₹320 wholesale (25 MOQ).',
        ],
        assumptions: [
          'Aggregator retail pricing reflects 3-tier distributor markup and imported extruded sheet stock.',
        ],
      };

      vi.mocked(generateStructuredWithGemini).mockResolvedValueOnce({
        data: mockCompetitorOutput,
        model: 'gemini-3.5-flash-lite',
        rawJson: JSON.stringify(mockCompetitorOutput),
      });

      const result = await executeCompetitorAgent({
        competitor_name: 'Mass Market Acrylic Suppliers',
        sku: 'MAPF-0406-CL',
        target_category: 'Tabletop Acrylic Photo Blocks',
        topic_or_prompt: 'Compare 4x6 desk block thickness, light transmission, and pricing',
        actor_email: 'admin@kriatech.com',
      });

      // Honest Execution Metadata
      expect(result.success).toBe(true);
      expect(result.execution_mode).toBe('live_ai');
      expect(result.model_invoked).toBe(true);
      expect(result.is_simulated).toBe(false);
      expect(result.model_name).toBe('gemini-3.5-flash-lite');

      // Validated Output against Schema
      expect(result.output).toBeDefined();
      const parsed = CompetitorAgentOutputSchema.parse(result.output);
      expect(parsed.competitor_name).toBe('Mass Market Acrylic Suppliers (Aggregators)');
      expect(parsed.products_analyzed).toHaveLength(1);
      expect(parsed.products_analyzed[0].estimated_price).toBe('₹599 - ₹699');
      expect(parsed.pricing_gap_vs_kria).toContain('21% retail price advantage');
      expect(parsed.kria_competitive_advantages.length).toBeGreaterThanOrEqual(3);
      expect(parsed.opportunities.length).toBeGreaterThanOrEqual(2);
      expect(parsed.verified_facts.length).toBeGreaterThanOrEqual(1);

      // Persistence in Supabase competitor_reports
      expect(result.saved_report_id).toBe('mock-report-uuid-phase2d');

      // Routing to Approval Gate
      expect(result.approval_id).toBe('mock-approval-uuid-phase2d');
      expect(createApprovalRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          action_type: 'campaign_launch',
          agent_id: 'competitor-agent',
          risk_level: 'low',
          title: expect.stringContaining('Mass Market Acrylic Suppliers'),
        })
      );
    });

    it('correctly benchmarks fridge magnet category (KRA-REC-0604) against surface-scratching competitor magnets', async () => {
      const mockFridgeOutput = {
        competitor_name: 'Online Photo Gift Portals',
        products_analyzed: [
          {
            product_name: 'Custom 4x6 Photo Magnet',
            estimated_price: '₹199 - ₹249',
            thickness_spec: '1.2mm thin extruded plastic with glued protruding magnet',
          },
        ],
        pricing_gap_vs_kria:
          'Competitors charge ₹199-₹249 for thin 1.2mm bendable magnets. KRIA TECH factory storefront base is ₹113, and wholesale 100-pc rate is ₹85/pc, offering 57% lower wholesale cost.',
        kria_competitive_advantages: [
          '2mm monolithic cell-cast acrylic with 93% optical clarity (non-yellowing).',
          'Flush countersunk rare-earth N35 neodymium magnet prevents scratches on refrigerator and metal surfaces.',
          'Moisture-sealed photo core prevents edge peeling in humid kitchen environments.',
        ],
        opportunities: [
          'Promote "scratch-free flush magnet" design directly to wedding photographers and gift boutiques.',
          'Emphasize 50 MOQ accessible wholesale tier for boutique stores.',
        ],
        reasoning_summary:
          'Analyzed magnet mounting geometry and acrylic grade between marketplace aggregators and KRIA direct factory production.',
        sources: ['Public Marketplace Listings', 'KRIA Material Testing Specs'],
        verified_facts: [
          'KRIA KRA-REC-0604 utilizes 2mm cell-cast acrylic and flush countersunk N35 magnet.',
          'KRIA wholesale tier 100 pcs is ₹85/pc.',
        ],
        assumptions: ['Competitors use protruding ferrite strip magnets glued with contact adhesive.'],
      };

      vi.mocked(generateStructuredWithGemini).mockResolvedValueOnce({
        data: mockFridgeOutput,
        model: 'gemini-3.5-flash-lite',
        rawJson: JSON.stringify(mockFridgeOutput),
      });

      const result = await executeCompetitorAgent({
        competitor_name: 'Online Photo Gift Portals',
        sku: 'KRA-REC-0604',
        target_category: 'Magnetic Fridge Frame (Landscape / Panorama)',
        topic_or_prompt: 'Compare magnet mounting and durability against protruding ceramic magnets',
      });

      expect(result.success).toBe(true);
      expect(result.execution_mode).toBe('live_ai');
      expect(result.output?.kria_competitive_advantages).toContainEqual(
        expect.stringContaining('Flush countersunk rare-earth N35 neodymium magnet')
      );
    });
  });

  describe('2. Truth-in-Product Guardrails & Claim Verification', () => {
    it('strictly rejects input containing forbidden absolute durability claims ("never scratches")', async () => {
      const result = await executeCompetitorAgent({
        competitor_name: 'Generic Supplier',
        sku: 'KRA-REC-0604',
        topic_or_prompt: 'Prove to clients that our acrylic frame never scratches and is completely scratch-proof',
      });

      expect(result.success).toBe(false);
      expect(result.execution_mode).toBe('error');
      expect(result.model_invoked).toBe(false);
      expect(result.is_simulated).toBe(false);
      expect(result.error).toContain("unsupported absolute claim ('never scratches' / 'scratch-proof')");
      expect(generateStructuredWithGemini).not.toHaveBeenCalled();
    });

    it('strictly rejects input claiming unbreakable or military-grade certifications', async () => {
      const result = await executeCompetitorAgent({
        competitor_name: 'Generic Supplier',
        sku: 'MAPF-0406-CL',
        topic_or_prompt: 'Compare our unbreakable military-grade bulletproof acrylic block with competitors',
      });

      expect(result.success).toBe(false);
      expect(result.execution_mode).toBe('error');
      expect(result.model_invoked).toBe(false);
      expect(result.error).toContain('unbreakable');
      expect(generateStructuredWithGemini).not.toHaveBeenCalled();
    });
  });

  describe('3. Honest Provider Error Handling (No Silent Fallback to Hardcoded Data)', () => {
    it('returns explicit error when Gemini provider throws 503 / 500 error', async () => {
      vi.mocked(generateStructuredWithGemini).mockRejectedValueOnce(
        new Error('Gemini API Service Unavailable (503 High Load)')
      );

      const result = await executeCompetitorAgent({
        competitor_name: 'Apex Acrylics',
        sku: 'KRA-REC-0604',
        topic_or_prompt: 'Benchmark competitor pricing and turnaround',
      });

      expect(result.success).toBe(false);
      expect(result.execution_mode).toBe('error');
      expect(result.model_invoked).toBe(false);
      expect(result.is_simulated).toBe(false);
      expect(result.error).toContain('Gemini AI Competitor Analysis Failed');
      expect(result.error).toContain('503 High Load');
    });

    it('returns explicit error when structured output parsing fails', async () => {
      vi.mocked(generateStructuredWithGemini).mockResolvedValueOnce({
        data: null as any,
        model: 'gemini-3.5-flash-lite',
        rawJson: '{}',
      });

      const result = await executeCompetitorAgent({
        competitor_name: 'Apex Acrylics',
        sku: 'KRA-REC-0604',
      });

      expect(result.success).toBe(false);
      expect(result.execution_mode).toBe('error');
      expect(result.model_invoked).toBe(false);
      expect(result.is_simulated).toBe(false);
      expect(result.error).toContain('failed to return structured data');
    });
  });

  describe('4. API Route Integration (/api/agents/competitor-agent/run)', () => {
    it('returns 200 with live_ai execution metadata and validated output', async () => {
      const mockOutput = {
        competitor_name: 'Marketplace Vendor X',
        products_analyzed: [
          {
            product_name: 'Basic Acrylic Keychain',
            estimated_price: '₹79',
            thickness_spec: '1.5mm standard plastic',
          },
        ],
        pricing_gap_vs_kria:
          'Competitors charge ₹79 for 1.5mm snap-in keychains. KRIA TECH direct factory rate is ₹30/pc for 100 units with 360-degree rotating chrome swivel ring.',
        kria_competitive_advantages: [
          '2mm cast acrylic sandwich with scratch-resistant gloss seal.',
          'Heavy-duty 360-degree rotating chrome swivel ring.',
          'Factory direct wholesale rate of ₹30/pc at 100 MOQ.',
        ],
        opportunities: ['Bundle keychains as giveaways with bulk fridge magnet orders.'],
        reasoning_summary: 'Evaluated accessory hardware durability and bulk factory pricing.',
        sources: ['Public Marketplace Listings', 'KRIA Material Testing Specs'],
        verified_facts: ['KRA-KEY-CIR25 features 2mm cast acrylic and 360-degree chrome swivel ring.'],
        assumptions: ['Competitors use hollow snap-together plastic with split rings.'],
      };

      vi.mocked(generateStructuredWithGemini).mockResolvedValueOnce({
        data: mockOutput,
        model: 'gemini-3.5-flash-lite',
        rawJson: JSON.stringify(mockOutput),
      });

      const req = new NextRequest('http://localhost:3000/api/agents/competitor-agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competitor_name: 'Marketplace Vendor X',
          sku: 'KRA-KEY-CIR25',
          task_type: 'competitor_benchmark',
        }),
      });

      const res = await runAgent(req, { params: { agentId: 'competitor-agent' } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.execution_mode).toBe('live_ai');
      expect(json.model_invoked).toBe(true);
      expect(json.is_simulated).toBe(false);
      expect(json.output.competitor_name).toBe('Marketplace Vendor X');
      expect(json.saved_report_id).toBe('mock-report-uuid-phase2d');
      expect(json.approval_id).toBe('mock-approval-uuid-phase2d');
    });
  });
});
