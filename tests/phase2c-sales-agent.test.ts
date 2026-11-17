import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeSalesLeadAgent } from '@/lib/services/sales-lead-agent';
import { SalesAgentOutputSchema } from '@/lib/agents/schemas';

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
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'mock-lead-uuid-phase2c' }, error: null }),
        }),
      }),
      update: (fields: any) => ({
        eq: (col: string, val: any) => Promise.resolve({ data: null, error: null }),
      }),
    }),
  }),
}));

// Mock Approval request service
vi.mock('@/lib/services/approvals', () => ({
  createApprovalRequest: vi.fn().mockResolvedValue({
    success: true,
    data: {
      id: 'mock-quote-approval-uuid-999',
      status: 'pending',
      action_type: 'customer_message',
    },
  }),
}));

import { generateStructuredWithGemini } from '@/lib/ai/gemini-client';
import { createApprovalRequest } from '@/lib/services/approvals';

describe('Phase 2C — Real Sales & CRM Lead AI Agent & Pricing Engine Integration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.GEMINI_API_KEY = 'valid-test-gemini-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1. Wholesale Lead Qualification & Mathematical Pricing Accuracy', () => {
    it('accurately scores bulk wholesale lead, applies exact tier pricing, syncs to CRM, and routes to approval gate', async () => {
      // 500 pcs of KRA-REC-0604: Tier rate is ₹79/pc, total is ₹39,500
      const mockSalesOutput = {
        score: 95,
        priority: 'high' as const,
        intent_tier: 'Ready to Buy' as const,
        suggested_action: 'Dispatch physical sample box and follow up via WhatsApp with confirmed 500 Pcs Tier quotation.',
        suggested_follow_up_hours: 12,
        draft_response_message:
          'Hello Rajesh! Thank you for inquiring about 500 units of Classic Rectangle Acrylic Photo Magnet (6×4"). Our Hyderabad factory wholesale rate for 500 Pcs Tier is ₹79/pc (Total: ₹39,500). Crafted from 2mm monolithic cell-cast acrylic with grade N35 flush neodymium magnets. Shall we proceed with sample box dispatch?',
        recommended_quote: {
          sku: 'KRA-REC-0604',
          quantity: 500,
          unit_price_inr: 79,
          total_inr: 39500,
          tier_applied: '500 Pcs Tier',
        },
        reasoning_summary:
          'High purchase intent for large corporate gifting batch. Well above 50 pcs factory MOQ with clear budget alignment.',
        sources: ['KRIA TECH Hyderabad Wholesale Matrix 2026'],
        verified_facts: [
          'Material: 2mm monolithic cell-cast acrylic with 93% optical clarity',
          'Applied unit price: ₹79 (500 Pcs Tier)',
          'Factory bulk MOQ: 50 units',
        ],
        assumptions: ['Payment terms: 100% advance before laser cutting dispatch.'],
      };

      vi.mocked(generateStructuredWithGemini).mockResolvedValueOnce({
        data: mockSalesOutput,
        model: 'gemini-3.5-flash-lite',
        rawJson: JSON.stringify(mockSalesOutput),
      });

      const result = await executeSalesLeadAgent({
        lead_name: 'Rajesh Sharma',
        business_name: 'Sharma Studios Hyderabad',
        sku: 'KRA-REC-0604',
        quantity: 500,
        budget: 40000,
        location: 'Hyderabad, Telangana',
        topic_or_prompt: 'Need 500 pcs for upcoming wedding season studio giveaways by next month',
      });

      // Honest execution metadata assertions
      expect(result.success).toBe(true);
      expect(result.execution_mode).toBe('live_ai');
      expect(result.model_invoked).toBe(true);
      expect(result.is_simulated).toBe(false);
      expect(result.model_name).toBe('gemini-3.5-flash-lite');

      // Mathematical pricing assertions
      expect(result.quote).toBeDefined();
      expect(result.quote?.quantity).toBe(500);
      expect(result.quote?.effective_unit_price).toBe(79);
      expect(result.quote?.final_total_inr).toBe(39500);
      expect(result.quote?.tier_applied).toBe('500 Pcs Tier');
      expect(result.quote?.is_below_moq).toBe(false);

      // Zod schema assertions
      expect(result.output).toBeDefined();
      const parsed = SalesAgentOutputSchema.parse(result.output);
      expect(parsed.score).toBe(95);
      expect(parsed.recommended_quote?.total_inr).toBe(39500);

      // CRM persistence assertions
      expect(result.saved_lead_id).toBe('mock-lead-uuid-phase2c');

      // Human approval gate assertions
      expect(result.approval_id).toBe('mock-quote-approval-uuid-999');
      expect(createApprovalRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          action_type: 'customer_message',
          agent_id: 'sales-agent',
          risk_level: 'medium',
        })
      );
    });
  });

  describe('2. Below MOQ Handling & Starter Kit Guidance', () => {
    it('flags order below bulk MOQ, applies storefront base pricing, and suggests Demo Starter Kit', async () => {
      // 15 pcs of KRA-REC-0604: MOQ is 50, storefront base price is ₹113
      const mockBelowMoqOutput = {
        score: 65,
        priority: 'medium' as const,
        intent_tier: 'Retail Curious' as const,
        suggested_action:
          'Inquiry is below bulk factory MOQ (50 pcs). Suggest KRIA Demo Starter Kit (24 pcs for ₹999) or storefront base pricing.',
        suggested_follow_up_hours: 48,
        draft_response_message:
          'Hello Anita! For orders under 50 units of Classic Rectangle (6x4"), our storefront base price is ₹113/pc. For wholesale pricing, our MOQ starts at 50 units, or you can order our KRIA Demo Starter Kit (24 pcs across 4 shapes for just ₹999 all-inclusive).',
        recommended_quote: {
          sku: 'KRA-REC-0604',
          quantity: 15,
          unit_price_inr: 113,
          total_inr: 1695,
          tier_applied: 'Storefront Base / Below MOQ',
        },
        reasoning_summary:
          'Order quantity 15 units is below bulk factory MOQ (50 pcs). Routed to starter kit upsell.',
        sources: ['KRIA TECH Storefront Catalog'],
        verified_facts: ['Storefront base price is ₹113/pc; Bulk MOQ is 50 units.'],
        assumptions: ['Customer may be interested in evaluation sample pack.'],
      };

      vi.mocked(generateStructuredWithGemini).mockResolvedValueOnce({
        data: mockBelowMoqOutput,
        model: 'gemini-3.5-flash-lite',
        rawJson: JSON.stringify(mockBelowMoqOutput),
      });

      const result = await executeSalesLeadAgent({
        lead_name: 'Anita Roy',
        sku: 'KRA-REC-0604',
        quantity: 15,
        topic_or_prompt: 'Just want 15 pieces for my family gathering',
      });

      expect(result.success).toBe(true);
      expect(result.quote?.is_below_moq).toBe(true);
      expect(result.quote?.effective_unit_price).toBe(113);
      expect(result.quote?.final_total_inr).toBe(1695);
      expect(result.output?.intent_tier).toBe('Retail Curious');
      expect(result.output?.draft_response_message).toContain('Demo Starter Kit');
    });
  });

  describe('3. KRIA VIP Reseller Subscription Discount Integration', () => {
    it('applies extra ₹2/pc discount for subscribers on bulk wholesale tiers', async () => {
      // 500 pcs with subscription: ₹79 - ₹2 = ₹77/pc, total = ₹38,500
      const mockSubOutput = {
        score: 96,
        priority: 'high' as const,
        intent_tier: 'Ready to Buy' as const,
        suggested_action: 'Send proforma invoice with VIP Subscriber discount applied.',
        suggested_follow_up_hours: 12,
        draft_response_message:
          'Hello! As an active KRIA VIP Reseller, your extra ₹2/pc discount has been applied: ₹77/pc for 500 units (Total: ₹38,500).',
        recommended_quote: {
          sku: 'KRA-REC-0604',
          quantity: 500,
          unit_price_inr: 77,
          total_inr: 38500,
          tier_applied: '500 Pcs Tier',
        },
        reasoning_summary: 'VIP Subscriber wholesale order with confirmed ₹2 discount.',
        sources: ['KRIA Subscription Program Rules'],
        verified_facts: ['VIP discount of ₹2/pc applied to 500 pcs tier.'],
        assumptions: ['Active 3-month VIP membership verified.'],
      };

      vi.mocked(generateStructuredWithGemini).mockResolvedValueOnce({
        data: mockSubOutput,
        model: 'gemini-3.5-flash-lite',
        rawJson: JSON.stringify(mockSubOutput),
      });

      const result = await executeSalesLeadAgent({
        sku: 'KRA-REC-0604',
        quantity: 500,
        has_subscription: true,
      });

      expect(result.success).toBe(true);
      expect(result.quote?.subscription_discount_per_unit).toBe(2);
      expect(result.quote?.effective_unit_price).toBe(77);
      expect(result.quote?.final_total_inr).toBe(38500);
      expect(result.output?.recommended_quote?.unit_price_inr).toBe(77);
    });
  });

  describe('4. Missing API Key Guardrail', () => {
    it('returns an explicit error and NEVER falls back to hardcoded fixtures when key is missing', async () => {
      delete process.env.GEMINI_API_KEY;

      vi.mocked(generateStructuredWithGemini).mockRejectedValueOnce(
        new Error('GEMINI_API_KEY is missing or unconfigured. Server-side AI model invocation cannot proceed.')
      );

      const result = await executeSalesLeadAgent({
        sku: 'KRA-SQU-0303',
        quantity: 100,
      });

      expect(result.success).toBe(false);
      expect(result.execution_mode).toBe('error');
      expect(result.model_invoked).toBe(false);
      expect(result.error).toContain('GEMINI_API_KEY is missing');
    });
  });

  describe('5. Provider Failure (500 / 503)', () => {
    it('explicitly reports provider failure and never masks errors with fake responses', async () => {
      vi.mocked(generateStructuredWithGemini).mockRejectedValueOnce(
        new Error('Gemini AI invocation failed (gemini-3.5-flash-lite): 503 Service Unavailable')
      );

      const result = await executeSalesLeadAgent({
        sku: 'KRA-SQU-0303',
        quantity: 100,
      });

      expect(result.success).toBe(false);
      expect(result.execution_mode).toBe('error');
      expect(result.model_invoked).toBe(false);
      expect(result.error).toContain('503 Service Unavailable');
    });
  });

  describe('6. Forbidden Claims Rejection (Guardrails)', () => {
    it('rejects execution when lead inquiry contains forbidden claims like "never scratches" or "bulletproof"', async () => {
      const result = await executeSalesLeadAgent({
        sku: 'KRA-SQU-0303',
        quantity: 100,
        topic_or_prompt: 'Client wants guarantee that magnet never scratches car metal paint',
      });

      expect(result.success).toBe(false);
      expect(result.execution_mode).toBe('error');
      expect(result.error).toContain('never scratches');
      expect(result.model_invoked).toBe(false);
      expect(generateStructuredWithGemini).not.toHaveBeenCalled();
    });
  });

  describe('7. Existing Lead Record Update Sync', () => {
    it('updates existing lead in CRM when lead_id is provided rather than creating duplicate', async () => {
      const mockOutput = {
        score: 85,
        priority: 'high' as const,
        intent_tier: 'Bulk Evaluator' as const,
        suggested_action: 'Follow up on WhatsApp with 100 pcs tier pricing.',
        suggested_follow_up_hours: 24,
        draft_response_message: 'Hello! Our wholesale quote for 100 units is ₹49/pc.',
        recommended_quote: {
          sku: 'KRA-SQU-0303',
          quantity: 100,
          unit_price_inr: 49,
          total_inr: 4900,
          tier_applied: '100 Pcs Tier',
        },
        reasoning_summary: 'Existing lead evaluation.',
        sources: ['KRIA Matrix'],
        verified_facts: ['Tier price is ₹49/pc'],
        assumptions: [],
      };

      vi.mocked(generateStructuredWithGemini).mockResolvedValueOnce({
        data: mockOutput,
        model: 'gemini-3.5-flash-lite',
        rawJson: JSON.stringify(mockOutput),
      });

      const result = await executeSalesLeadAgent({
        lead_id: 'existing-lead-uuid-444',
        sku: 'KRA-SQU-0303',
        quantity: 100,
      });

      expect(result.success).toBe(true);
      expect(result.saved_lead_id).toBe('existing-lead-uuid-444');
    });
  });
});
