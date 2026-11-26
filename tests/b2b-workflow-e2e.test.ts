import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Gemini AI so tests run deterministically without live API calls
vi.mock('@/lib/ai/gemini-client', () => ({
  getGeminiClient: vi.fn(),
  generateStructuredWithGemini: vi.fn().mockResolvedValue({
    data: {
      score: 90,
      priority: 'high',
      intent_tier: 'Ready to Buy',
      suggested_action: 'Send factory bulk quotation on WhatsApp',
      suggested_follow_up_hours: 24,
      draft_response_message:
        'Hello! For 100 pcs of Classic Rectangle (6x4"), your KRIA Tech Hyderabad wholesale rate is ₹89/pc (₹8,900 total).',
      recommended_quote: {
        sku: 'KRA-REC-0604',
        quantity: 100,
        unit_price_inr: 89,
        total_inr: 8900,
        tier_applied: '100 Pcs Tier',
      },
      reasoning_summary: 'Qualified B2B retailer above 50 pcs MOQ.',
      sources: ['KRIA Tech Wholesale Matrix'],
      verified_facts: ['MOQ 50 pcs', '2mm+2mm monolithic cell-cast acrylic'],
      assumptions: [],
    },
    model: 'gemini-3.5-flash-lite',
    rawJson: '{}',
  }),
}));

// Mock Supabase server client so tests never perform real DNS/HTTP calls to placeholder.supabase.co
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    from: (table: string) => ({
      insert: () => ({
        select: () => ({
          single: () =>
            Promise.resolve({ data: { id: `mock-${table}-uuid-e2e` }, error: null }),
        }),
      }),
      update: () => ({
        eq: () => Promise.resolve({ data: null, error: null }),
      }),
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          single: () => Promise.resolve({ data: null, error: null }),
        }),
        single: () => Promise.resolve({ data: null, error: null }),
      }),
    }),
  }),
}));

import {
  runB2BBulkOrderWorkflow,
  advanceWorkflow,
  DEMO_WORKFLOW_RUNS,
} from '@/lib/workflows/b2b-bulk-order-workflow';
import { executeSalesLeadAgent } from '@/lib/services/sales-lead-agent';
import {
  recordOrder,
  getOrdersByLead,
  getTotalRevenue,
  updateOrderStatus,
  DEMO_ORDERS,
} from '@/lib/services/order-tracker';
import {
  createFollowUp,
  getDueFollowUps,
  getOverdueFollowUps,
  DEMO_FOLLOW_UPS,
} from '@/lib/services/follow-up-scheduler';
import { DEMO_APPROVALS } from '@/lib/demo-data';
import { POST as inboundLeadWebhookPOST } from '@/app/api/webhooks/leads/route';
import { NextRequest } from 'next/server';

describe('End-to-End 8-Stage B2B Bulk Sales Workflow', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co';
    process.env.LIVE_PRODUCTION_DISPATCH = 'false';
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    DEMO_WORKFLOW_RUNS.length = 0;
    DEMO_ORDERS.length = 0;
    DEMO_FOLLOW_UPS.length = 0;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejects unknown SKU and missing quantity without silent fallback in sales agent', async () => {
    const missingSku = await executeSalesLeadAgent({
      lead_name: 'Test Buyer',
      quantity: 50,
    });
    expect(missingSku.success).toBe(false);
    expect(missingSku.error).toContain('Explicit product SKU is required');

    const missingQty = await executeSalesLeadAgent({
      lead_name: 'Test Buyer',
      sku: 'KRA-REC-0604',
    });
    expect(missingQty.success).toBe(false);
    expect(missingQty.error).toContain('Explicit positive quantity is required');

    const unknownSku = await executeSalesLeadAgent({
      lead_name: 'Test Buyer',
      sku: 'NON-EXISTENT-SKU-999',
      quantity: 100,
    });
    expect(unknownSku.success).toBe(false);
    expect(unknownSku.error).toContain('NON-EXISTENT-SKU-999');
  });

  it('rejects missing SKU or quantity on inbound lead webhook with 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/webhooks/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Gift Mart',
        phone: '+919876543210',
      }),
    });

    const res = await inboundLeadWebhookPOST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('SKU is required');
  });

  it('runs complete 8-stage B2B workflow from research to order_confirmed and revenue tracking', async () => {
    // Stage 1-3: Start workflow -> stops at awaiting_approval
    const startRes = await runB2BBulkOrderWorkflow({
      goal: 'Get bulk magnetic acrylic frame order from Deccan Gift Emporium',
      lead: {
        name: 'Suresh Rao',
        business_name: 'Deccan Gift Emporium',
        phone: '+919988776655',
        email: 'suresh@deccangifts.in',
        location: 'Hyderabad',
        sku: 'KRA-REC-0604',
        quantity: 100,
      },
      actor_email: 'kavindraraj1703@gmail.com',
    });

    expect(startRes.success).toBe(true);
    expect(startRes.current_stage).toBe('awaiting_approval');
    expect(startRes.execution_state).toBe('awaiting_approval');
    expect(startRes.workflow_run_id).toBeDefined();
    expect(startRes.approval_id).toBeDefined();

    // Verify approval metadata stores real recipient contact, not generic channel text
    const approval = DEMO_APPROVALS.find((a) => a.id === startRes.approval_id);
    expect(approval).toBeDefined();
    expect(approval?.destination).toBe('whatsapp:+919988776655');
    expect(approval?.proposed_content?.phone_number).toBe('+919988776655');
    expect(approval?.proposed_content?.email).toBe('suresh@deccangifts.in');

    // Stage 4 blocked while approval is still pending
    const blockedAdvance = await advanceWorkflow(
      startRes.workflow_run_id!,
      'awaiting_reply'
    );
    expect(blockedAdvance.success).toBe(false);
    expect(blockedAdvance.error).toContain('SECURITY GATE REJECTION');

    // Owner approves the action
    approval!.status = 'approved';

    // Stage 4: Dispatches in simulated mode -> awaiting_reply
    const dispatchRes = await advanceWorkflow(
      startRes.workflow_run_id!,
      'awaiting_reply',
      { actor_email: 'admin@kriatech.in', actor_role: 'owner' }
    );
    expect(dispatchRes.success).toBe(true);
    expect(dispatchRes.current_stage).toBe('awaiting_reply');
    expect(dispatchRes.execution_state).toBe('simulated');

    // Stage 5: Inbound reply webhook advances workflow to qualified
    const replyReq = new NextRequest('http://localhost:3000/api/webhooks/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        is_reply: true,
        phone: '+919988776655',
        message: 'Interested in 100 pcs of KRA-REC-0604, please send formal quote.',
        sku: 'KRA-REC-0604',
        quantity: 100,
      }),
    });
    const replyRes = await inboundLeadWebhookPOST(replyReq);
    expect(replyRes.status).toBe(200);
    const replyBody = await replyRes.json();
    expect(replyBody.reply_tracked).toBe(true);
    expect(replyBody.data.workflow_stage).toBe('qualified');
    expect(replyBody.data.execution_state).toBe('customer_responded');

    // Stage 6: Reject unknown SKU in quoted stage
    const badQuote = await advanceWorkflow(startRes.workflow_run_id!, 'quoted', {
      sku: 'BAD-SKU-XYZ',
      quantity: 100,
    });
    expect(badQuote.success).toBe(false);
    expect(badQuote.error).toContain('BAD-SKU-XYZ');

    // Stage 6: Valid SKU + MOQ produces verified quote
    const quoteRes = await advanceWorkflow(startRes.workflow_run_id!, 'quoted', {
      sku: 'KRA-REC-0604',
      quantity: 100,
    });
    expect(quoteRes.success).toBe(true);
    expect(quoteRes.current_stage).toBe('quoted');
    expect(quoteRes.execution_state).toBe('awaiting_approval');

    // Stage 7: Follow-up preparation
    const followUpRes = await advanceWorkflow(startRes.workflow_run_id!, 'follow_up');
    expect(followUpRes.success).toBe(true);
    expect(followUpRes.current_stage).toBe('follow_up');

    // Stage 8: Order confirmed & revenue tracked
    const orderRes = await advanceWorkflow(startRes.workflow_run_id!, 'order_confirmed', {
      sku: 'KRA-REC-0604',
      quantity: 100,
    });
    expect(orderRes.success).toBe(true);
    expect(orderRes.current_stage).toBe('order_confirmed');

    const revenue = await getTotalRevenue();
    expect(revenue.confirmed_orders).toBe(1);
    expect(revenue.total_inr).toBe(8500);

    // Final completion
    const completedRes = await advanceWorkflow(startRes.workflow_run_id!, 'completed');
    expect(completedRes.success).toBe(true);
    expect(completedRes.current_stage).toBe('completed');
  });

  it('tracks orders and durable due/overdue follow-ups', async () => {
    const createdOrder = await recordOrder({
      lead_id: 'lead-track-1',
      sku: 'KRA-SQU-0202',
      product_name: 'Minimal Square (2x2")',
      quantity: 100,
      unit_price_inr: 37,
      total_inr: 3700,
      status: 'confirmed',
    });
    expect(createdOrder.success).toBe(true);
    const byLead = await getOrdersByLead('lead-track-1');
    expect(byLead.length).toBe(1);
    await updateOrderStatus(createdOrder.data!.id, 'dispatched');
    const rev = await getTotalRevenue();
    expect(rev.total_inr).toBe(3700);

    // Create overdue follow-up (-3 hours)
    const fu = await createFollowUp({
      lead_id: 'lead-track-1',
      follow_up_hours: -3,
      action_type: 'call_buyer',
    });
    expect(fu.success).toBe(true);

    const due = await getDueFollowUps();
    const overdue = await getOverdueFollowUps();
    expect(due.length).toBeGreaterThanOrEqual(1);
    expect(overdue.length).toBeGreaterThanOrEqual(1);
  });
});
