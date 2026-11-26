import { NextRequest, NextResponse } from 'next/server';
import { getAgentById } from '@/lib/agents/framework';
import { KRIA_MANUFACTURING_FACTS } from '@/lib/agents/guardrails';
import { checkRateLimit } from '@/lib/services/rate-limit';
import {
  SEOAgentOutputSchema,
  ContentAgentOutputSchema,
  SalesAgentOutputSchema,
  CompetitorAgentOutputSchema,
  WebsiteAgentOutputSchema,
  BusinessAnalystOutputSchema,
} from '@/lib/agents/schemas';
import { AgentId } from '@/types/agent';
import { logActivity } from '@/lib/services/activity-logs';
import { calculateWholesaleQuote } from '@/lib/services/pricing-engine';
import { KRIA_CATALOG_VARIANTS, KRIA_TECH_MANUFACTURING_SPECS } from '@/lib/data/kria-catalog-matrix';
import { getServerSession } from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';
import { executeContentStudioAgent } from '@/lib/services/content-studio';
import { executeSEOStrategyAgent } from '@/lib/services/seo-strategy';
import { executeSalesLeadAgent } from '@/lib/services/sales-lead-agent';
import { executeCompetitorAgent } from '@/lib/services/competitor-intelligence';
import { executeWebsiteAuditAgent } from '@/lib/services/website-ux-agent';
import { executeBusinessAnalystAgent } from '@/lib/services/business-analyst';

export async function POST(
  req: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const agentId = params.agentId as AgentId;
    const agent = getAgentById(agentId);

    if (!agent) {
      return NextResponse.json(
        { error: `Agent '${params.agentId}' not found.` },
        { status: 404 }
      );
    }

    // Verify server-side authentication
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required to execute AI agents.' },
        { status: 401 }
      );
    }

    // Rate Limiting Check (30 calls per minute)
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local-client';
    const rateCheck = checkRateLimit(`agent_${clientIp}`, 30, 60);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded for agent execution. Please wait before retrying.',
          reset_seconds: rateCheck.resetSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.resetSeconds),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const body = await req.json();
    const input = body.input || '';
    const taskType = body.task_type || 'standard_generation';

    let validatedOutput: any;
    let supabase: any;
    try {
      supabase = createClient();
    } catch {}

    // Execute agent logic grounded in KRIA TECH manufacturing parameters
    switch (agentId) {
      case 'seo-agent': {
        // Phase 2B: Genuinely AI-Powered Generation via Google Gemini
        const seoResult = await executeSEOStrategyAgent({
          target_cluster: body.target_cluster,
          product_name: body.product_name,
          sku: body.sku,
          target_market: body.target_market,
          target_audience: body.target_audience,
          topic_or_prompt: typeof input === 'string' ? input : body.topic_or_prompt,
          actor_email: session.email,
          supabaseClient: supabase,
        });

        if (!seoResult.success) {
          return NextResponse.json(
            {
              error: seoResult.error || 'SEO Strategy AI generation failed.',
              execution_mode: 'error',
              is_simulated: false,
              model_invoked: false,
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          agent_id: agentId,
          task_type: taskType,
          output: seoResult.output,
          execution_mode: 'live_ai',
          model_invoked: true,
          is_simulated: false,
          model_name: seoResult.model_name,
          saved_keyword_ids: seoResult.saved_keyword_ids,
          approval_id: seoResult.approval_id,
          conflicts_detected: seoResult.conflicts_detected,
          message: 'Genuinely generated with Google Gemini AI grounded in verified KRIA TECH manufacturing parameters',
        });
      }

      case 'content-agent': {
        // Phase 2A: Genuinely AI-Powered Generation via Google Gemini
        const generationResult = await executeContentStudioAgent({
          product_name: body.product_name,
          sku: body.sku,
          dimensions: body.dimensions,
          verified_specs: body.verified_specs,
          target_audience: body.target_audience,
          content_type: body.content_type,
          tone: body.tone,
          language: body.language,
          topic_or_prompt: typeof input === 'string' ? input : body.topic_or_prompt,
          actor_email: session.email,
          supabaseClient: supabase,
        });

        if (!generationResult.success) {
          return NextResponse.json(
            {
              error: generationResult.error || 'Content Studio AI generation failed.',
              execution_mode: 'error',
              is_simulated: false,
              model_invoked: false,
            },
            { status: 500 }
          );
        }

        // Return honest execution metadata for genuine AI invocation
        return NextResponse.json({
          success: true,
          agent_id: agentId,
          task_type: taskType,
          output: generationResult.output,
          execution_mode: 'live_ai',
          model_invoked: true,
          is_simulated: false,
          model_name: generationResult.model_name,
          saved_content_id: generationResult.saved_content_id,
          approval_id: generationResult.approval_id,
          message: 'Genuinely generated with Google Gemini AI grounded in verified KRIA TECH manufacturing parameters',
        });
      }

      case 'sales-agent': {
        // Phase 2C: Genuinely AI-Powered Generation via Google Gemini
        const salesResult = await executeSalesLeadAgent({
          lead_id: body.lead_id,
          lead_name: body.lead_name || (typeof input === 'object' ? input.lead_name : undefined),
          business_name: body.business_name || (typeof input === 'object' ? input.business_name : undefined),
          phone: body.phone,
          email: body.email,
          location: body.location,
          sku: body.sku || (typeof input === 'object' ? input.sku : undefined),
          quantity: body.quantity ? Number(body.quantity) : (typeof input === 'object' && input.quantity ? Number(input.quantity) : undefined),
          has_subscription: body.has_subscription ?? (typeof input === 'object' ? input.has_subscription : undefined),
          budget: body.budget ? Number(body.budget) : undefined,
          source: body.source,
          topic_or_prompt: typeof input === 'string' ? input : body.topic_or_prompt || body.notes,
          actor_email: session.email,
          supabaseClient: supabase,
        });

        if (!salesResult.success) {
          return NextResponse.json(
            {
              error: salesResult.error || 'Sales Lead AI scoring failed.',
              execution_mode: 'error',
              is_simulated: false,
              model_invoked: false,
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          agent_id: agentId,
          task_type: taskType,
          output: salesResult.output,
          quote: salesResult.quote,
          execution_mode: 'live_ai',
          model_invoked: true,
          is_simulated: false,
          model_name: salesResult.model_name,
          saved_lead_id: salesResult.saved_lead_id,
          approval_id: salesResult.approval_id,
          conflicts_detected: salesResult.conflicts_detected,
          message: 'Genuinely generated with Google Gemini AI grounded in verified KRIA TECH manufacturing parameters and pricing matrix',
        });
      }

      case 'competitor-agent': {
        const competitorResult = await executeCompetitorAgent({
          competitor_name: body.competitor_name || (typeof input === 'string' && input.trim() ? input.trim() : undefined),
          target_category: body.target_category || body.category,
          sku: body.sku,
          product_name: body.product_name,
          website_url: body.website_url,
          topic_or_prompt: body.topic_or_prompt || (typeof input === 'string' ? input : undefined),
          actor_email: session.email,
        });

        if (!competitorResult.success) {
          return NextResponse.json(
            {
              error: competitorResult.error || 'Competitor Intelligence AI analysis failed.',
              execution_mode: 'error',
              is_simulated: false,
              model_invoked: false,
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          agent_id: agentId,
          task_type: taskType,
          output: competitorResult.output,
          execution_mode: 'live_ai',
          model_invoked: true,
          is_simulated: false,
          model_name: competitorResult.model_name,
          saved_report_id: competitorResult.saved_report_id,
          approval_id: competitorResult.approval_id,
          conflicts_detected: competitorResult.conflicts_detected,
          message: 'Genuinely generated with Google Gemini AI grounded in verified KRIA TECH manufacturing parameters and market benchmark standards',
        });
      }

      case 'website-agent': {
        const auditTargetUrl = body.target_url || (typeof input === 'string' && input.startsWith('http') ? input.trim() : undefined) || 'https://kriatech.com/products/acrylic-frames';
        const auditResult = await executeWebsiteAuditAgent({
          target_url: auditTargetUrl,
          product_name: body.product_name,
          sku: body.sku,
          topic_or_prompt: body.topic_or_prompt || (typeof input === 'string' && !input.startsWith('http') ? input : undefined),
          actor_email: session.email,
          mockHtml: body.mockHtml,
        });

        if (!auditResult.success) {
          return NextResponse.json(
            {
              error: auditResult.error || 'Website UX & SEO audit failed.',
              execution_mode: 'error',
              is_simulated: false,
              model_invoked: false,
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          agent_id: agentId,
          task_type: taskType,
          output: auditResult.output,
          measured_score: auditResult.measured_score,
          inspection_checks: auditResult.inspection_checks,
          execution_mode: 'live_ai',
          model_invoked: true,
          is_simulated: false,
          model_name: auditResult.model_name,
          saved_audit_id: auditResult.saved_audit_id,
          approval_id: auditResult.approval_id,
          conflicts_detected: auditResult.conflicts_detected,
          message: 'Genuinely audited with live HTML inspection, deterministic technical score calculation, and Google Gemini AI synthesis',
        });
      }

      case 'business-analyst': {
        if (body.simulate === true || body.task_type === 'simulation') {
          const rawOutput = {
            executive_summary:
              'Strong wholesale demand for magnetic acrylic photo frames across corporate gifting and wedding studios. CRM lead qualification rate is healthy at 42%.',
            pipeline_health: 'Healthy pipeline with high concentration in Qualified and Negotiation stages.',
            top_demanded_products: [
              'Clear Magnetic Acrylic Photo Frame (5x7 inch)',
              'Large Magnetic Acrylic Photo Block (8x10 inch)',
              'Custom Sublimation Acrylic Keychains (Bulk)',
            ],
            identified_bottlenecks: [
              '48-hour follow-up delay between Quotation Sent and Negotiation stages.',
              'Need faster physical sample dispatch tracking for wholesale leads.',
            ],
            recommended_growth_actions: [
              'Automate 24-hour WhatsApp follow-up reminders in CRM.',
              'Focus Q4 ad campaign specifically on wedding photography studio hampers.',
            ],
            reasoning_summary:
              'Synthesized lead conversion rates, product catalog volume, and current pipeline distribution into high-leverage growth priorities.',
            sources: ['KRIA AI CRM Database', 'Product Demand Log'],
            verified_facts: [
              'Magnetic acrylic photo frames constitute 60%+ of high-value inquiries.',
            ],
            assumptions: ['Lead volumes will increase by 25% during wedding season.'],
          };
          validatedOutput = BusinessAnalystOutputSchema.parse(rawOutput);
          break;
        }

        const analystResult = await executeBusinessAnalystAgent({
          focus_area: body.focus_area,
          target_sku: body.sku || body.target_sku,
          topic_or_prompt: body.topic_or_prompt || (typeof input === 'string' && input !== 'synthesize_quarterly_metrics' ? input : undefined),
          actor_email: session.email,
        });

        if (!analystResult.success) {
          return NextResponse.json(
            {
              error: analystResult.error || 'Operations & Growth AI analysis failed.',
              execution_mode: 'error',
              is_simulated: false,
              model_invoked: false,
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          agent_id: agentId,
          task_type: taskType,
          output: analystResult.output,
          unit_economics: analystResult.unit_economics,
          pipeline_summary: analystResult.pipeline_summary,
          execution_mode: 'live_ai',
          model_invoked: true,
          is_simulated: false,
          model_name: analystResult.model_name,
          approval_id: analystResult.approval_id,
          message: 'Genuinely synthesized with live CRM database metrics, factory unit economics, and Google Gemini AI',
        });
      }
    }

    // Log the agent task run in activity logs
    await logActivity({
      entity_type: 'agent_task',
      entity_id: agentId,
      action: 'agent_executed',
      description: `${agent.name} executed task (${taskType}) with schema validation [execution_mode: hardcoded]`,
      actor_type: 'agent',
      actor_id: session.email || agentId,
    });

    const hasCredentials = Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);

    return NextResponse.json({
      success: true,
      agent_id: agentId,
      task_type: taskType,
      output: validatedOutput,
      execution_mode: 'hardcoded',
      is_simulated: true, // Always true until actual LLM model invocation occurs
      credentials_configured: hasCredentials,
      model_invoked: false,
      message: 'Generated via verified KRIA TECH deterministic parameter matrix (Simulated)',
    });
  } catch (error: any) {
    console.error('Agent execution error:', error);
    return NextResponse.json(
      { error: error.message || 'Agent task execution failed.' },
      { status: 500 }
    );
  }
}
