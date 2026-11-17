import { describe, it, expect } from 'vitest';
import { executeApprovedAction } from '@/lib/services/execution-dispatcher';
import { createApprovalRequest, updateApprovalStatus } from '@/lib/services/approvals';

describe('Concurrency and Race Condition Security Hardening', () => {
  it('strictly allows ONLY 1 successful execution when 10 simultaneous concurrent requests hit the dispatcher', async () => {
    // Setup an approved request
    const createRes = await createApprovalRequest({
      action_type: 'campaign_launch',
      title: 'High-Value Wedding Hamper Ad Campaign',
      proposed_content: { ad_budget: 35000, channel: 'Instagram' },
      destination: 'Meta Ads API',
      risk_level: 'critical',
    });

    expect(createRes.success).toBe(true);
    const id = createRes.data!.id;

    // Approve the request
    const approveRes = await updateApprovalStatus(id, 'approved', 'owner@kriatech.com');
    expect(approveRes.success).toBe(true);

    // Fire 10 simultaneous concurrent execution attempts at the exact same time
    const concurrentAttempts = Array.from({ length: 10 }).map((_, i) =>
      executeApprovedAction(id, `actor_${i}@kriatech.com`)
    );

    const results = await Promise.all(concurrentAttempts);

    // Filter results
    const successes = results.filter((r) => r.success);
    const rejections = results.filter((r) => !r.success);

    // EXACTLY 1 request must succeed
    expect(successes.length).toBe(1);
    expect(successes[0].executed_at).toBeDefined();

    // The other 9 requests MUST be rejected (either ALREADY_EXECUTED or CONCURRENCY_LOCKED)
    expect(rejections.length).toBe(9);
    for (const rej of rejections) {
      expect(['ALREADY_EXECUTED', 'CONCURRENCY_LOCKED']).toContain(rej.error_code);
    }
  });

  it('rejects concurrent executions on unapproved or rejected requests with 0 successes', async () => {
    const createRes = await createApprovalRequest({
      action_type: 'website_change',
      title: 'Modify Homepage Hero Pricing',
      proposed_content: { discount: '50%' },
      destination: 'Live Production Website',
      risk_level: 'critical',
    });

    const id = createRes.data!.id;
    // Status is 'pending'

    // Fire 5 simultaneous concurrent execution attempts
    const concurrentAttempts = Array.from({ length: 5 }).map((_, i) =>
      executeApprovedAction(id, `actor_${i}@kriatech.com`)
    );

    const results = await Promise.all(concurrentAttempts);

    // 0 must succeed
    const successes = results.filter((r) => r.success);
    expect(successes.length).toBe(0);

    // All 5 must be rejected
    const rejections = results.filter((r) => !r.success);
    expect(rejections.length).toBe(5);
    for (const rej of rejections) {
      expect(['NOT_APPROVED', 'CONCURRENCY_LOCKED']).toContain(rej.error_code);
    }
  });
});
