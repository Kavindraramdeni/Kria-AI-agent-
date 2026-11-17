import { CompetitorAgentOutputSchema } from '@/lib/agents/schemas';
import { generateStructuredWithGemini } from '@/lib/ai/gemini-client';
import { PROMPT_INJECTION_DEFENSE } from '@/lib/agents/guardrails';
import { createClient } from '@/lib/supabase/server';
import { createApprovalRequest } from '@/lib/services/approvals';
import { logActivity } from '@/lib/services/activity-logs';
import { calculateWholesaleQuote, QuoteCalculationResult } from '@/lib/services/pricing-engine';
import {
  validateProductClaims,
  resolveProductGrounding,
  ProductConflict,
} from '@/lib/services/product-grounding';
import { z } from 'zod';

export type CompetitorAgentOutput = z.infer<typeof CompetitorAgentOutputSchema>;

export interface CompetitorAnalysisRequest {
  competitor_name?: string;
  target_category?: string;
  sku?: string;
  product_name?: string;
  website_url?: string;
  topic_or_prompt?: string;
  actor_email?: string;
  supabaseClient?: any;
}

export interface CompetitorAnalysisResult {
  success: boolean;
  execution_mode: 'live_ai' | 'hardcoded' | 'error';
  model_invoked: boolean;
  is_simulated: boolean;
  model_name?: string;
  output?: CompetitorAgentOutput;
  saved_report_id?: string;
  approval_id?: string;
  conflicts_detected?: ProductConflict[];
  error?: string;
}

/**
 * Competitor Intelligence Agent: Genuinely AI-Powered Market Benchmarking Engine
 * Combines verified KRIA factory manufacturing specifications and wholesale pricing matrices
 * with Google Gemini AI to analyze market gaps, thickness differentials, and competitive positioning.
 */
export async function executeCompetitorAgent(
  req: CompetitorAnalysisRequest
): Promise<CompetitorAnalysisResult> {
  // 1. Resolve and Validate User Inputs against Forbidden Claims
  const allUserInputs = [
    req.competitor_name,
    req.target_category,
    req.sku,
    req.product_name,
    req.website_url,
    req.topic_or_prompt,
  ]
    .filter(Boolean)
    .join(' ');

  // Reject unsupported absolute claims (e.g. "never scratches", "100% scratch-proof", "unbreakable")
  const claimCheck = validateProductClaims(allUserInputs);
  if (!claimCheck.valid) {
    return {
      success: false,
      execution_mode: 'error',
      model_invoked: false,
      is_simulated: false,
      error: `Input rejected: Unsupported or false claims detected (${claimCheck.forbiddenClaimsFound.join(', ')}). Absolute durability claims such as 'never scratches' and unverified certifications are strictly prohibited under KRIA product truth policies.`,
    };
  }

  // 2. Resolve Product Grounding & Authoritative Pricing Benchmarks
  // Determine target product based on category, prompt, or SKU
  let targetSku = req.sku?.trim().toUpperCase();
  const lowerPrompt = (req.topic_or_prompt || '').toLowerCase();
  const lowerCat = (req.target_category || '').toLowerCase();

  if (!targetSku) {
    if (lowerPrompt.includes('tabletop') || lowerPrompt.includes('desk') || lowerPrompt.includes('block') || lowerCat.includes('tabletop') || lowerCat.includes('block')) {
      targetSku = 'MAPF-0406-CL';
    } else if (lowerPrompt.includes('keychain') || lowerCat.includes('keychain')) {
      targetSku = 'KRA-KEY-CIR25';
    } else if (lowerPrompt.includes('starter') || lowerPrompt.includes('sample') || lowerCat.includes('starter')) {
      targetSku = 'KRA-KIT-DEMO24';
    } else {
      targetSku = 'KRA-REC-0604';
    }
  }

  const grounding = resolveProductGrounding({
    sku: targetSku,
    product_name: req.product_name,
    topic_or_prompt: req.topic_or_prompt,
  });

  const { productName, sku, dimensions, verifiedSpecs, conflicts } = grounding;

  // Retrieve deterministic factory quote / pricing baseline
  let quoteCalculation: QuoteCalculationResult | null = null;
  try {
    quoteCalculation = calculateWholesaleQuote({
      sku: sku || 'KRA-REC-0604',
      quantity: 100, // Standard benchmark comparison tier
      hasSubscription: false,
    });
  } catch {
    // Graceful fallback for non-tiered items
    quoteCalculation = null;
  }

  const competitorTarget = req.competitor_name?.trim() || 'Mass Market Acrylic Suppliers (Aggregators)';

  // 3. Build Structured System Instruction and Grounded Prompt
  const systemInstruction = `
You are the official Competitor Intelligence AI Agent for KRIA TECH, a precision acrylic fabrication company located in Hyderabad, India.
Your role is to formulate ethical, evidence-based competitive benchmarking reports, analyzing physical product specifications, pricing gaps, and market opportunities.

CRITICAL COMPETITIVE BENCHMARKING & TRUTH CONSTRAINTS:
1. ETHICAL PUBLIC INTELLIGENCE GUARDRAIL:
   - Rely strictly on publicly verifiable market knowledge, marketplace listing standards (e.g. Amazon India, IndiaMART, mass aggregators), and physical polymer fabrication science.
   - NEVER invent fake corporate internal documents, claim unauthorized scraping, or pretend to access confidential competitor systems.
   - List verifiable public sources in "sources" (e.g. "Public Marketplace Listings", "Amazon India Acrylic Category Benchmark", "IndiaMART B2B Aggregators", "KRIA Material Testing Specs").
2. GROUNDING ON VERIFIED KRIA TECH FACTORY SPECIFICATIONS:
   - KRIA TECH's benchmark product is: ${productName} (${sku}).
   - Verified factory specifications:
${verifiedSpecs.map((s) => `     * ${s}`).join('\n')}
   - Authoritative factory pricing:
${
  quoteCalculation
    ? `     * Storefront Base Price: ₹${quoteCalculation.base_unit_price}
     * Wholesale Tier (100 units): ₹${quoteCalculation.effective_unit_price} / unit (₹${quoteCalculation.final_total_inr.toLocaleString()} total)
     * MOQ: ${quoteCalculation.min_bulk_quantity} units`
    : `     * Direct factory fabrication pricing.`
}
   - NEVER contradict these verified specifications. DO NOT claim "never scratches" or "scratch-proof".
3. REALISTIC MARKET BENCHMARK STANDARDS:
   - Mass market aggregators & imported competitors typically supply:
     * Acrylic Fridge Magnets: Thin 1.0mm - 1.5mm extruded polystyrene or cheap acrylic that warps/scratches easily; cheap glued ceramic ferrite magnets that protrude and scratch refrigerators. Retail price: ₹180 - ₹249 per piece; wholesale: ₹110 - ₹130.
     * Tabletop Photo Blocks: 12mm to 15mm extruded acrylic with saw-cut or diamond-less edges, lower light transmission (~85%), prone to UV yellowing. Retail: ₹599 - ₹799.
     * Keychains: 1.5mm snap-in plastic with loose jump rings. Bulk: ₹45 - ₹60.
   - KRIA TECH Direct Factory Edge:
     * Monolithic 2mm virgin cell-cast acrylic with 93% optical clarity (non-yellowing, UV-stable).
     * Flush countersunk rare-earth N35 neodymium magnets (zero protrusion, prevents metal surface scratches).
     * Tabletop blocks: 20mm (10+10mm) solid cast acrylic with diamond-polished edges (MAPF-0406-CL).
     * Direct Hyderabad manufacturing facility eliminating 3 levels of middleman distributor markups.
4. OUTPUT REQUIREMENT:
   You must respond ONLY with a valid JSON object strictly matching this schema:
   {
     "reasoning_summary": string (minimum 10 characters detailing competitive analysis methodology and data synthesis),
     "sources": string[] (list of public data sources and factory specifications),
     "verified_facts": string[] (minimum 1 item: verified KRIA factory specs or pricing metrics),
     "assumptions": string[] (assumptions regarding competitor supply chain, shipping costs, or distribution markups),
     "competitor_name": string (name of competitor or market segment analyzed),
     "products_analyzed": [
       {
         "product_name": string (competitor product title),
         "estimated_price": string (price range in INR e.g. "₹599 - ₹699"),
         "thickness_spec": string (physical specification e.g. "12mm to 15mm extruded acrylic")
       }
     ],
     "pricing_gap_vs_kria": string (concise quantitative summary of pricing and thickness advantage),
     "kria_competitive_advantages": string[] (array of distinct verified factory advantages),
     "opportunities": string[] (array of actionable positioning, marketing, or sales opportunities)
   }

${PROMPT_INJECTION_DEFENSE}
`.trim();

  const promptParts: string[] = [
    `Perform competitor intelligence benchmark and pricing gap analysis for:`,
    `- Target Competitor / Segment: ${competitorTarget}`,
    req.target_category ? `- Target Category: ${req.target_category}` : '',
    `- KRIA Benchmark SKU: ${sku}`,
    `- KRIA Benchmark Product: ${productName}`,
    dimensions ? `- KRIA Dimensions / Thickness: ${dimensions}` : '',
    quoteCalculation
      ? `- KRIA Factory Pricing: Retail/Base ₹${quoteCalculation.base_unit_price}, Wholesale 100-tier ₹${quoteCalculation.effective_unit_price}/unit`
      : '',
    req.website_url ? `- Reference Competitor URL: ${req.website_url}` : '',
    req.topic_or_prompt ? `- Specific Focus / User Notes: ${req.topic_or_prompt}` : '',
  ].filter(Boolean);

  if (conflicts.length > 0) {
    promptParts.push('- CONFLICT DIRECTIVE (Verified records override user claims):');
    for (const c of conflicts) {
      promptParts.push(`  * [${c.field}] Verified: "${c.verifiedValue}" | Overrides user request: "${c.userClaim}"`);
    }
  }

  promptParts.push('Provide comprehensive comparison of physical specifications (acrylic grade, thickness, magnet mounting), pricing gap, and KRIA direct factory advantages.');

  const userPrompt = promptParts.join('\n');

  // 4. Invoke Real Gemini Model
  let geminiResult;
  try {
    geminiResult = await generateStructuredWithGemini({
      prompt: userPrompt,
      systemInstruction,
      schema: CompetitorAgentOutputSchema,
    });
  } catch (err: any) {
    // Explicit provider error reporting — NEVER silently substitute mock data!
    return {
      success: false,
      execution_mode: 'error',
      model_invoked: false,
      is_simulated: false,
      error: `Gemini AI Competitor Analysis Failed: ${err.message}`,
    };
  }

  if (!geminiResult || !geminiResult.data) {
    return {
      success: false,
      execution_mode: 'error',
      model_invoked: false,
      is_simulated: false,
      error: 'Gemini AI Competitor Analysis failed to return structured data.',
    };
  }

  const generated = geminiResult.data;

  // 5. Database Persistence in Supabase competitor_reports table
  let savedReportId: string | undefined;
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (process.env.NODE_ENV === 'test' || (supabaseUrl && !supabaseUrl.includes('placeholder'))) {
      let supabase: any = req.supabaseClient;
      if (!supabase) {
        try {
          supabase = createClient();
        } catch {
          const { createClient: createBrowserClient } = await import('@/lib/supabase/client');
          supabase = createBrowserClient();
        }
      }

      const { data, error } = await supabase
        .from('competitor_reports')
        .insert([
          {
            competitor_name: generated.competitor_name,
            website_url: req.website_url || null,
            products_analyzed: generated.products_analyzed,
            pricing_analysis: {
              pricing_gap_vs_kria: generated.pricing_gap_vs_kria,
              kria_advantages: generated.kria_competitive_advantages,
            },
            seo_opportunities: generated.opportunities,
            source_urls: generated.sources,
            research_date: new Date().toISOString().split('T')[0],
            is_demo: false,
          },
        ])
        .select('id')
        .single();

      if (error) {
        console.warn('Supabase competitor_reports insert warning:', error.message);
      } else if (data) {
        savedReportId = data.id;
      }
    }
  } catch (persistErr: any) {
    console.error('Warning: Failed to persist report in Supabase competitor_reports:', persistErr);
  }

  // 6. Submit Strategic Action to Approval Queue (Human Gate Enforcement)
  let approvalId: string | undefined;
  try {
    const approvalPayload = {
      action_type: 'campaign_launch' as const,
      title: `Competitor Positioning & Market Strategy: ${generated.competitor_name}`,
      proposed_content: {
        competitor_name: generated.competitor_name,
        target_sku: sku,
        products_analyzed: generated.products_analyzed,
        pricing_gap_vs_kria: generated.pricing_gap_vs_kria,
        kria_competitive_advantages: generated.kria_competitive_advantages,
        opportunities: generated.opportunities,
        reasoning_summary: generated.reasoning_summary,
        sources: generated.sources,
        verified_facts: generated.verified_facts,
        assumptions: generated.assumptions,
        model_used: geminiResult.model,
      },
      destination: `Market Strategy & Positioning Channels (Storefront & B2B Proposals)`,
      agent_id: 'competitor-agent',
      risk_level: 'low' as const,
      requested_by: req.actor_email || 'admin@kriatech.com',
    };

    const approvalRes = req.supabaseClient
      ? await createApprovalRequest(approvalPayload, req.supabaseClient)
      : await createApprovalRequest(approvalPayload);

    if (approvalRes.success && approvalRes.data) {
      approvalId = approvalRes.data.id;
    }
  } catch (approvalErr: any) {
    console.error('Warning: Failed to route competitor strategy to Approval Gate:', approvalErr);
  }

  // 7. Log Activity Trail
  await logActivity({
    entity_type: 'competitor_report',
    entity_id: savedReportId || generated.competitor_name,
    action: 'competitor_analyzed_real_ai',
    description: `Competitor Agent benchmarked '${generated.competitor_name}' against KRIA factory specifications using live ${geminiResult.model}`,
    actor_type: 'agent',
    actor_id: 'competitor-agent',
    metadata: {
      competitor_name: generated.competitor_name,
      model: geminiResult.model,
      products_count: generated.products_analyzed.length,
      pricing_gap: generated.pricing_gap_vs_kria,
      approval_id: approvalId,
      saved_report_id: savedReportId,
    },
  });

  // 8. Return Honest Live AI Metadata
  return {
    success: true,
    execution_mode: 'live_ai',
    model_invoked: true,
    is_simulated: false,
    model_name: geminiResult.model,
    output: generated,
    saved_report_id: savedReportId,
    approval_id: approvalId,
    conflicts_detected: conflicts,
  };
}
