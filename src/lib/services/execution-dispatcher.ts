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
  error_code?: 'ALREADY_EXECUTED' | 'NOT_APPROVED' | 'CONCURRENCY_LOCKED' | 'NOT_FOUND' | 'DATABASE_ERROR';
  dispatch_payload?: Record<string, any>;
}

// In-memory Mutex lock set to prevent concurrent TOCTOU race conditions
const activeDispatchLocks = new Set<string>();

/**
 * Server-Side Execution Dispatcher
 * Critical Security Gate: Strictly enforces that actions can ONLY execute
 * if their status is currently 'approved' and has not already been executed.
 * Protects against replayed requests and simultaneous concurrent race conditions.
 */
export async function executeApprovedAction(
  approvalId: string,
  actorEmail: string = 'admin@kriatech.com'
): Promise<DispatchResult> {
  // CONCURRENCY LOCK CHECK: Prevent simultaneous duplicate requests
  if (activeDispatchLocks.has(approvalId)) {
    return {
      success: false,
      approval_id: approvalId,
      action_type: 'unknown',
      destination: 'unknown',
      error_code: 'CONCURRENCY_LOCKED',
      error: 'SECURITY GATE REJECTION: Concurrency lock active. Simultaneous duplicate execution blocked.',
    };
  }

  // Acquire lock
  activeDispatchLocks.add(approvalId);

  try {
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
          error_code: 'NOT_FOUND',
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
        error_code: 'NOT_FOUND',
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
        error_code: 'ALREADY_EXECUTED',
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
        error_code: 'NOT_APPROVED',
        error: `SECURITY GATE REJECTION: Action status is '${item.status}'. Only 'approved' items can be dispatched.`,
      };
    }

    const executedAt = new Date().toISOString();

    // Update status to 'executed' atomically
    if (isDemo) {
      item.status = 'executed';
      item.executed_at = executedAt;
      item.updated_at = executedAt;
    } else {
      const supabase = createClient();
      // Atomic conditional update in database: Only update if still approved and not yet executed
      const { data: updated, error: updateError } = await supabase
        .from('approval_requests')
        .update({
          status: 'executed',
          executed_at: executedAt,
          updated_at: executedAt,
        })
        .eq('id', approvalId)
        .eq('status', 'approved')
        .is('executed_at', null)
        .select();

      if (updateError || !updated || updated.length === 0) {
        return {
          success: false,
          approval_id: approvalId,
          action_type: item.action_type,
          destination: item.destination,
          error_code: 'ALREADY_EXECUTED',
          error: 'SECURITY GATE REJECTION: Database atomic update failed. Item was already executed by a concurrent request.',
        };
      }
    }

    // Record audit log with cryptographic hash
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
        executed_at: executedAt,
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
  } finally {
    // Release concurrency lock
    activeDispatchLocks.delete(approvalId);
  }
}
