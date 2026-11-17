import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeBusinessAnalystAgent } from '@/lib/services/business-analyst';
import { getComprehensiveUnitEconomics } from '@/lib/services/unit-economics-engine';
import { BusinessAnalystOutputSchema } from '@/lib/agents/schemas';
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
          single: () => Promise.resolve({ data: { id: 'mock-analyst-task-uuid' }, error: null }),
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
      id: 'mock-approval-uuid-phase2f',
      status: 'pending',
      action_type: 'automation_action',
    },
  }),
}));

import { generateStructuredWithGemini } from '@/lib/ai/gemini-client';
import { createApprovalRequest } from '@/lib/services/approvals';
import { POST as runAgent } from '@/app/api/agents/[agentId]/run/route';

describe('Phase 2F — Real Operations & Growth Analyst Agent & Unit Economics Engine', () => {
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

  describe('1. Authoritative Unit Economics & Margin Modeling Engine', () => {
    it('computes exact product COGS, gross margins, and sheet nesting yields', () => {
      const model = getComprehensiveUnitEconomics();

      expect(model.products.length).toBeGreaterThanOrEqual(6);
      expect(model.average_gross_margin_pct).toBeGreaterThan(35);
      expect(model.average_gross_margin_pct).toBeLessThan(60);

      // 6x4 Frame (KRA-REC-0604)
      const frame6x4 = model.products.find((p) => p.sku === 'KRA-REC-0604')!;
      expect(frame6x4).toBeDefined();
      expect(frame6x4.retail_price_inr).toBe(179);
      expect(frame6x4.wholesale_500_inr).toBe(79);
      expect(frame6x4.estimated_cogs_inr).toBe(47);
      expect(frame6x4.wholesale_500_margin_pct).toBeCloseTo(40.5, 1);
      expect(frame6x4.units_per_master_sheet).toBe(96);

      // 4x6 Tabletop Block (MAPF-0406-CL)
      const block = model.products.find((p) => p.sku === 'MAPF-0406-CL')!;
      expect(block).toBeDefined();
      expect(block.retail_price_inr).toBe(549);
      expect(block.wholesale_100_inr).toBe(320);
      expect(block.estimated_cogs_inr).toBe(175);
      expect(block.retail_margin_pct).toBeCloseTo(68.1, 1);

      // Inventory Velocity SLA
      expect(model.inventory_velocity.daily_factory_capacity_units).toBe(1200);
      expect(model.inventory_velocity.standard_dispatch_sla_days).toBe(2);
      expect(model.inventory_velocity.vip_priority_dispatch_sla_days).toBe(1);
      expect(model.break_even_vip_units).toBe(250);
    });
  });

  describe('2. Real Gemini AI Operations & Growth Synthesis', () => {
    it('synthesizes pipeline metrics, unit economics, and bottlenecks into an executive brief', async () => {
      const mockOutput = {
        executive_summary:
          'Strong wholesale growth trajectory across Southern India with high demand for 6x4 photo magnets. Factory operating at 65% utilization of 1,200 daily units capacity. Wholesale 500-tier gross margins remain robust at 40.5%.',
        pipeline_health:
          'Healthy pipeline distribution with high concentration in Qualified and Quotation Sent stages. Win rate is solid, but follow-up turnaround between quotation and negotiation is the primary conversion lever.',
        top_demanded_products: [
          'Classic Rectangle Acrylic Photo Magnet (6×4") - SKU KRA-REC-0604',
          'Clear Magnetic Acrylic Tabletop Block (4×6") - SKU MAPF-0406-CL',
          'KRIA Tech Demo Starter Kit (24 Pieces Total) - SKU KRA-KIT-DEMO24',
        ],
        identified_bottlenecks: [
          '48-hour follow-up delay between Quotation Sent and Negotiation stages.',
          'Raw acrylic sheet reorder lead times require maintaining 15 master sheets safety stock.',
        ],
        recommended_growth_actions: [
          'Deploy automated 24-hour WhatsApp follow-up reminders in CRM for quotes above ₹25,000.',
          'Cross-sell VIP Reseller Subscription to all leads inquiring for >= 250 units to lock in repeat volume.',
          'Trigger batch laser cutting runs whenever 6x4" frame queue reaches 96 units to maximize master sheet yield.',
        ],
        unit_economics: {
          average_gross_margin_pct: 44.3,
          top_margin_sku: 'KRA-KEY-CIR25',
          break_even_units_per_batch: 96,
          inventory_turnover_days: 14,
        },
        reasoning_summary:
          'Synthesized active CRM pipeline distributions and authoritative factory unit economics to identify conversion velocity bottlenecks and capacity optimizations.',
        sources: [
          'KRIA AI CRM Database',
          'KRIA TECH Hyderabad Factory Unit Economics Registry 2026',
        ],
        verified_facts: [
          'Daily factory laser cutting and polishing capacity is 1,200 units.',
          'KRA-REC-0604 yields 96 units per 8x4ft master sheet with 40.5% wholesale 500 margin.',
        ],
        assumptions: [
          'Seasonal wedding studio demand will increase frame reorders by 30% in Q4.',
        ],
      };

      vi.mocked(generateStructuredWithGemini).mockResolvedValueOnce({
        data: mockOutput,
        model: 'gemini-3.5-flash-lite',
        rawJson: JSON.stringify(mockOutput),
      });

      const result = await executeBusinessAnalystAgent({
        focus_area: 'executive_brief',
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
      const parsed = BusinessAnalystOutputSchema.parse(result.output);
      expect(parsed.executive_summary).toContain('Strong wholesale growth');
      expect(parsed.top_demanded_products.length).toBeGreaterThanOrEqual(3);
      expect(parsed.identified_bottlenecks.length).toBeGreaterThanOrEqual(2);
      expect(parsed.recommended_growth_actions.length).toBeGreaterThanOrEqual(3);

      // Embedded Unit Economics
      expect(result.unit_economics).toBeDefined();
      expect(result.pipeline_summary).toBeDefined();

      // Routing to Approval Gate
      expect(result.approval_id).toBe('mock-approval-uuid-phase2f');
      expect(createApprovalRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          action_type: 'automation_action',
          agent_id: 'business-analyst',
          risk_level: 'medium',
        })
      );
    });
  });

  describe('3. Truth-in-Product Guardrails', () => {
    it('strictly rejects input containing forbidden absolute claims ("never scratches")', async () => {
      const result = await executeBusinessAnalystAgent({
        topic_or_prompt: 'Model growth projections assuming our acrylic never scratches and is completely scratch-proof',
      });

      expect(result.success).toBe(false);
      expect(result.execution_mode).toBe('error');
      expect(result.model_invoked).toBe(false);
      expect(result.is_simulated).toBe(false);
      expect(result.error).toContain("unsupported absolute claim ('never scratches' / 'scratch-proof')");
      expect(generateStructuredWithGemini).not.toHaveBeenCalled();
    });
  });

  describe('4. Provider Failure Handling (No Silent Fallback to Mock Data)', () => {
    it('returns explicit error when Gemini provider throws 503 load error', async () => {
      vi.mocked(generateStructuredWithGemini).mockRejectedValueOnce(
        new Error('Gemini API Service Unavailable (503 Overloaded)')
      );

      const result = await executeBusinessAnalystAgent({
        focus_area: 'margin_modeling',
      });

      expect(result.success).toBe(false);
      expect(result.execution_mode).toBe('error');
      expect(result.model_invoked).toBe(false);
      expect(result.is_simulated).toBe(false);
      expect(result.error).toContain('Gemini AI Business Analysis Failed');
      expect(result.error).toContain('503 Overloaded');
    });
  });

  describe('5. API Route Integration (/api/agents/business-analyst/run)', () => {
    it('executes live_ai by default with genuine execution metadata', async () => {
      const mockOutput = {
        executive_summary: 'Comprehensive Q4 Operations & Unit Economics Synthesis.',
        pipeline_health: 'Healthy pipeline flow across wedding photography studios.',
        top_demanded_products: ['6x4 Photo Magnet', '4x6 Tabletop Block'],
        identified_bottlenecks: ['Lead response time'],
        recommended_growth_actions: ['Automate WhatsApp follow-ups'],
        reasoning_summary: 'Synthesized CRM leads and wholesale margins.',
        sources: ['CRM Database'],
        verified_facts: ['Factory daily capacity is 1,200 units.'],
        assumptions: ['No machine downtime.'],
      };

      vi.mocked(generateStructuredWithGemini).mockResolvedValueOnce({
        data: mockOutput,
        model: 'gemini-3.5-flash-lite',
        rawJson: JSON.stringify(mockOutput),
      });

      const req = new NextRequest('http://localhost:3000/api/agents/business-analyst/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'synthesize_quarterly_metrics', task_type: 'executive_brief' }),
      });

      const res = await runAgent(req, { params: { agentId: 'business-analyst' } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.execution_mode).toBe('live_ai');
      expect(json.model_invoked).toBe(true);
      expect(json.is_simulated).toBe(false);
      expect(json.output.executive_summary).toBe('Comprehensive Q4 Operations & Unit Economics Synthesis.');
      expect(json.unit_economics).toBeDefined();
      expect(json.pipeline_summary).toBeDefined();
      expect(json.approval_id).toBe('mock-approval-uuid-phase2f');
    });

    it('returns hardcoded simulation response when explicitly requested via simulate: true', async () => {
      const req = new NextRequest('http://localhost:3000/api/agents/business-analyst/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'Run test simulation', simulate: true }),
      });

      const res = await runAgent(req, { params: { agentId: 'business-analyst' } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.execution_mode).toBe('hardcoded');
      expect(json.model_invoked).toBe(false);
      expect(json.is_simulated).toBe(true);
      expect(generateStructuredWithGemini).not.toHaveBeenCalled();
    });
  });
});
