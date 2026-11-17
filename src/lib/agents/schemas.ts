import { z } from 'zod';

// Base Output Wrapper Schema
export const BaseAgentOutputSchema = z.object({
  reasoning_summary: z.string().min(10, 'Reasoning must be at least 10 characters.'),
  sources: z.array(z.string()).default([]),
  verified_facts: z.array(z.string()).min(1, 'Must list at least one verified fact.'),
  assumptions: z.array(z.string()).default([]),
});

// 1. SEO Agent Output Schema
export const SEOAgentOutputSchema = BaseAgentOutputSchema.extend({
  target_cluster: z.string(),
  recommended_keywords: z.array(
    z.object({
      keyword: z.string(),
      volume_estimate: z.number().nullable().optional(),
      intent: z.enum(['informational', 'navigational', 'commercial', 'transactional']),
      target_page: z.string(),
      priority: z.enum(['low', 'medium', 'high']),
    })
  ),
  on_page_recommendations: z.array(z.string()),
  content_gap_analysis: z.string(),
});

// 2. Content Agent Output Schema
export const ContentAgentOutputSchema = BaseAgentOutputSchema.extend({
  title: z.string(),
  content_type: z.enum([
    'article',
    'product_description',
    'landing_page',
    'instagram_caption',
    'reels_script',
    'social_calendar',
    'email_draft',
    'campaign_promo',
  ]),
  body: z.string(),
  target_audience: z.string(),
  suggested_cta: z.string(),
  keywords_used: z.array(z.string()),
  recommended_visuals: z.string(),
});

// 3. Sales Lead Agent Output Schema
export const SalesAgentOutputSchema = BaseAgentOutputSchema.extend({
  score: z.number().min(0).max(100),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  intent_tier: z.enum(['Retail Curious', 'Bulk Evaluator', 'Ready to Buy', 'Low Fit']),
  suggested_action: z.string(),
  suggested_follow_up_hours: z.number(),
  draft_response_message: z.string(),
  recommended_quote: z
    .object({
      sku: z.string(),
      quantity: z.number(),
      unit_price_inr: z.number(),
      total_inr: z.number(),
      tier_applied: z.string(),
    })
    .optional(),
});

// 4. Competitor Agent Output Schema
export const CompetitorAgentOutputSchema = BaseAgentOutputSchema.extend({
  competitor_name: z.string(),
  products_analyzed: z.array(
    z.object({
      product_name: z.string(),
      estimated_price: z.string(),
      thickness_spec: z.string(),
    })
  ),
  pricing_gap_vs_kria: z.string(),
  kria_competitive_advantages: z.array(z.string()),
  opportunities: z.array(z.string()),
});

// 5. Website Audit Agent Output Schema
export const WebsiteAgentOutputSchema = BaseAgentOutputSchema.extend({
  target_url: z.string(),
  page_title: z.string(),
  detected_issues: z.array(
    z.object({
      severity: z.enum(['low', 'medium', 'high', 'critical']),
      issue: z.string(),
      fix: z.string(),
    })
  ),
  seo_score: z.number().min(0).max(100),
  mobile_ux_notes: z.string(),
});

// 6. Business Analyst Agent Output Schema
export const BusinessAnalystOutputSchema = BaseAgentOutputSchema.extend({
  executive_summary: z.string(),
  pipeline_health: z.string(),
  top_demanded_products: z.array(z.string()),
  identified_bottlenecks: z.array(z.string()),
  recommended_growth_actions: z.array(z.string()),
});
