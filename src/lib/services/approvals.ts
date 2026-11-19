import { createClient } from '@/lib/supabase/client';
import { getActiveApprovalsFixture, DEMO_APPROVALS } from '@/lib/demo-data';
import { isDemoModeActive } from '@/lib/demo-mode';
import { ApprovalRequest, ApprovalStatus } from '@/types/approval';

export async function getApprovals(): Promise<{ data: ApprovalRequest[]; isLive: boolean; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      const isAllowed = process.env.NODE_ENV === 'test' || isDemoModeActive();
      return { data: isAllowed ? getActiveApprovalsFixture() : [], isLive: false };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('approval_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: [], isLive: false, error: error.message };
    }

    return { data: data || [], isLive: true };
  } catch (err: any) {
    return { data: [], isLive: false, error: err.message };
  }
}

export async function createApprovalRequest(
  request: Partial<ApprovalRequest>,
  customClient?: any
): Promise<{ success: boolean; data?: ApprovalRequest; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!customClient && (!supabaseUrl || supabaseUrl.includes('placeholder'))) {
      const newApproval: ApprovalRequest = {
        id: 'appr-' + Date.now(),
        action_type: request.action_type || 'content_publish',
        title: request.title || 'Untitled Action Request',
        proposed_content: request.proposed_content || {},
        destination: request.destination || 'Unspecified Target',
        agent_id: request.agent_id || null,
        risk_level: request.risk_level || 'medium',
        status: 'pending',
        requested_by: null,
        reviewed_by: null,
        reviewed_at: null,
        review_notes: null,
        executed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      DEMO_APPROVALS.unshift(newApproval);
      return { success: true, data: newApproval };
    }

    const supabase = customClient || createClient();

    // Sanitize requested_by: must be a valid UUID or null for PostgreSQL uuid column
    let validRequestedBy: string | null = null;
    const isUuid = (val: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

    if (request.requested_by && isUuid(request.requested_by)) {
      validRequestedBy = request.requested_by;
    } else {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id && isUuid(authData.user.id)) {
          validRequestedBy = authData.user.id;
        } else if (request.requested_by && typeof request.requested_by === 'string' && request.requested_by.includes('@')) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', request.requested_by.trim())
            .single();
          if (prof?.id && isUuid(prof.id)) {
            validRequestedBy = prof.id;
          }
        }
      } catch {
        // Fallback to null if unresolvable
      }
    }

    const payload = {
      action_type: request.action_type || 'content_publish',
      title: request.title || 'Untitled Action Request',
      proposed_content: request.proposed_content || {},
      destination: request.destination || 'Unspecified Target',
      agent_id: request.agent_id || null,
      risk_level: request.risk_level || 'medium',
      status: 'pending',
      requested_by: validRequestedBy,
    };

    const { data, error } = await supabase
      .from('approval_requests')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.warn('Supabase approval_requests insert error:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateApprovalStatus(
  id: string,
  status: ApprovalStatus,
  reviewerEmail: string,
  reviewNotes?: string,
  customClient?: any
): Promise<{ success: boolean; error?: string; recheckConfirmed?: boolean }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isDemo = !customClient && (!supabaseUrl || supabaseUrl.includes('placeholder'));
    const now = new Date().toISOString();

    if (isDemo) {
      const item = DEMO_APPROVALS.find((a) => a.id === id);
      if (!item) return { success: false, error: 'Approval request not found.' };

      item.status = status;
      item.reviewed_by = reviewerEmail;
      item.reviewed_at = now;
      if (reviewNotes) item.review_notes = reviewNotes;
      if (status === 'executed') item.executed_at = now;
      item.updated_at = now;

      return { success: true, recheckConfirmed: true };
    }

    const supabase = customClient || createClient();

    // Resolve reviewer UUID
    let reviewerId: string | null = null;
    const isUuid = (val: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);

    if (reviewerEmail && isUuid(reviewerEmail)) {
      reviewerId = reviewerEmail;
    } else {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id && isUuid(authData.user.id)) {
          reviewerId = authData.user.id;
        } else if (reviewerEmail && reviewerEmail.includes('@')) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', reviewerEmail.trim())
            .single();
          if (prof?.id && isUuid(prof.id)) {
            reviewerId = prof.id;
          }
        }
      } catch {
        // Fallback
      }
    }

    const updatePayload: Record<string, any> = {
      status,
      reviewed_at: now,
      updated_at: now,
    };
    if (reviewerId) updatePayload.reviewed_by = reviewerId;
    if (reviewNotes) updatePayload.review_notes = reviewNotes;
    if (status === 'executed') updatePayload.executed_at = now;

    const { data: updated, error } = await supabase
      .from('approval_requests')
      .update(updatePayload)
      .eq('id', id)
      .select();

    if (error) return { success: false, error: error.message };
    if (!updated || updated.length === 0) {
      return {
        success: false,
        error: 'Failed to update approval status: 0 rows modified. Check RLS owner/admin permissions.',
      };
    }
    return { success: true, recheckConfirmed: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
