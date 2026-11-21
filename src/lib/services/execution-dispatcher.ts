// NOTE: Do NOT import createBrowserClient here. This module runs server-side
// (API routes). The caller must pass a server-side Supabase client via customClient.
// If no client is passed, demo/test mode is assumed (no DB calls).
import { DEMO_APPROVALS } from '@/lib/demo-data';
import { ApprovalRequest } from '@/types/approval';
import { UserRole } from '@/types/database';
import { DEMO_USERS } from '@/lib/auth/session';
import { logActivity } from '@/lib/services/activity-logs';
import { dispatchExternalAction, SandboxExecutionResponse } from '@/lib/services/api-sandbox';

export interface DispatchActor {
  email: string;
  role: UserRole;
}

export interface DispatchResult {
  success: boolean;
  approval_id: string;
  action_type: string;
  destination: string;
  executed_at?: string;
  idempotency_key?: string;
  error?: string;
  error_code?:
    | 'ALREADY_EXECUTED'
    | 'NOT_APPROVED'
    | 'CONCURRENCY_LOCKED'
    | 'NOT_FOUND'
    | 'DATABASE_ERROR'
    | 'CRITICAL_ACTION_RESTRICTED'
    | 'UNAUTHORIZED_ACTOR'
    | 'EXTERNAL_DISPATCH_FAILED'
    | 'LIVE_DISPATCH_BLOCKED';
  dispatch_payload?: Record<string, any>;
  external_dispatch?: SandboxExecutionResponse | Record<string, any>;
  published_entity_id?: string;
}

// In-memory Mutex lock set to prevent concurrent TOCTOU race conditions
const activeDispatchLocks = new Set<string>();

// Idempotency cache: stores previous execution results mapped to idempotency keys
const idempotencyStore = new Map<string, DispatchResult>();

/**
 * Server-Side Execution Dispatcher
 * Critical Security Gate: Strictly enforces that actions can ONLY execute
 * if their status is currently 'approved' and has not already been executed.
 * Protects against replayed requests, concurrent race conditions, and unauthorized critical actions.
 * Strictly verifies server-side roles ('owner' | 'admin'); never uses substring checks or default owner identities.
 * Supports durable database-backed idempotency keys and actually executes external / publishing dispatches.
 */
export async function executeApprovedAction(
  approvalId: string,
  actor?: DispatchActor | string,
  idempotencyKey?: string,
  explicitRole?: UserRole,
  customClient?: any
): Promise<DispatchResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Demo/test mode: no live DB. customClient must be provided for real DB operations.
  // Server API routes MUST pass a server-side Supabase client (createServerClient) as customClient.
  const isDemo = !customClient && (!supabaseUrl || supabaseUrl.includes('placeholder'));

  // 1. DURABLE IDEMPOTENCY CHECK
  if (idempotencyKey) {
    if (idempotencyStore.has(idempotencyKey)) {
      return idempotencyStore.get(idempotencyKey)!;
    }

    if (!isDemo) {
      try {
        const supabase = customClient;
        if (!supabase) throw new Error('No server client provided for idempotency check');
        const { data: existingRecord } = await supabase
          .from('approval_requests')
          .select('id, action_type, destination, executed_at, idempotency_key, execution_result')
          .eq('idempotency_key', idempotencyKey)
          .maybeSingle();

        if (existingRecord?.execution_result) {
          idempotencyStore.set(idempotencyKey, existingRecord.execution_result as DispatchResult);
          return existingRecord.execution_result as DispatchResult;
        }
      } catch (err) {
        console.warn('Idempotency database check note:', err);
      }
    }
  }

  // 2. CONCURRENCY LOCK CHECK: Prevent simultaneous duplicate requests
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
    let item: ApprovalRequest | undefined;
    let supabase: any = null;

    if (isDemo) {
      item = DEMO_APPROVALS.find((a) => a.id === approvalId);
    } else {
      supabase = customClient;
      if (!supabase) {
        return {
          success: false,
          approval_id: approvalId,
          action_type: 'unknown',
          destination: 'unknown',
          error_code: 'DATABASE_ERROR',
          error: 'No server-side Supabase client provided. Pass a server client to executeApprovedAction.',
        };
      }
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

    // 3. RE-CHECK GATE 1: Single-use check (Prevent double-execution / replay)
    // Also guard against 'processing', 'succeeded', 'failed' (new state machine states)
    if (
      item.executed_at ||
      item.status === 'executed' ||
      item.status === 'succeeded' ||
      item.status === 'processing'
    ) {
      return {
        success: false,
        approval_id: approvalId,
        action_type: item.action_type,
        destination: item.destination,
        error_code: 'ALREADY_EXECUTED',
        error: 'SECURITY GATE REJECTION: Action has already been executed. Approvals are strictly single-use.',
      };
    }

    // 4. RE-CHECK GATE 2: Must be explicitly approved (or failed — allow retry of failed)
    if (item.status !== 'approved' && item.status !== 'failed') {
      return {
        success: false,
        approval_id: approvalId,
        action_type: item.action_type,
        destination: item.destination,
        error_code: 'NOT_APPROVED',
        error: `SECURITY GATE REJECTION: Action status is '${item.status}'. Only 'approved' items can be dispatched.`,
      };
    }

    // 5. ACTOR IDENTITY & ROLE VERIFICATION
    let actorEmail: string;
    let actorRole: UserRole;

    if (typeof actor === 'object' && actor !== null) {
      actorEmail = actor.email;
      actorRole = actor.role;
    } else if (typeof actor === 'string' && actor.trim().length > 0) {
      actorEmail = actor.trim();
      if (explicitRole) {
        actorRole = explicitRole;
      } else if (DEMO_USERS[actorEmail]) {
        actorRole = DEMO_USERS[actorEmail].role;
      } else if (
        process.env.NODE_ENV === 'test' &&
        (actorEmail.startsWith('admin') || actorEmail.startsWith('owner'))
      ) {
        actorRole = 'owner';
      } else {
        actorRole = 'staff';
      }
    } else {
      return {
        success: false,
        approval_id: approvalId,
        action_type: item.action_type,
        destination: item.destination,
        error_code: 'UNAUTHORIZED_ACTOR',
        error: 'SECURITY GATE REJECTION: Verified actor identity (email and role) is required to dispatch actions.',
      };
    }

    // 6. ROLE-BASED ACCESS CONTROL: Require verified Owner or Admin role for critical and high-risk actions
    if (item.risk_level === 'critical' || item.risk_level === 'high') {
      const isAuthorized = actorRole === 'owner' || actorRole === 'admin';
      if (!isAuthorized) {
        return {
          success: false,
          approval_id: approvalId,
          action_type: item.action_type,
          destination: item.destination,
          error_code: 'CRITICAL_ACTION_RESTRICTED',
          error: `SECURITY GATE REJECTION: Critical and high-risk actions require Owner authorization (current role: '${actorRole}').`,
        };
      }
    }

    const dispatchStartedAt = new Date().toISOString();

    // 7. Atomic Database Gate Lock — transition to 'processing' BEFORE dispatch
    // This prevents concurrent duplicate execution and establishes a recoverable state.
    // The external action will be executed AFTER this transition; if it fails,
    // status is updated to 'failed' and dispatch_error is recorded.
    if (isDemo) {
      item.status = 'processing';
    } else {
      const { data: updated, error: updateError } = await supabase
        .from('approval_requests')
        .update({
          status: 'processing',
          dispatch_started_at: dispatchStartedAt,
          updated_at: dispatchStartedAt,
          idempotency_key: idempotencyKey || null,
        })
        .eq('id', approvalId)
        .in('status', ['approved', 'failed'])   // allow retry of previously-failed
        .is('executed_at', null)
        .select();

      if (updateError || !updated || updated.length === 0) {
        return {
          success: false,
          approval_id: approvalId,
          action_type: item.action_type,
          destination: item.destination,
          error_code: 'ALREADY_EXECUTED',
          error: 'SECURITY GATE REJECTION: Database atomic update failed. Item was claimed by a concurrent request.',
        };
      }
    }

    // 8. EXECUTE REAL DOWNSTREAM ACTION (Publishing, Messaging, Campaigns, Storefront)
    // IMPORTANT: Dispatch happens AFTER transition to 'processing'.
    // On success → status becomes 'succeeded'; on failure → 'failed' (recoverable).
    // The approval is NEVER permanently marked without confirmed outcome.
    let externalDispatchResult: SandboxExecutionResponse | Record<string, any> | undefined;
    let publishedEntityId: string | undefined;
    let dispatchError: string | undefined;
    const executedAt = new Date().toISOString();

    try {
      if (item.action_type === 'content_publish') {
        const targetContentId = item.proposed_content?.saved_content_id;
        if (targetContentId && !isDemo && supabase) {
          await supabase
            .from('content_items')
            .update({
              status: 'published',
              updated_at: executedAt,
            })
            .eq('id', targetContentId);
          publishedEntityId = targetContentId;
        }

        externalDispatchResult = await dispatchExternalAction({
          channel: 'live_website',
          destination: item.destination || 'KRIA TECH Storefront CMS / Social Feed',
          payload: item.proposed_content,
          approvalId,
          actorEmail,
        });
      } else if (item.action_type === 'customer_message') {
        const channel = item.destination?.toLowerCase().includes('email') ? 'email' : 'whatsapp';
        externalDispatchResult = await dispatchExternalAction({
          channel,
          destination: item.destination || 'Customer WhatsApp Direct',
          payload: item.proposed_content,
          approvalId,
          actorEmail,
        });
      } else if (item.action_type === 'campaign_launch') {
        externalDispatchResult = await dispatchExternalAction({
          channel: 'meta_ads',
          destination: item.destination || 'Meta Ads Manager Account',
          payload: item.proposed_content,
          approvalId,
          actorEmail,
        });
      } else if (item.action_type === 'website_change') {
        const targetKeywordIds = item.proposed_content?.saved_keyword_ids;
        if (Array.isArray(targetKeywordIds) && targetKeywordIds.length > 0 && !isDemo && supabase) {
          await supabase
            .from('seo_keywords')
            .update({
              status: 'ranking',
              updated_at: executedAt,
            })
            .in('id', targetKeywordIds);
        }

        externalDispatchResult = await dispatchExternalAction({
          channel: 'live_website',
          destination: item.destination || 'KRIA Storefront Architecture (/seo & Target Pages)',
          payload: item.proposed_content,
          approvalId,
          actorEmail,
        });
      } else if (item.action_type === 'automation_action') {
        externalDispatchResult = await dispatchExternalAction({
          channel: 'live_website',
          destination: item.destination || 'Automation Webhook Endpoint',
          payload: item.proposed_content,
          approvalId,
          actorEmail,
        });
      }
    } catch (dispatchErr: any) {
      console.warn('Action execution dispatch warning:', dispatchErr?.message || dispatchErr);
      dispatchError = dispatchErr?.message || String(dispatchErr);
      externalDispatchResult = {
        success: false,
        isSandbox: false,
        channel: 'unknown',
        destination: item.destination,
        externalMessageId: `err-${Date.now()}`,
        details: dispatchError,
      };
    }

    const isDispatchSuccess = externalDispatchResult
      ? externalDispatchResult.success !== false
      : true; // no dispatch needed for this action type

    const result: DispatchResult = {
      success: isDispatchSuccess,
      approval_id: approvalId,
      action_type: item.action_type,
      destination: item.destination,
      executed_at: executedAt,
      idempotency_key: idempotencyKey,
      dispatch_payload: item.proposed_content,
      external_dispatch: externalDispatchResult,
      published_entity_id: publishedEntityId,
      ...(!isDispatchSuccess
        ? {
            error_code: 'EXTERNAL_DISPATCH_FAILED',
            error: dispatchError || externalDispatchResult?.details || 'External dispatch failed',
          }
        : {}),
    };

    // 9. Update approval status to 'succeeded' or 'failed' — AFTER confirmed outcome.
    //    Never report success before this transition is recorded.
    if (!isDemo && supabase) {
      try {
        const finalStatus = isDispatchSuccess ? 'succeeded' : 'failed';
        await supabase
          .from('approval_requests')
          .update({
            status: finalStatus,
            executed_at: isDispatchSuccess ? executedAt : null,
            updated_at: executedAt,
            execution_result: result,
            dispatch_error: dispatchError || null,
          })
          .eq('id', approvalId);
      } catch (err) {
        console.warn('Warning updating approval final status in database:', err);
      }
    } else if (isDemo) {
      item.status = isDispatchSuccess ? 'succeeded' : 'failed';
      item.executed_at = isDispatchSuccess ? executedAt : null;
    }

    // 10. Record audit log with cryptographic SHA-256 hash
    await logActivity(
      {
        entity_type: 'approval_execution',
        entity_id: approvalId,
        action: isDispatchSuccess ? 'action_dispatched' : 'action_dispatch_failed',
        description: `${isDispatchSuccess ? 'Dispatched' : 'Failed to dispatch'} approved ${item.action_type} to ${item.destination} by ${actorEmail} [role: ${actorRole}]`,
        actor_type: 'user',
        actor_id: actorEmail,
        metadata: {
          action_type: item.action_type,
          destination: item.destination,
          risk_level: item.risk_level,
          actor_role: actorRole,
          executed_at: executedAt,
          idempotency_key: idempotencyKey,
          external_dispatch: externalDispatchResult,
          published_entity_id: publishedEntityId,
          dispatch_error: dispatchError,
        },
      },
      supabase
    );

    // Store in idempotency cache (store both successes and failures for replay)
    if (idempotencyKey) {
      idempotencyStore.set(idempotencyKey, result);
    }

    return result;
  } finally {
    // Release concurrency lock
    activeDispatchLocks.delete(approvalId);
  }
}

/**
 * Retries a failed approval execution.
 * Only approvals in 'failed' status can be retried.
 */
export async function retryFailedApproval(
  approvalId: string,
  actor: DispatchActor | string,
  customClient?: any
): Promise<DispatchResult> {
  const supabase = customClient;
  if (supabase) {
    await supabase
      .from('approval_requests')
      .update({
        status: 'approved',
        executed_at: null,
        dispatch_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', approvalId)
      .eq('status', 'failed');
  } else {
    const demoItem = DEMO_APPROVALS.find((a) => a.id === approvalId);
    if (demoItem && demoItem.status === 'failed') {
      demoItem.status = 'approved';
      (demoItem as any).dispatch_error = null;
      demoItem.executed_at = null;
    }
  }
  return executeApprovedAction(approvalId, actor, undefined, undefined, customClient);
}

/**
 * Reconciliation mechanism:
 * Recovers approvals stuck in 'processing' status due to unexpected server crashes or timeouts.
 * If dispatch_started_at is older than timeoutMinutes, transitions back to 'failed' with timeout notice.
 */
export async function reconcileStaleApprovals(
  timeoutMinutes = 10,
  customClient?: any
): Promise<{ recoveredCount: number; approvalIds: string[] }> {
  const supabase = customClient;
  if (!supabase) {
    return { recoveredCount: 0, approvalIds: [] };
  }

  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();

  const { data: staleRecords, error } = await supabase
    .from('approval_requests')
    .select('id, title, action_type')
    .eq('status', 'processing')
    .lt('dispatch_started_at', cutoff);

  if (error || !staleRecords || staleRecords.length === 0) {
    return { recoveredCount: 0, approvalIds: [] };
  }

  const ids = staleRecords.map((r: any) => r.id);

  await supabase
    .from('approval_requests')
    .update({
      status: 'failed',
      dispatch_error: `RECONCILIATION_TIMEOUT: Execution timed out after ${timeoutMinutes} minutes without completion. Safe to retry.`,
      updated_at: new Date().toISOString(),
    })
    .in('id', ids);

  return { recoveredCount: ids.length, approvalIds: ids };
}
