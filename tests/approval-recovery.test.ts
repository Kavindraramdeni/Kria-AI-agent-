import { describe, it, expect, vi } from 'vitest';
import {
  executeApprovedAction,
  retryFailedApproval,
  reconcileStaleApprovals,
} from '@/lib/services/execution-dispatcher';
import { createApprovalRequest, updateApprovalStatus } from '@/lib/services/approvals';

describe('P0 — Approval Execution State Machine & Recovery Logic', () => {
  it('transitions approval through processing -> succeeded state on successful execution', async () => {
    const createRes = await createApprovalRequest({
      action_type: 'content_publish',
      title: 'Valid Acrylic Frame Article Launch',
      risk_level: 'medium',
      destination: 'Storefront CMS',
    });
    const id = createRes.data!.id;
    await updateApprovalStatus(id, 'approved', 'admin@kriatech.com');

    const result = await executeApprovedAction(
      id,
      { email: 'admin@kriatech.com', role: 'owner' }
    );

    expect(result.success).toBe(true);
    expect(result.action_type).toBe('content_publish');
    expect(result.executed_at).toBeDefined();
  });

  it('marks approval as failed when dispatch encounters an error and preserves failure details', async () => {
    const originalEnv = process.env.LIVE_PRODUCTION_DISPATCH;
    process.env.LIVE_PRODUCTION_DISPATCH = 'true';

    try {
      const createRes = await createApprovalRequest({
        action_type: 'customer_message',
        title: 'Customer WhatsApp Live Outreach',
        risk_level: 'medium',
        destination: 'Customer WhatsApp Direct',
      });
      const id = createRes.data!.id;
      await updateApprovalStatus(id, 'approved', 'admin@kriatech.com');

      const result = await executeApprovedAction(
        id,
        { email: 'admin@kriatech.com', role: 'owner' }
      );

      expect(result.success).toBe(false);
      expect(result.error_code).toBe('EXTERNAL_DISPATCH_FAILED');
      expect(result.error).toContain('LIVE_DISPATCH_FAILED');
    } finally {
      if (originalEnv !== undefined) {
        process.env.LIVE_PRODUCTION_DISPATCH = originalEnv;
      } else {
        delete process.env.LIVE_PRODUCTION_DISPATCH;
      }
    }
  });

  it('allows retry of a failed approval after resolution', async () => {
    const originalEnv = process.env.LIVE_PRODUCTION_DISPATCH;
    process.env.LIVE_PRODUCTION_DISPATCH = 'true';

    let id = '';
    try {
      const createRes = await createApprovalRequest({
        action_type: 'campaign_launch',
        title: 'Diwali Acrylic Campaign',
        risk_level: 'critical',
        destination: 'Meta Ads Manager',
      });
      id = createRes.data!.id;
      await updateApprovalStatus(id, 'approved', 'admin@kriatech.com');

      // Attempt 1: Fails due to missing live credentials
      const res1 = await executeApprovedAction(
        id,
        { email: 'admin@kriatech.com', role: 'owner' }
      );
      expect(res1.success).toBe(false);
    } finally {
      // Revert live flag so retry can run in safe sandbox mode
      delete process.env.LIVE_PRODUCTION_DISPATCH;
    }

    // Attempt 2: Retry succeeds
    const retryRes = await retryFailedApproval(
      id,
      { email: 'admin@kriatech.com', role: 'owner' }
    );
    expect(retryRes.success).toBe(true);
  });

  it('reconciles stale approvals stuck in processing state', async () => {
    const mockStaleRecords = [
      { id: 'appr-stale-01', title: 'Stale WhatsApp', action_type: 'customer_message' },
      { id: 'appr-stale-02', title: 'Stale CMS', action_type: 'content_publish' },
    ];

    const mockUpdate = vi.fn().mockReturnValue({
      in: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'approval_requests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({ data: mockStaleRecords, error: null }),
              }),
            }),
            update: mockUpdate,
          };
        }
        return {};
      }),
    };

    const reconciliation = await reconcileStaleApprovals(10, mockSupabase);

    expect(reconciliation.recoveredCount).toBe(2);
    expect(reconciliation.approvalIds).toEqual(['appr-stale-01', 'appr-stale-02']);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        dispatch_error: expect.stringContaining('RECONCILIATION_TIMEOUT'),
      })
    );
  });
});
