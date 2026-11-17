export type AgentId =
  | 'seo-agent'
  | 'content-agent'
  | 'sales-agent'
  | 'competitor-agent'
  | 'website-agent'
  | 'business-analyst';

export type AgentStatus = 'active' | 'inactive' | 'maintenance';

export type AgentTaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AgentDefinition {
  id: AgentId;
  name: string;
  description: string;
  category: 'Marketing' | 'Content' | 'Sales' | 'Research' | 'Technical' | 'Analytics';
  status: AgentStatus;
  config: Record<string, any>;
  capabilities: string[];
}

export interface AgentTaskOutput<T = any> {
  structured_data: T;
  reasoning_summary: string;
  sources: string[];
  verified_facts: string[];
  assumptions: string[];
}

export interface AgentTask<TInput = any, TOutput = any> {
  id: string;
  agent_id: AgentId;
  title: string;
  task_type: string;
  input_params: TInput;
  status: AgentTaskStatus;
  initiated_by: string | null;
  error_message: string | null;
  output?: AgentTaskOutput<TOutput>;
  created_at: string;
  completed_at: string | null;
}

// Typed Inputs & Outputs for each Agent

// 1. SEO Agent
export interface SEOKeywordInput {
  seed_term: string;
  target_category: string;
  location?: string;
}

export interface SEOKeywordResult {
  keyword: string;
  search_intent: 'informational' | 'navigational' | 'commercial' | 'transactional';
  cluster: string;
  priority: 'low' | 'medium' | 'high';
  target_page: string;
  rationale: string;
}

// 2. Content Agent
export interface ContentGenInput {
  content_type: 'product_description' | 'article' | 'instagram_caption' | 'reels_script' | 'email_draft';
  topic: string;
  target_audience: string;
  keywords: string[];
  tone?: string;
  product_ref?: string;
}

export interface ContentGenOutput {
  title: string;
  body: string;
  target_audience: string;
  suggested_cta: string;
  keywords_used: string[];
  recommended_media: string;
}

// 3. Sales Agent
export interface LeadScoringInput {
  lead_name: string;
  business_name?: string;
  product_interest: string;
  quantity: number;
  budget?: number;
  source: string;
  notes?: string;
}

export interface LeadScoringOutput {
  score: number; // 0 to 100
  priority: 'low' | 'medium' | 'high' | 'urgent';
  intent_tier: 'Retail Curious' | 'Bulk Evaluator' | 'Ready to Buy' | 'Low Fit';
  suggested_action: string;
  suggested_follow_up_hours: number;
  draft_response_message: string;
}
