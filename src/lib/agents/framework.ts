import { AgentDefinition, AgentId, AgentTaskOutput } from '@/types/agent';

export const REGISTERED_AGENTS: AgentDefinition[] = [
  {
    id: 'seo-agent',
    name: 'SEO Strategy Agent',
    description: 'Discovers high-intent keywords, clusters terms, audits on-page SEO, and tracks organic search performance for acrylic & personalization products.',
    category: 'Marketing',
    status: 'active',
    config: { temperature: 0.3 },
    capabilities: ['Keyword Research', 'Intent Classification', 'On-Page SEO Audit', 'Competitor Keyword Gap'],
  },
  {
    id: 'content-agent',
    name: 'Content Studio Agent',
    description: 'Generates SEO articles, product descriptions, Instagram captions, Reels scripts, and social calendar drafts with strict approval gates.',
    category: 'Content',
    status: 'active',
    config: { temperature: 0.7 },
    capabilities: ['Product Copywriting', 'Instagram Captions', 'Reels Scripting', 'SEO Article Outlines'],
  },
  {
    id: 'sales-agent',
    name: 'Sales & CRM Lead Agent',
    description: 'Scores incoming retail and bulk leads, analyzes purchasing intent, suggests follow-up cadence, and drafts WhatsApp/Email quotes.',
    category: 'Sales',
    status: 'active',
    config: { temperature: 0.4 },
    capabilities: ['Lead Intent Scoring', 'Bulk Wholesale Quoting', 'Follow-up Cadence', 'WhatsApp Message Drafting'],
  },
  {
    id: 'competitor-agent',
    name: 'Competitor Intelligence Agent',
    description: 'Analyzes publicly verifiable competitor offerings, pricing strategies, and SEO gaps without unauthorized scraping.',
    category: 'Research',
    status: 'active',
    config: { temperature: 0.2 },
    capabilities: ['Public Catalog Comparison', 'Pricing Structure Analysis', 'Feature Benchmarking'],
  },
  {
    id: 'website-agent',
    name: 'Website UX & Audit Agent',
    description: 'Performs accessibility, metadata, and link health checks on KRIA TECH landing pages, preparing change proposals for review.',
    category: 'Technical',
    status: 'active',
    config: { temperature: 0.2 },
    capabilities: ['Broken Link Scanning', 'Metadata Verification', 'UX Improvement Proposals'],
  },
  {
    id: 'business-analyst',
    name: 'Operations & Growth Analyst',
    description: 'Synthesizes lead conversion bottlenecks, top revenue categories, and production lead times into actionable summaries.',
    category: 'Analytics',
    status: 'active',
    config: { temperature: 0.3 },
    capabilities: ['Pipeline Bottleneck Analysis', 'Conversion Metrics', 'Product Demand Forecasting'],
  },
];

export function getAgentById(id: AgentId): AgentDefinition | undefined {
  return REGISTERED_AGENTS.find((agent) => agent.id === id);
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY);
}

export interface AgentExecutionEnvelope<TInput = any, TOutput = any> {
  agent_id: AgentId;
  task_type: string;
  input: TInput;
  output?: AgentTaskOutput<TOutput>;
  error?: string;
  is_simulated: boolean;
  credentials_configured: boolean;
}
