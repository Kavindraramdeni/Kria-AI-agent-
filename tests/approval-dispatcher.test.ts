import { describe, it, expect } from 'vitest';
import { executeApprovedAction } from '@/lib/services/execution-dispatcher';
import { createApprovalRequest, updateApprovalStatus } from '@/lib/services/approvals';

describe('Server-Side Approval Dispatcher & Single-Use Security Gate', () => {
  it('strictly blocks execution when approval request is in pending status', async () => {
    const created = await createApprovalRequest({
      action_type: 'customer_message',
      title: 'Direct Quote to Retail Store',
      proposed_content: { quote_inr: 45000 },
      destination: 'WhatsApp Outbox',
      risk_level: 'high',
    });

    expect(created.success).toBe(true);
    const id = created.data!.id;

    // Attempt dispatch without approval
    const result = await executeApprovedAction(id);
    expect(result.success).toBe(false);
    expect(result.error).toContain("SECURITY GATE REJECTION: Action status is 'pending'");
  });

  it('strictly blocks execution when approval request was rejected', async () => {
    const created = await createApprovalRequest({
      action_type: 'campaign_launch',
      title: 'Unauthorized Ad Spend Test',
      proposed_content: { budget: 100000 },
      destination: 'Meta Ads Manager',
      risk_level: 'critical',
    });

    const id = created.data!.id;
    await updateApprovalStatus(id, 'rejected', 'admin@kriatech.com', 'Exceeds budget cap');

    const result = await executeApprovedAction(id);
    expect(result.success).toBe(false);
    expect(result.error).toContain("SECURITY GATE REJECTION: Action status is 'rejected'");
  });

  it('permits execution only after explicit approval, then blocks second execution (Single-Use)', async () => {
    const created = await createApprovalRequest({
      action_type: 'content_publish',
      title: 'Verified Instagram Reel Script',
      proposed_content: { script: 'Showcasing 20mm acrylic diamond edge polish' },
      destination: 'Instagram Feed',
      risk_level: 'medium',
    });

    const id = created.data!.id;

    // Step 1: Approve request
    const approveRes = await updateApprovalStatus(id, 'approved', 'admin@kriatech.com');
    expect(approveRes.success).toBe(true);

    // Step 2: Dispatch execution (First attempt)
    const execRes1 = await executeApprovedAction(id, 'admin@kriatech.com');
    expect(execRes1.success).toBe(true);
    expect(execRes1.executed_at).toBeDefined();

    // Step 3: Attempt second dispatch with same ID (Replay / Blanket execution test)
    const execRes2 = await executeApprovedAction(id, 'admin@kriatech.com');
    expect(execRes2.success).toBe(false);
    expect(execRes2.error).toContain('Action has already been executed. Approvals are strictly single-use');
  });
});
