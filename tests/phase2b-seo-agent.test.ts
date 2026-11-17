import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeSEOStrategyAgent } from '@/lib/services/seo-strategy';
import { SEOAgentOutputSchema } from '@/lib/agents/schemas';

// Mock the Gemini client wrapper
vi.mock('@/lib/ai/gemini-client', () => ({
  getGeminiClient: vi.fn(),
  generateStructuredWithGemini: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    from: (table: string) => ({
      insert: (rows: any[]) => ({
        select: () => Promise.resolve({
          data: rows.map((r, i) => ({ id: `mock-seo-kw-uuid-${i + 1}` })),
          error: null,
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
      id: 'mock-seo-approval-uuid-789',
      status: 'pending',
      action_type: 'website_change',
    },
  }),
}));

import { generateStructuredWithGemini } from '@/lib/ai/gemini-client';
import { createApprovalRequest } from '@/lib/services/approvals';

describe('Phase 2B — Real SEO Strategy AI Agent & Gemini Integration', () => {
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
    it('successfully invokes Gemini, validates schema, persists to Supabase seo_keywords, and returns live_ai metadata', async () => {
      const mockSeoOutput = {
        target_cluster: 'Magnetic Fridge Photo Frames',
        recommended_keywords: [
          {
            keyword: 'custom acrylic fridge magnet bulk',
            volume_estimate: 850,
            intent: 'commercial' as const,
            target_page: '/products/magnetic-acrylic-frames',
            priority: 'high' as const,
          },
          {
            keyword: 'buy square acrylic photo magnet 3x3',
            volume_estimate: 450,
            intent: 'transactional' as const,
            target_page: '/products/3x3-acrylic-magnet',
            priority: 'high' as const,
          },
          {
            keyword: 'optical clarity acrylic photo keepsake hyderabad',
            volume_estimate: 200,
            intent: 'informational' as const,
            target_page: '/manufacturing',
            priority: 'medium' as const,
          },
        ],
        on_page_recommendations: [
          'Add FAQ Schema answering magnet surface protection for N35 countersunk flush magnets.',
          'Optimize H1 to target "Monolithic Cast Acrylic Photo Magnets (Direct Factory Wholesale)".',
        ],
        content_gap_analysis:
          'Competitors focus on flimsy promotional vinyl magnets; KRIA TECH has massive opportunity to rank for museum-grade 2mm monolithic cast acrylic return gifts.',
        reasoning_summary:
          'Formulated B2B and retail search strategy emphasizing 93% clarity and flush countersunk N35 magnets.',
        sources: ['KRIA TECH Manufacturing Catalog Matrix'],
        verified_facts: [
          '2mm monolithic cell-cast acrylic',
          'Grade N35 flush countersunk neodymium magnet',
          '93% optical clarity',
        ],
        assumptions: ['Retail gifters seek luxury scratch-resistant acrylic over cheap plastic fridge magnets.'],
      };

      vi.mocked(generateStructuredWithGemini).mockResolvedValueOnce({
        data: mockSeoOutput,
        model: 'gemini-3.5-flash-lite',
        rawJson: JSON.stringify(mockSeoOutput),
      });

      const result = await executeSEOStrategyAgent({
        target_cluster: 'Magnetic Fridge Photo Frames',
        sku: 'KRA-SQU-0303',
        topic_or_prompt: 'Target wholesale wedding return gifts and interior design enthusiasts',
      });

      // Honest execution metadata assertions
      expect(result.success).toBe(true);
      expect(result.execution_mode).toBe('live_ai');
      expect(result.model_invoked).toBe(true);
      expect(result.is_simulated).toBe(false);
      expect(result.model_name).toBe('gemini-3.5-flash-lite');

      // Zod schema assertions
      expect(result.output).toBeDefined();
      const parsed = SEOAgentOutputSchema.parse(result.output);
      expect(parsed.target_cluster).toBe('Magnetic Fridge Photo Frames');
      expect(parsed.recommended_keywords.length).toBe(3);
      expect(parsed.on_page_recommendations.length).toBeGreaterThanOrEqual(1);

      // Persistence assertions (Supabase seo_keywords table)
      expect(result.saved_keyword_ids).toBeDefined();
      expect(result.saved_keyword_ids?.length).toBe(3);

      // Human approval queue assertions
      expect(result.approval_id).toBe('mock-seo-approval-uuid-789');
      expect(createApprovalRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          action_type: 'website_change',
          agent_id: 'seo-agent',
          risk_level: 'low',
        })
      );
    });
  });

  describe('2. Missing API Key Guardrail', () => {
    it('returns an explicit error and NEVER falls back to hardcoded fixtures when key is missing', async () => {
      delete process.env.GEMINI_API_KEY;

      vi.mocked(generateStructuredWithGemini).mockRejectedValueOnce(
        new Error('GEMINI_API_KEY is missing or unconfigured. Server-side AI model invocation cannot proceed.')
      );

      const result = await executeSEOStrategyAgent({
        target_cluster: 'Acrylic Blocks',
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
    it('explicitly reports provider failure and never masks errors with simulated templates', async () => {
      vi.mocked(generateStructuredWithGemini).mockRejectedValueOnce(
        new Error('Gemini AI invocation failed (gemini-3.5-flash-lite): 503 Service Unavailable')
      );

      const result = await executeSEOStrategyAgent({
        target_cluster: 'Acrylic Keychains',
      });

      expect(result.success).toBe(false);
      expect(result.execution_mode).toBe('error');
      expect(result.model_invoked).toBe(false);
      expect(result.error).toContain('503 Service Unavailable');
    });
  });

  describe('4. Input Validation & Schema Failures', () => {
    it('catches and reports schema validation errors if model returns malformed data', async () => {
      vi.mocked(generateStructuredWithGemini).mockRejectedValueOnce(
        new Error('Gemini response failed schema validation: recommended_keywords: Required')
      );

      const result = await executeSEOStrategyAgent({
        target_cluster: 'Acrylic Desk Blocks',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('failed schema validation');
      expect(result.model_invoked).toBe(false);
    });
  });

  describe('5. Unsupported Claims Rejection (Guardrails)', () => {
    it('rejects execution immediately when user prompts contain forbidden claims like "never scratches" or "bulletproof"', async () => {
      const result = await executeContentClaimRejection();
      expect(result.success).toBe(false);
      expect(result.execution_mode).toBe('error');
      expect(result.error).toContain('never scratches');
      expect(result.model_invoked).toBe(false);
      expect(generateStructuredWithGemini).not.toHaveBeenCalled();
    });

    async function executeContentClaimRejection() {
      return executeSEOStrategyAgent({
        target_cluster: 'Acrylic Magnets',
        topic_or_prompt: 'Target keywords highlighting that our acrylic frames never scratches any surface',
      });
    }
  });

  describe('6. Grounding and Conflicting Product Data', () => {
    it('grounds MAPF products on factory standard specifications (92% transmission, N52 magnets)', async () => {
      const mockMapfOutput = {
        target_cluster: 'Tabletop Acrylic Photo Blocks',
        recommended_keywords: [
          {
            keyword: 'heavy acrylic photo block 20mm',
            volume_estimate: 320,
            intent: 'commercial' as const,
            target_page: '/products/mapf-0406',
            priority: 'high' as const,
          },
        ],
        on_page_recommendations: ['Highlight 20mm dual block thickness and diamond buffed edge.'],
        content_gap_analysis: 'High intent for desktop displays.',
        reasoning_summary: 'Targeting luxury executive desk decor.',
        sources: ['MAPF Standards'],
        verified_facts: [
          'Grade-A imported virgin cast acrylic (92% light transmission)',
          'N52 nickel-plated neodymium magnets',
        ],
        assumptions: ['High demand for corporate gifting.'],
      };

      vi.mocked(generateStructuredWithGemini).mockResolvedValueOnce({
        data: mockMapfOutput,
        model: 'gemini-3.5-flash-lite',
        rawJson: JSON.stringify(mockMapfOutput),
      });

      const result = await executeSEOStrategyAgent({
        sku: 'MAPF-0406-CL',
        topic_or_prompt: 'SEO strategy for 4x6 tabletop frames',
      });

      expect(result.success).toBe(true);
      expect(result.output?.verified_facts[0]).toContain('92% light transmission');
      expect(result.output?.verified_facts[1]).toContain('N52');
    });

    it('detects category conflict when user prompt requests fridge magnet for MAPF desk block', async () => {
      const mockOutput = {
        target_cluster: 'Tabletop Acrylic Blocks',
        recommended_keywords: [],
        on_page_recommendations: ['Emphasize tabletop display.'],
        content_gap_analysis: 'Gap in tabletop keywords.',
        reasoning_summary: 'Corrected fridge magnet to tabletop desk block.',
        sources: ['MAPF Standards'],
        verified_facts: ['Free-standing tabletop acrylic block (20-30mm thick)'],
        assumptions: [],
      };

      vi.mocked(generateStructuredWithGemini).mockResolvedValueOnce({
        data: mockOutput,
        model: 'gemini-3.5-flash-lite',
        rawJson: JSON.stringify(mockOutput),
      });

      const result = await executeSEOStrategyAgent({
        sku: 'MAPF-0406-CL',
        topic_or_prompt: 'Search keywords for fridge magnet attachment',
      });

      expect(result.success).toBe(true);
      expect(result.conflicts_detected).toBeDefined();
      expect(result.conflicts_detected!.some((c) => c.field === 'product_category')).toBe(true);
    });
  });
});
