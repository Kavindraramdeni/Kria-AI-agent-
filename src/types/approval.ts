export type ApprovalActionType =
  | 'content_publish'
  | 'customer_message'
  | 'campaign_launch'
  | 'website_change'
  | 'automation_action';

export type ApprovalRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'revision_requested'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'executed';

export type ExecutionState =
  | 'ai_generated'
  | 'awaiting_approval'
  | 'simulated'
  | 'sent_to_provider'
  | 'provider_accepted'
  | 'customer_responded';

export interface ApprovalRequest {
  id: string;
  action_type: ApprovalActionType;
  title: string;
  proposed_content: Record<string, any>;
  destination: string;
  agent_id: string | null;
  lead_id?: string | null;
  workflow_run_id?: string | null;
  execution_state?: ExecutionState;
  provider_message_id?: string | null;
  provider_accepted_at?: string | null;
  customer_responded_at?: string | null;
  customer_response?: string | null;
  risk_level: ApprovalRiskLevel;
  status: ApprovalStatus;
  requested_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  executed_at: string | null;
  idempotency_key?: string | null;
  execution_result?: Record<string, any> | null;
  dispatch_error?: string | null;
  dispatch_started_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalExecutionResult {
  success: boolean;
  approval_id: string;
  execution_state?: ExecutionState;
  executed_at?: string;
  error?: string;
  audit_logged: boolean;
}
