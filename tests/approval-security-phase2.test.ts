import { describe, it, expect } from 'vitest';
import { executeApprovedAction } from '@/lib/services/execution-dispatcher';
import { createApprovalRequest, updateApprovalStatus } from '@/lib/services/approvals';

describe('Phase 2 — Approval Security, Idempotency & Critical Safeguards', () => {
  it('safely handles idempotent retries returning the identical receipt', async () => {
    const createRes = await createApprovalRequest({
      action_type: 'customer_message',
      title: 'Bulk WhatsApp Follow-Up to Photography Studio',
      proposed_content: { message: 'We have reserved your 50pcs sample frame batch' },
      destination: 'WhatsApp Outbox',
      risk_level: 'medium',
    });

    const id = createRes.data!.id;
    await updateApprovalStatus(id, 'approved', 'admin@kriatech.com');

    const idempotencyKey = 'idem-req-test-' + Date.now();

    // Call 1: First dispatch
    const res1 = await executeApprovedAction(id, 'admin@kriatech.com', idempotencyKey);
    expect(res1.success).toBe(true);
    expect(res1.executed_at).toBeDefined();

    // Call 2: Network retry with the exact same idempotency key
    const res2 = await executeApprovedAction(id, 'admin@kriatech.com', idempotencyKey);
    expect(res2.success).toBe(true);
    expect(res2.executed_at).toBe(res1.executed_at);
    expect(res2.idempotency_key).toBe(idempotencyKey);
  });

  it('strictly blocks staff from executing critical-risk actions', async () => {
    const createRes = await createApprovalRequest({
      action_type: 'campaign_launch',
      title: 'Major Diwali Acrylic Gifting Ad Spend (₹1,50,000)',
      proposed_content: { budget_inr: 150000, channel: 'Meta Ads' },
      destination: 'Meta Ads API',
      risk_level: 'critical', // CRITICAL RISK
    });

    const id = createRes.data!.id;
    await updateApprovalStatus(id, 'approved', 'admin@kriatech.com');

    // Attempt execution by staff
    const staffRes = await executeApprovedAction(id, 'staff@kriatech.com');
    expect(staffRes.success).toBe(false);
    expect(staffRes.error_code).toBe('CRITICAL_ACTION_RESTRICTED');
    expect(staffRes.error).toContain('require Owner authorization');

    // Execution by Owner succeeds
    const ownerRes = await executeApprovedAction(id, 'admin@kriatech.com');
    expect(ownerRes.success).toBe(true);
  });
});
