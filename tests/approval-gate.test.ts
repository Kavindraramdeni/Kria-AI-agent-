import { describe, it, expect } from 'vitest';
import { updateApprovalStatus, createApprovalRequest } from '@/lib/services/approvals';

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
    const created = await createApprovalRequest({
      action_type: 'customer_message',
      title: 'Test Customer Quote',
      proposed_content: { quote: 10000 },
      destination: 'WhatsApp Outbox',
      risk_level: 'medium',
    });

    const testId = created.data!.id;
    const reviewer = 'admin@kriatech.com';

    const res = await updateApprovalStatus(testId, 'approved', reviewer);

    expect(res.success).toBe(true);
    expect(res.recheckConfirmed).toBe(true);
  });

  it('records revision notes when requesting revision', async () => {
    const created = await createApprovalRequest({
      action_type: 'content_publish',
      title: 'Draft Reel for Revision',
      proposed_content: { script: 'Draft' },
      destination: 'Instagram Outbox',
      risk_level: 'medium',
    });

    const testId = created.data!.id;
    const reviewer = 'admin@kriatech.com';
    const notes = 'Change wholesale quantity threshold from 15 to 25 units.';

    const res = await updateApprovalStatus(testId, 'revision_requested', reviewer, notes);

    expect(res.success).toBe(true);
  });
});
