import { createClient } from '@/lib/supabase/client';
import { getActiveApprovalsFixture, DEMO_APPROVALS } from '@/lib/demo-data';
import { ApprovalRequest, ApprovalStatus } from '@/types/approval';

export async function getApprovals(): Promise<{ data: ApprovalRequest[]; isLive: boolean; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
      return { data: getActiveApprovalsFixture(), isLive: false };
    }

    const supabase = createClient();
    const { data, error } = await supabase
      .from('approval_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return { data: getActiveApprovalsFixture(), isLive: false, error: error?.message };
    }

    return { data: data || [], isLive: true };
  } catch (err: any) {
    return { data: getActiveApprovalsFixture(), isLive: false, error: err.message };
  }
}

export async function createApprovalRequest(request: Partial<ApprovalRequest>): Promise<{ success: boolean; data?: ApprovalRequest; error?: string }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
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

    const supabase = createClient();
    const { data, error } = await supabase
      .from('approval_requests')
      .insert([{
        ...request,
        status: 'pending',
      }])
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateApprovalStatus(
  id: string,
  status: ApprovalStatus,
  reviewerEmail: string,
  reviewNotes?: string
): Promise<{ success: boolean; error?: string; recheckConfirmed?: boolean }> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const now = new Date().toISOString();

    if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
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

    const supabase = createClient();
    const updatePayload: Record<string, any> = {
      status,
      reviewed_at: now,
      updated_at: now,
    };
    if (reviewNotes) updatePayload.review_notes = reviewNotes;
    if (status === 'executed') updatePayload.executed_at = now;

    const { error } = await supabase
      .from('approval_requests')
      .update(updatePayload)
      .eq('id', id);

    if (error) return { success: false, error: error.message };
    return { success: true, recheckConfirmed: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
