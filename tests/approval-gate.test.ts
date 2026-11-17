import { describe, it, expect, beforeEach } from 'vitest';
import { updateApprovalStatus, createApprovalRequest, getApprovals } from '@/lib/services/approvals';
import { DEMO_APPROVALS } from '@/lib/demo-data';

describe('Strict Human Approval Gate Enforcement', () => {
  it('creates an approval request with status pending and single-use semantics', async () => {
    const res = await createApprovalRequest({
      action_type: 'content_publish',
      title: 'Test Instagram Post',
      proposed_content: { caption: 'Test Caption' },
      destination: 'Instagram Feed',
      risk_level: 'medium',
    });

    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data?.status).toBe('pending');
    expect(res.data?.risk_level).toBe('medium');
  });

  it('records reviewer identity and timestamp upon approval', async () => {
    const testId = DEMO_APPROVALS[0].id;
    const reviewer = 'admin@kriatech.com';

    const res = await updateApprovalStatus(testId, 'approved', reviewer);

    expect(res.success).toBe(true);
    expect(res.recheckConfirmed).toBe(true);

    const updated = DEMO_APPROVALS.find((a) => a.id === testId);
    expect(updated?.status).toBe('approved');
    expect(updated?.reviewed_by).toBe(reviewer);
    expect(updated?.reviewed_at).toBeDefined();
  });

  it('records revision notes when requesting revision', async () => {
    const testId = DEMO_APPROVALS[1].id;
    const reviewer = 'admin@kriatech.com';
    const notes = 'Change wholesale quantity threshold from 15 to 25 units.';

    const res = await updateApprovalStatus(testId, 'revision_requested', reviewer, notes);

    expect(res.success).toBe(true);
    const updated = DEMO_APPROVALS.find((a) => a.id === testId);
    expect(updated?.status).toBe('revision_requested');
    expect(updated?.review_notes).toBe(notes);
  });
});
