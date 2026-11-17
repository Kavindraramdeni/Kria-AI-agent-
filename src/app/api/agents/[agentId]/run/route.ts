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
import { executeContentStudioAgent } from '@/lib/services/content-studio';
import { executeSEOStrategyAgent } from '@/lib/services/seo-strategy';

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
        const leadQty = typeof input === 'object' && input.quantity ? Number(input.quantity) : 50;
        const requestedSku = typeof input === 'object' && input.sku ? String(input.sku) : 'KRA-REC-0604';
        const hasSubscription = typeof input === 'object' ? Boolean(input.has_subscription) : false;

        // Use calculation engine for exact tier pricing
        let quoteCalculation;
        try {
          quoteCalculation = calculateWholesaleQuote({
            sku: requestedSku,
            quantity: leadQty,
            hasSubscription,
          });
        } catch {
          // Fallback to primary 6x4 magnet frame
          quoteCalculation = calculateWholesaleQuote({
            sku: 'KRA-REC-0604',
            quantity: leadQty,
            hasSubscription,
          });
        }

        const isBulk = !quoteCalculation.is_below_moq;
        const unitPrice = quoteCalculation.effective_unit_price;
        const totalAmount = quoteCalculation.final_total_inr;

        const rawOutput = {
          score: isBulk ? (leadQty >= 250 ? 95 : 90) : 65,
          priority: isBulk ? ('high' as const) : ('medium' as const),
          intent_tier: isBulk ? ('Bulk Evaluator' as const) : ('Retail Curious' as const),
          suggested_action: isBulk
            ? `Dispatch physical sample box and follow up via WhatsApp with confirmed ${quoteCalculation.tier_applied} quotation.`
            : `Order is below factory bulk MOQ (${quoteCalculation.min_bulk_quantity} pcs). Suggest Demo Starter Kit (24 pcs for ₹999) or storefront base pricing.`,
          suggested_follow_up_hours: isBulk ? 24 : 48,
          draft_response_message: isBulk
            ? `Hello! Thank you for your inquiry for ${leadQty} units of ${quoteCalculation.product_name}. Our Hyderabad factory wholesale rate for ${quoteCalculation.tier_applied} is ₹${unitPrice}/pc (Total: ₹${totalAmount.toLocaleString()}). Manufactured from 2mm monolithic cell-cast acrylic with grade N35 flush neodymium magnets.${hasSubscription ? ' Includes KRIA Subscription VIP discount (-₹2/pc).' : ''} Shall we proceed with dispatch?`
            : `Hello! For orders under ${quoteCalculation.min_bulk_quantity} units of ${quoteCalculation.product_name}, our storefront base price is ₹${unitPrice}/pc (Total: ₹${totalAmount.toLocaleString()}). For wholesale pricing, our factory MOQ starts at ${quoteCalculation.min_bulk_quantity} pcs, or you can order our KRIA Demo Starter Kit (24 pcs across 4 shapes for just ₹999 all-inclusive).`,
          recommended_quote: {
            sku: quoteCalculation.sku,
            quantity: leadQty,
            unit_price_inr: unitPrice,
            total_inr: totalAmount,
            tier_applied: quoteCalculation.tier_applied,
          },
          reasoning_summary: `Authoritative factory quote calculated using KRIA TECH pricing matrix for ${quoteCalculation.tier_applied}.${quoteCalculation.is_below_moq ? ' Flagged as below factory MOQ.' : ''}`,
          sources: ['KRIA TECH Hyderabad Wholesale Matrix 2026'],
          verified_facts: [
            `Manufacturer location: ${KRIA_TECH_MANUFACTURING_SPECS.location}`,
            `Material standard: ${KRIA_TECH_MANUFACTURING_SPECS.material} (${KRIA_TECH_MANUFACTURING_SPECS.optical_clarity})`,
            `Magnet spec: ${KRIA_TECH_MANUFACTURING_SPECS.magnet_spec}`,
            `Applied unit price: ₹${unitPrice} (${quoteCalculation.tier_applied})`,
          ],
          assumptions: [
            hasSubscription ? 'Customer holds active KRIA VIP Subscription.' : 'Customer does not hold KRIA VIP Subscription.',
            'Payment terms: 100% advance before dispatch on custom laser jobs.',
          ],
        };
        validatedOutput = SalesAgentOutputSchema.parse(rawOutput);
        break;
      }

      case 'competitor-agent': {
        const rawOutput = {
          competitor_name: 'Mass Market Acrylic Suppliers (Aggregators)',
          products_analyzed: [
            {
              product_name: 'Standard 4x6 Acrylic Frame',
              estimated_price: '₹599 - ₹699',
              thickness_spec: '12mm to 15mm extruded acrylic',
            },
          ],
          pricing_gap_vs_kria:
            'Competitors sell thinner 15mm extruded acrylic at ₹699. KRIA TECH direct factory price is ₹549 for 20mm premium cast acrylic, giving KRIA a 21% price advantage and superior thickness.',
          kria_competitive_advantages: [
            'Cast acrylic does not yellow or craze under UV exposure.',
            'Thicker 20mm cross section (10+10mm) provides self-standing stability without wobbling.',
            'Direct factory CO2 laser cutting eliminates middleman markup.',
          ],
          opportunities: [
            'Target interior stylists searching for "heavyweight executive acrylic block" who are dissatisfied with thin imported frames.',
          ],
          reasoning_summary:
            'Ethical public benchmarking comparing physical specifications (thickness, polymer grade) against market aggregators.',
          sources: ['Public Marketplace Listings', 'KRIA Material Testing Specs'],
          verified_facts: [
            'KRIA TECH uses 20mm total thickness for 4x6 and 24mm for 5x7.',
          ],
          assumptions: ['Aggregators rely on extruded acrylic imported in bulk.'],
        };
        validatedOutput = CompetitorAgentOutputSchema.parse(rawOutput);
        break;
      }

      case 'website-agent': {
        const rawOutput = {
          target_url: 'https://kriatech.com/products/acrylic-frames',
          page_title: 'Custom Acrylic Photo Frames | KRIA TECH',
          detected_issues: [
            {
              severity: 'high' as const,
              issue: 'Missing Product Schema markup for wholesale bulk pricing tiers.',
              fix: 'Add Schema.org AggregateOffer with priceRange specification.',
            },
            {
              severity: 'medium' as const,
              issue: 'Call-to-Action for B2B wholesale catalog inquiry is below the fold.',
              fix: 'Add floating "Request Wholesale Quote" sticky button on mobile viewport.',
            },
          ],
          seo_score: 84,
          mobile_ux_notes:
            'Page loads swiftly (1.2s on mobile), but high-res acrylic reflection images should use WebP formatting to conserve mobile data.',
          reasoning_summary:
            'Technical audit of product landing page focusing on B2B conversion optimization and mobile readability.',
          sources: ['Web Vitals Benchmarks', 'Search Console Guideline'],
          verified_facts: ['KRIA TECH existing website is separate from KRIA AI command center.'],
          assumptions: ['Current website runs on standard responsive layout.'],
        };
        validatedOutput = WebsiteAgentOutputSchema.parse(rawOutput);
        break;
      }

      case 'business-analyst': {
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
