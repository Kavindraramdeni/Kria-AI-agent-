import { describe, it, expect } from 'vitest';
import {
  SEOAgentOutputSchema,
  ContentAgentOutputSchema,
  SalesAgentOutputSchema,
  CompetitorAgentOutputSchema,
} from '@/lib/agents/schemas';

describe('AI Agent Output Zod Schemas & Guardrails', () => {
  it('validates a compliant SEO Agent output structure', () => {
    const validSeo = {
      target_cluster: 'Magnetic Acrylic Photo Frames',
      recommended_keywords: [
        {
          keyword: 'magnetic acrylic photo frame manufacturer',
          volume_estimate: 1200,
          intent: 'commercial' as const,
          target_page: '/products/magnetic-acrylic-frames',
          priority: 'high' as const,
        },
      ],
      on_page_recommendations: ['Add Schema.org markup', 'Highlight N52 magnets'],
      content_gap_analysis: 'High commercial opportunity for wholesale gift shop terms',
      reasoning_summary: 'Comprehensive analysis of search volume and buyer intent.',
      sources: ['KRIA Product Catalog'],
      verified_facts: ['Grade-A cast acrylic provides 92% light transmission.'],
      assumptions: ['Audience seeks luxury desk displays.'],
    };

    const parsed = SEOAgentOutputSchema.safeParse(validSeo);
    expect(parsed.success).toBe(true);
  });

  it('rejects SEO Agent output missing verified facts', () => {
    const invalidSeo = {
      target_cluster: 'Magnetic Frames',
      recommended_keywords: [],
      on_page_recommendations: [],
      content_gap_analysis: 'None',
      reasoning_summary: 'Brief reasoning',
      sources: [],
      verified_facts: [], // Violated: must have at least 1 verified fact
      assumptions: [],
    };

    const parsed = SEOAgentOutputSchema.safeParse(invalidSeo);
    expect(parsed.success).toBe(false);
  });

  it('validates compliant Sales Lead scoring output with quotation', () => {
    const validSales = {
      score: 95,
      priority: 'urgent' as const,
      intent_tier: 'Ready to Buy' as const,
      suggested_action: 'Dispatch physical sample via courier immediately.',
      suggested_follow_up_hours: 12,
      draft_response_message: 'Hi, we have reserved your 100 pcs sample batch.',
      recommended_quote: {
        sku: 'MAPF-0406-CL',
        quantity: 100,
        unit_price_inr: 320,
        total_inr: 32000,
        tier_applied: 'Wholesale Tier',
      },
      reasoning_summary: 'High volume lead ready for prompt purchase order.',
      sources: ['KRIA Price Sheet'],
      verified_facts: ['Wholesale MOQ for 4x6 is 25 pcs.'],
      assumptions: ['Payment via NEFT upon dispatch.'],
    };

    const parsed = SalesAgentOutputSchema.safeParse(validSales);
    expect(parsed.success).toBe(true);
  });

  it('validates compliant Content Studio generation', () => {
    const validContent = {
      title: 'Floating Memories: The KRIA Acrylic Advantage',
      content_type: 'product_description' as const,
      body: 'Dual block crystal clear acrylic frame with neodymium magnetic closure.',
      target_audience: 'Photographers',
      suggested_cta: 'Order sample frame',
      keywords_used: ['acrylic frame', 'photo block'],
      recommended_visuals: 'Side angle photo showing 20mm thickness.',
      reasoning_summary: 'Structured product copy matching manufacturer parameters.',
      sources: ['Internal Catalog'],
      verified_facts: ['Finished with diamond polishing.'],
      assumptions: ['Standard kraft packaging.'],
    };

    const parsed = ContentAgentOutputSchema.safeParse(validContent);
    expect(parsed.success).toBe(true);
  });
});
