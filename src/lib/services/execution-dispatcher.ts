import { createClient } from '@/lib/supabase/client';
import { DEMO_APPROVALS } from '@/lib/demo-data';
import { ApprovalRequest } from '@/types/approval';
import { logActivity } from '@/lib/services/activity-logs';

export interface DispatchResult {
  success: boolean;
  approval_id: string;
  action_type: string;
  destination: string;
  executed_at?: string;
  error?: string;
  dispatch_payload?: Record<string, any>;
}

/**
 * Server-Side Execution Dispatcher
 * Critical Security Gate: Strictly enforces that actions can ONLY execute
 * if their status is currently 'approved' and has not already been executed.
 */
export async function executeApprovedAction(
  approvalId: string,
  actorEmail: string = 'admin@kriatech.com'
): Promise<DispatchResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isDemo = !supabaseUrl || supabaseUrl.includes('placeholder');

  let item: ApprovalRequest | undefined;

  if (isDemo) {
    item = DEMO_APPROVALS.find((a) => a.id === approvalId);
  } else {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('approval_requests')
      .select('*')
      .eq('id', approvalId)
      .single();

    if (error || !data) {
      return {
        success: false,
        approval_id: approvalId,
        action_type: 'unknown',
        destination: 'unknown',
        error: 'Approval request not found in database.',
      };
    }
    item = data;
  }

  if (!item) {
    return {
      success: false,
      approval_id: approvalId,
      action_type: 'unknown',
      destination: 'unknown',
      error: 'Approval request not found.',
    };
  }

  // RE-CHECK GATE 1: Single-use check (Prevent double-execution / replay)
  if (item.executed_at || item.status === 'executed') {
    return {
      success: false,
      approval_id: approvalId,
      action_type: item.action_type,
      destination: item.destination,
      error: 'SECURITY GATE REJECTION: Action has already been executed. Approvals are strictly single-use.',
    };
  }

  // RE-CHECK GATE 2: Must be explicitly approved
  if (item.status !== 'approved') {
    return {
      success: false,
      approval_id: approvalId,
      action_type: item.action_type,
      destination: item.destination,
      error: `SECURITY GATE REJECTION: Action status is '${item.status}'. Only 'approved' items can be dispatched.`,
    };
  }

  const executedAt = new Date().toISOString();

  // Update status to 'executed'
  if (isDemo) {
    item.status = 'executed';
    item.executed_at = executedAt;
    item.updated_at = executedAt;
  } else {
    const supabase = createClient();
    await supabase
      .from('approval_requests')
      .update({
        status: 'executed',
        executed_at: executedAt,
        updated_at: executedAt,
      })
      .eq('id', approvalId);
  }

  // Record audit log
  await logActivity({
    entity_type: 'approval_execution',
    entity_id: approvalId,
    action: 'action_dispatched',
    description: `Dispatched approved ${item.action_type} to ${item.destination} by ${actorEmail}`,
    actor_type: 'user',
    actor_id: actorEmail,
    metadata: {
      action_type: item.action_type,
      destination: item.destination,
      risk_level: item.risk_level,
    },
  });

  return {
    success: true,
    approval_id: approvalId,
    action_type: item.action_type,
    destination: item.destination,
    executed_at: executedAt,
    dispatch_payload: item.proposed_content,
  };
}
