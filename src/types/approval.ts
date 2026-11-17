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
  | 'executed';

export interface ApprovalRequest {
  id: string;
  action_type: ApprovalActionType;
  title: string;
  proposed_content: Record<string, any>;
  destination: string;
  agent_id: string | null;
  risk_level: ApprovalRiskLevel;
  status: ApprovalStatus;
  requested_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalExecutionResult {
  success: boolean;
  approval_id: string;
  executed_at?: string;
  error?: string;
  audit_logged: boolean;
}
