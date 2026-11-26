/**
 * R1. End-to-End B2B Bulk-Order Workflow Orchestrator
 *
 * Coordinates KRIA AI's agent services through each stage of the bulk
 * magnetic acrylic frame order workflow:
 *   research → outreach_prepared → awaiting_approval → dispatched →
 *   awaiting_reply → qualified → quoted → follow_up → order_confirmed → completed
 *
 * Triggerable via POST /api/workflows/b2b-bulk-order
 * Persists workflow state to Supabase `workflow_runs` table.
 */

import { createClient } from '@/lib/supabase/server';
import { executeSalesLeadAgent, SalesLeadAgentRequest } from '@/lib/services/sales-lead-agent';
import { createFollowUp, prepareFollowUpContent, markComplete as markFollowUpComplete, DEMO_FOLLOW_UPS } from '@/lib/services/follow-up-scheduler';
import { executeApprovedAction } from '@/lib/services/execution-dispatcher';
import { recordOrder } from '@/lib/services/order-tracker';
import { calculateWholesaleQuote } from '@/lib/services/pricing-engine';
import { KRIA_CATALOG_VARIANTS } from '@/lib/data/kria-catalog-matrix';
import { logActivity } from '@/lib/services/activity-logs';
import { WorkflowRun, WorkflowStage, WorkflowStageHistoryEntry } from '@/types/database';
import { ExecutionState } from '@/lib/types/workflow-states';

export interface B2BBulkOrderWorkflowInput {
  /** Business goal / objective description */
  goal: string;
  /** Optional lead details to seed the workflow */
  lead?: {
    name?: string;
    business_name?: string;
    phone?: string;
    email?: string;
    location?: string;
    sku?: string;
    quantity?: number;
    budget?: number;
    source?: string;
  };
  /** Whether to persist to Supabase (default: true when configured) */
  persist?: boolean;
  /** Actor email for audit trail */
  actor_email?: string;
}

export interface B2BBulkOrderWorkflowResult {
  success: boolean;
  workflow_run_id?: string;
  current_stage: WorkflowStage;
  execution_state: ExecutionState;
  stages_completed: WorkflowStage[];
  lead_id?: string;
  approval_id?: string;
  follow_up_id?: string;
  output_summary: string;
  error?: string;
}

/** In-memory store for demo/test workflow runs */
export const DEMO_WORKFLOW_RUNS: WorkflowRun[] = [];

/**
 * Persists or updates a workflow_run record in Supabase.
 * Falls back silently if Supabase is not configured.
 */
async function persistWorkflowRun(
  run: Partial<WorkflowRun> & { id?: string },
  customClient?: any
): Promise<string | undefined> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isDemo =
    !customClient && (!supabaseUrl || supabaseUrl.includes('placeholder'));

  if (isDemo) {
    const existing = DEMO_WORKFLOW_RUNS.find((r) => r.id === run.id);
    if (existing) {
      Object.assign(existing, run, { updated_at: new Date().toISOString() });
      return existing.id;
    }
    const newRun: WorkflowRun = {
      id: `wfr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: 'B2B Bulk Order Workflow',
      objective: (run as any).goal || run.objective || 'Bulk magnetic acrylic frame order',
      lead_id: null,
      latest_approval_id: null,
      latest_follow_up_id: null,
      order_id: null,
      current_stage: run.current_stage || 'research',
      execution_state: run.execution_state || 'ai_generated',
      stage_history: run.stage_history || [],
      summary: run.summary || null,
      metadata: run.metadata || {},
      is_demo: true,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...run,
    } as WorkflowRun;
    DEMO_WORKFLOW_RUNS.push(newRun);
    return newRun.id;
  }

  try {
    const supabase = customClient || createClient();

    if (run.id) {
      // Update existing
      await supabase
        .from('workflow_runs')
        .update({
          ...run,
          updated_at: new Date().toISOString(),
        })
        .eq('id', run.id);
      return run.id;
    }

    // Insert new
    const { data, error } = await supabase
      .from('workflow_runs')
      .insert([
        {
          title: 'B2B Bulk Order Workflow',
          objective: (run as any).goal || run.objective || 'Bulk magnetic acrylic frame order',
          current_stage: run.current_stage || 'research',
          execution_state: run.execution_state || 'ai_generated',
          stage_history: run.stage_history || [],
          metadata: run.metadata || {},
          summary: run.summary || null,
          is_demo: false,
        },
      ])
      .select('id')
      .single();

    if (error) {
      console.warn('workflow_runs insert warning:', error.message);
      return undefined;
    }

    return data?.id;
  } catch (err: any) {
    console.warn('persistWorkflowRun exception:', err.message);
    return undefined;
  }
}

function buildStageEntry(
  stage: WorkflowStage,
  execution_state: ExecutionState,
  note?: string
): WorkflowStageHistoryEntry {
  return {
    stage,
    execution_state,
    timestamp: new Date().toISOString(),
    note: note || null,
  };
}

/**
 * Main orchestrator for the B2B bulk magnetic acrylic frame order workflow.
 *
 * Runs synchronously through the first active stages (research → outreach_prepared →
 * awaiting_approval) and records each transition. Long-running async stages
 * (awaiting_reply, follow_up, order_confirmed) are gated behind human approval.
 */
export async function runB2BBulkOrderWorkflow(
  input: B2BBulkOrderWorkflowInput,
  customClient?: any
): Promise<B2BBulkOrderWorkflowResult> {
  const stagesCompleted: WorkflowStage[] = [];
  const stageHistory: WorkflowStageHistoryEntry[] = [];
  let workflowRunId: string | undefined;
  let leadId: string | undefined;
  let approvalId: string | undefined;
  let followUpId: string | undefined;

  // ── Stage 0: Create workflow_run record ──────────────────────────────────
  const initEntry = buildStageEntry('research', 'ai_generated', `Goal: ${input.goal}`);
  stageHistory.push(initEntry);

  workflowRunId = await persistWorkflowRun(
    {
      objective: input.goal,
      current_stage: 'research',
      execution_state: 'ai_generated',
      stage_history: stageHistory,
      metadata: { goal: input.goal, lead_input: input.lead || {} },
    },
    customClient
  );

  // ── Stage 1: Research ───────────────────────────────────────────────────
  stagesCompleted.push('research');

  // ── Stage 2: Outreach Preparation via Sales Agent ───────────────────────
  const salesReq: SalesLeadAgentRequest = {
    lead_name: input.lead?.name || 'B2B Prospect',
    business_name: input.lead?.business_name,
    phone: input.lead?.phone,
    email: input.lead?.email,
    location: input.lead?.location,
    sku: input.lead?.sku !== undefined ? input.lead.sku : 'KRA-REC-0604',
    quantity: input.lead?.quantity !== undefined ? input.lead.quantity : 50,
    budget: input.lead?.budget,
    source: (input.lead?.source as any) || 'b2b_research',
    topic_or_prompt: `B2B outreach for bulk magnetic acrylic frame order. Goal: ${input.goal}`,
    actor_email: input.actor_email,
  };

  const salesResult = await executeSalesLeadAgent(salesReq, customClient);

  if (!salesResult.success) {
    // Transition to failed
    stageHistory.push(
      buildStageEntry('failed', 'ai_generated', `Sales agent error: ${salesResult.error}`)
    );
    if (workflowRunId) {
      await persistWorkflowRun(
        {
          id: workflowRunId,
          current_stage: 'failed',
          execution_state: 'ai_generated',
          stage_history: stageHistory,
          summary: `Workflow failed at outreach preparation: ${salesResult.error}`,
        },
        customClient
      );
    }

    return {
      success: false,
      workflow_run_id: workflowRunId,
      current_stage: 'failed',
      execution_state: 'ai_generated',
      stages_completed: stagesCompleted,
      output_summary: `Workflow failed: ${salesResult.error}`,
      error: salesResult.error,
    };
  }

  leadId = salesResult.saved_lead_id;
  approvalId = salesResult.approval_id;
  stagesCompleted.push('outreach_prepared');
  stageHistory.push(
    buildStageEntry(
      'outreach_prepared',
      'ai_generated',
      `Sales agent scored lead ${salesResult.output?.score}/100 (${salesResult.output?.intent_tier}). Quote: ₹${salesResult.quote?.final_total_inr?.toLocaleString()}`
    )
  );

  // ── Stage 3: Awaiting Approval ───────────────────────────────────────────
  stagesCompleted.push('awaiting_approval');
  stageHistory.push(
    buildStageEntry(
      'awaiting_approval',
      'awaiting_approval',
      `Approval request created: ${approvalId || 'N/A'}`
    )
  );

  // ── Stage 4: Schedule Follow-Up ─────────────────────────────────────────
  if (leadId) {
    const followUpHours =
      typeof salesResult.output?.suggested_follow_up_hours === 'number' &&
      salesResult.output.suggested_follow_up_hours > 0
        ? salesResult.output.suggested_follow_up_hours
        : 24;

    const followUpResult = await createFollowUp(
      {
        lead_id: leadId,
        follow_up_hours: followUpHours,
        action_type: salesResult.output?.suggested_action || 'sales_follow_up',
        notes: `Workflow-initiated follow-up. Priority: ${salesResult.output?.priority}. Stage: awaiting_approval.`,
        workflow_run_id: workflowRunId,
        approval_id: approvalId,
      },
      customClient
    );

    if (followUpResult.success) {
      followUpId = followUpResult.data?.id;
    }
  }

  // ── Persist final state ─────────────────────────────────────────────────
  const outputSummary = [
    `Goal: ${input.goal}`,
    `Lead: ${input.lead?.name || 'B2B Prospect'}${input.lead?.business_name ? ` (${input.lead.business_name})` : ''}`,
    `Sales Score: ${salesResult.output?.score}/100 (${salesResult.output?.intent_tier})`,
    `Quote: ₹${salesResult.quote?.final_total_inr?.toLocaleString()} for ${salesResult.quote?.quantity} pcs of ${salesResult.quote?.product_name}`,
    `Approval: ${approvalId ? `Created (${approvalId})` : 'Not created'}`,
    `Follow-Up: ${followUpId ? `Scheduled (${followUpId})` : 'Not scheduled (no lead ID)'}`,
    `Next step: ${salesResult.output?.suggested_action}`,
  ].join(' | ');

  if (workflowRunId) {
    await persistWorkflowRun(
      {
        id: workflowRunId,
        lead_id: leadId || null,
        latest_approval_id: approvalId || null,
        latest_follow_up_id: followUpId || null,
        current_stage: 'awaiting_approval',
        execution_state: 'awaiting_approval',
        stage_history: stageHistory,
        summary: outputSummary,
        metadata: {
          goal: input.goal,
          lead_input: input.lead || {},
          sales_score: salesResult.output?.score,
          intent_tier: salesResult.output?.intent_tier,
          quote_total_inr: salesResult.quote?.final_total_inr,
        },
      },
      customClient
    );
  }

  // ── Audit Log ───────────────────────────────────────────────────────────
  await logActivity({
    entity_type: 'workflow_run',
    entity_id: workflowRunId || 'unknown',
    action: 'b2b_workflow_advanced',
    description: `B2B bulk-order workflow reached 'awaiting_approval' stage for ${input.lead?.name || 'B2B Prospect'}`,
    actor_type: 'agent',
    actor_id: 'b2b-bulk-order-workflow',
    metadata: {
      stages_completed: stagesCompleted,
      lead_id: leadId,
      approval_id: approvalId,
      follow_up_id: followUpId,
      sales_score: salesResult.output?.score,
    },
  });

  return {
    success: true,
    workflow_run_id: workflowRunId,
    current_stage: 'awaiting_approval',
    execution_state: 'awaiting_approval',
    stages_completed: stagesCompleted,
    lead_id: leadId,
    approval_id: approvalId,
    follow_up_id: followUpId,
    output_summary: outputSummary,
  };
}

export interface AdvanceWorkflowOptions {
  actor_email?: string;
  actor_role?: 'owner' | 'admin' | 'staff';
  reply_message?: string;
  sku?: string;
  quantity?: number;
  budget?: number;
  notes?: string;
}

export async function getWorkflowRuns(customClient?: any): Promise<WorkflowRun[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isDemo =
    !customClient && (!supabaseUrl || supabaseUrl.includes('placeholder'));

  if (isDemo) {
    return [...DEMO_WORKFLOW_RUNS];
  }

  try {
    const supabase = customClient || createClient();
    const { data, error } = await supabase
      .from('workflow_runs')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error || !data) return [];
    return data as WorkflowRun[];
  } catch {
    return [];
  }
}

export async function getWorkflowRunById(
  id: string,
  customClient?: any
): Promise<WorkflowRun | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isDemo =
    !customClient && (!supabaseUrl || supabaseUrl.includes('placeholder'));

  if (isDemo) {
    return DEMO_WORKFLOW_RUNS.find((r) => r.id === id) || null;
  }

  try {
    const supabase = customClient || createClient();
    const { data, error } = await supabase
      .from('workflow_runs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return data as WorkflowRun;
  } catch {
    return null;
  }
}

/**
 * Advances an existing B2B bulk-order workflow run to the specified target stage
 * and executes the stage's business logic.
 */
export async function advanceWorkflow(
  workflowRunId: string,
  toStage: WorkflowStage,
  options: AdvanceWorkflowOptions = {},
  customClient?: any
): Promise<B2BBulkOrderWorkflowResult> {
  const run = await getWorkflowRunById(workflowRunId, customClient);
  if (!run) {
    return {
      success: false,
      workflow_run_id: workflowRunId,
      current_stage: 'failed',
      execution_state: 'ai_generated',
      stages_completed: [],
      output_summary: `Workflow run '${workflowRunId}' not found.`,
      error: `Workflow run '${workflowRunId}' not found.`,
    };
  }

  const history: WorkflowStageHistoryEntry[] = Array.isArray(run.stage_history)
    ? [...run.stage_history]
    : [];
  const meta: Record<string, any> = { ...(run.metadata || {}) };
  let nextExecutionState: ExecutionState = run.execution_state;
  let latestApprovalId = run.latest_approval_id || undefined;
  let latestFollowUpId = run.latest_follow_up_id || undefined;
  let orderId = run.order_id || undefined;
  let summary = run.summary || '';

  const isDemo =
    !customClient &&
    (!process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder'));
  const supabase = !isDemo ? customClient || createClient() : null;

  const updateLeadStatus = async (status: string, extraNotes?: string) => {
    if (!run.lead_id || !supabase) return;
    const patch: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (extraNotes) patch.notes = extraNotes;
    await supabase.from('leads').update(patch).eq('id', run.lead_id);
  };

  if (toStage === 'outreach_prepared') {
    nextExecutionState = 'ai_generated';
    summary = `Outreach prepared for workflow ${workflowRunId}.`;
    history.push(buildStageEntry('outreach_prepared', nextExecutionState, summary));
  } else if (toStage === 'awaiting_approval') {
    nextExecutionState = 'awaiting_approval';
    summary = `Awaiting owner approval for outreach/quote (${latestApprovalId || 'pending'}).`;
    history.push(buildStageEntry('awaiting_approval', nextExecutionState, summary));
  } else if (toStage === 'awaiting_reply') {
    // Stage 4: Owner approved -> dispatch (simulated when LIVE_PRODUCTION_DISPATCH=false)
    if (!latestApprovalId) {
      return {
        success: false,
        workflow_run_id: workflowRunId,
        current_stage: run.current_stage,
        execution_state: run.execution_state,
        stages_completed: history.map((h) => h.stage),
        output_summary: 'Cannot dispatch: no approval_id linked to workflow run.',
        error: 'Cannot dispatch: no approval_id linked to workflow run.',
      };
    }

    const actor = {
      email: options.actor_email || 'kavindraraj1703@gmail.com',
      role: options.actor_role || ('owner' as const),
    };
    const dispatchRes = await executeApprovedAction(
      latestApprovalId,
      actor,
      `wfr-${workflowRunId}-${latestApprovalId}`,
      actor.role,
      customClient
    );

    if (!dispatchRes.success) {
      return {
        success: false,
        workflow_run_id: workflowRunId,
        current_stage: run.current_stage,
        execution_state: run.execution_state,
        stages_completed: history.map((h) => h.stage),
        output_summary: dispatchRes.error || 'Dispatch blocked.',
        error: dispatchRes.error || 'Dispatch blocked.',
      };
    }

    const isSimulated =
      dispatchRes.external_dispatch &&
      'simulated' in dispatchRes.external_dispatch
        ? Boolean(dispatchRes.external_dispatch.simulated)
        : process.env.LIVE_PRODUCTION_DISPATCH !== 'true';

    nextExecutionState = isSimulated ? 'simulated' : 'provider_accepted';
    await updateLeadStatus('contacted');

    if (run.lead_id && !latestFollowUpId) {
      const fuRes = await createFollowUp(
        {
          lead_id: run.lead_id,
          follow_up_hours: 24,
          action_type: 'check_outreach_reply',
          notes: 'Auto-scheduled after outreach dispatch.',
          workflow_run_id: workflowRunId,
          approval_id: latestApprovalId,
        },
        customClient
      );
      if (fuRes.success && fuRes.data) {
        latestFollowUpId = fuRes.data.id;
      }
    }

    summary = `Outreach dispatched (${isSimulated ? 'simulated' : 'live'}). Awaiting customer reply.`;
    history.push(buildStageEntry('awaiting_reply', nextExecutionState, summary));
  } else if (toStage === 'qualified') {
    // Stage 5: Inbound reply recorded or manual qualification
    nextExecutionState = 'customer_responded';
    if (options.sku) meta.lead_input = { ...(meta.lead_input || {}), sku: options.sku };
    if (options.quantity) meta.lead_input = { ...(meta.lead_input || {}), quantity: options.quantity };
    if (options.budget) meta.lead_input = { ...(meta.lead_input || {}), budget: options.budget };
    if (options.reply_message) meta.last_customer_reply = options.reply_message;

    if (latestFollowUpId) {
      await markFollowUpComplete(latestFollowUpId, customClient);
    }
    await updateLeadStatus(
      'qualified',
      options.reply_message
        ? `[Customer Reply] ${options.reply_message}`
        : undefined
    );

    summary = `Lead qualified. Requirements recorded: ${meta.lead_input?.sku || 'SKU pending'}, qty ${meta.lead_input?.quantity || 'pending'}.`;
    history.push(buildStageEntry('qualified', nextExecutionState, summary));
  } else if (toStage === 'quoted') {
    // Stage 6: Hard SKU & Quantity Validation (no silent defaults!)
    const targetSku = (options.sku || meta.lead_input?.sku || '').trim();
    const targetQty = Number(options.quantity ?? meta.lead_input?.quantity);

    if (!targetSku) {
      return {
        success: false,
        workflow_run_id: workflowRunId,
        current_stage: run.current_stage,
        execution_state: run.execution_state,
        stages_completed: history.map((h) => h.stage),
        output_summary: 'Quotation rejected: Explicit SKU is required.',
        error: 'Quotation rejected: Explicit SKU is required (no silent default substitution).',
      };
    }

    const catalogItem = KRIA_CATALOG_VARIANTS.find((p) => p.sku === targetSku);
    if (!catalogItem) {
      return {
        success: false,
        workflow_run_id: workflowRunId,
        current_stage: run.current_stage,
        execution_state: run.execution_state,
        stages_completed: history.map((h) => h.stage),
        output_summary: `Quotation rejected: Unknown SKU '${targetSku}'.`,
        error: `Product with SKU '${targetSku}' not found in KRIA TECH catalog matrix.`,
      };
    }

    const isStarterKit = targetSku === 'KRA-KIT-DEMO24';
    if (!Number.isFinite(targetQty) || targetQty <= 0 || (!isStarterKit && targetQty < 50)) {
      return {
        success: false,
        workflow_run_id: workflowRunId,
        current_stage: run.current_stage,
        execution_state: run.execution_state,
        stages_completed: history.map((h) => h.stage),
        output_summary: `Quotation rejected: Quantity must be >= 50 MOQ (or >= 1 for Starter Kit).`,
        error: isStarterKit
          ? 'Quotation rejected: Positive quantity is required for Starter Kit.'
          : `Quotation rejected: Bulk quantity (${targetQty || 0}) is missing or below KRIA MOQ of 50 pcs.`,
      };
    }

    const quote = calculateWholesaleQuote({ sku: targetSku, quantity: targetQty });
    meta.lead_input = { ...(meta.lead_input || {}), sku: targetSku, quantity: targetQty };
    meta.quote_total_inr = quote.final_total_inr;
    meta.unit_price_inr = quote.effective_unit_price;
    meta.product_name = quote.product_name;

    const leadInfo = meta.lead_input || {};
    const salesRes = await executeSalesLeadAgent(
      {
        lead_id: run.lead_id || undefined,
        lead_name: leadInfo.name || 'B2B Buyer',
        business_name: leadInfo.business_name,
        phone: leadInfo.phone,
        email: leadInfo.email,
        location: leadInfo.location,
        sku: targetSku,
        quantity: targetQty,
        budget: options.budget ?? leadInfo.budget,
        source: leadInfo.source || 'b2b_research',
        topic_or_prompt: `Verified quotation for ${targetQty} pcs of ${quote.product_name} (${targetSku}) at ₹${quote.effective_unit_price}/pc = ₹${quote.final_total_inr}.`,
        actor_email: options.actor_email || 'kavindraraj1703@gmail.com',
      },
      customClient
    );

    if (!salesRes.success) {
      return {
        success: false,
        workflow_run_id: workflowRunId,
        current_stage: run.current_stage,
        execution_state: run.execution_state,
        stages_completed: history.map((h) => h.stage),
        output_summary: `Quotation failed: ${salesRes.error}`,
        error: salesRes.error,
      };
    }

    latestApprovalId = salesRes.approval_id || latestApprovalId;
    nextExecutionState = 'awaiting_approval';
    summary = `Verified quote prepared: ₹${quote.final_total_inr.toLocaleString()} for ${targetQty} pcs (${targetSku}). Awaiting owner approval.`;
    history.push(buildStageEntry('quoted', nextExecutionState, summary));
  } else if (toStage === 'follow_up') {
    // Stage 7: Prepare follow-up automatically & update durable record
    if (latestFollowUpId) {
      let fuObj = isDemo
        ? DEMO_FOLLOW_UPS.find((f) => f.id === latestFollowUpId)
        : undefined;
      if (!fuObj && supabase) {
        const { data } = await supabase
          .from('follow_ups')
          .select('*')
          .eq('id', latestFollowUpId)
          .single();
        fuObj = data || undefined;
      }
      if (fuObj) {
        await prepareFollowUpContent(fuObj, customClient);
      }
    } else if (run.lead_id) {
      const fuRes = await createFollowUp(
        {
          lead_id: run.lead_id,
          follow_up_hours: 24,
          action_type: 'quote_follow_up',
          notes: options.notes || 'Automated follow-up preparation after quote.',
          workflow_run_id: workflowRunId,
          approval_id: latestApprovalId,
        },
        customClient
      );
      if (fuRes.success && fuRes.data) {
        latestFollowUpId = fuRes.data.id;
      }
    }
    nextExecutionState = 'ai_generated';
    summary = `Follow-up scheduled and prepared (${latestFollowUpId || 'queued'}).`;
    history.push(buildStageEntry('follow_up', nextExecutionState, summary));
  } else if (toStage === 'order_confirmed') {
    // Stage 8a: Record confirmed order & revenue
    const targetSku = (options.sku || meta.lead_input?.sku || '').trim();
    const targetQty = Number(options.quantity ?? meta.lead_input?.quantity);
    if (!targetSku || !Number.isFinite(targetQty) || targetQty <= 0) {
      return {
        success: false,
        workflow_run_id: workflowRunId,
        current_stage: run.current_stage,
        execution_state: run.execution_state,
        stages_completed: history.map((h) => h.stage),
        output_summary: 'Order confirmation failed: Valid SKU and quantity are required.',
        error: 'Order confirmation failed: Valid SKU and quantity are required.',
      };
    }

    const quote = calculateWholesaleQuote({ sku: targetSku, quantity: targetQty });
    const orderRes = await recordOrder(
      {
        lead_id: run.lead_id || null,
        workflow_run_id: workflowRunId,
        approval_id: latestApprovalId || null,
        sku: quote.sku,
        product_name: quote.product_name,
        quantity: quote.quantity,
        unit_price_inr: quote.effective_unit_price,
        total_inr: quote.final_total_inr,
        status: 'confirmed',
        payment_status: 'pending',
        notes: options.notes || `Confirmed via B2B workflow ${workflowRunId}`,
      },
      customClient
    );

    if (!orderRes.success || !orderRes.data) {
      return {
        success: false,
        workflow_run_id: workflowRunId,
        current_stage: run.current_stage,
        execution_state: run.execution_state,
        stages_completed: history.map((h) => h.stage),
        output_summary: orderRes.error || 'Failed to record order.',
        error: orderRes.error || 'Failed to record order.',
      };
    }

    orderId = orderRes.data.id;
    meta.order_id = orderId;
    meta.confirmed_revenue_inr = quote.final_total_inr;
    await updateLeadStatus('converted');
    nextExecutionState = 'customer_responded';
    summary = `Order confirmed (${orderId}): ₹${quote.final_total_inr.toLocaleString()} for ${quote.quantity} pcs of ${quote.sku}.`;
    history.push(buildStageEntry('order_confirmed', nextExecutionState, summary));
  } else if (toStage === 'completed') {
    summary = `Workflow completed. Revenue tracked: ₹${Number(meta.confirmed_revenue_inr || meta.quote_total_inr || 0).toLocaleString()}.`;
    history.push(buildStageEntry('completed', nextExecutionState, summary));
  } else {
    summary = `Workflow transitioned to '${toStage}'.`;
    history.push(buildStageEntry(toStage, nextExecutionState, summary));
  }

  await persistWorkflowRun(
    {
      id: workflowRunId,
      lead_id: run.lead_id,
      latest_approval_id: latestApprovalId || null,
      latest_follow_up_id: latestFollowUpId || null,
      order_id: orderId || null,
      current_stage: toStage,
      execution_state: nextExecutionState,
      stage_history: history,
      summary,
      metadata: meta,
    },
    customClient
  );

  await logActivity({
    entity_type: 'workflow_run',
    entity_id: workflowRunId,
    action: `b2b_workflow_stage_${toStage}`,
    description: summary,
    actor_type: options.actor_email ? 'user' : 'agent',
    actor_id: options.actor_email || 'b2b-bulk-order-workflow',
    metadata: {
      to_stage: toStage,
      execution_state: nextExecutionState,
      lead_id: run.lead_id,
      approval_id: latestApprovalId,
      follow_up_id: latestFollowUpId,
      order_id: orderId,
    },
  });

  return {
    success: true,
    workflow_run_id: workflowRunId,
    current_stage: toStage,
    execution_state: nextExecutionState,
    stages_completed: history.map((h) => h.stage),
    lead_id: run.lead_id || undefined,
    approval_id: latestApprovalId,
    follow_up_id: latestFollowUpId,
    output_summary: summary,
  };
}
