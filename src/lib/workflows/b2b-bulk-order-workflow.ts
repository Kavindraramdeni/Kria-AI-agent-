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
import { createFollowUp } from '@/lib/services/follow-up-scheduler';
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
    sku: input.lead?.sku || 'KRA-REC-0604',
    quantity: input.lead?.quantity || 50,
    budget: input.lead?.budget,
    source: (input.lead?.source as any) || 'b2b_research',
    topic_or_prompt: `B2B outreach for bulk magnetic acrylic frame order. Goal: ${input.goal}`,
    actor_email: input.actor_email,
  };

  const salesResult = await executeSalesLeadAgent(salesReq);

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
