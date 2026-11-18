import { SEOAgentOutputSchema } from '@/lib/agents/schemas';
import { generateStructuredWithGemini } from '@/lib/ai/gemini-client';
import { PROMPT_INJECTION_DEFENSE } from '@/lib/agents/guardrails';
import { createClient } from '@/lib/supabase/server';
import { createApprovalRequest } from '@/lib/services/approvals';
import { logActivity } from '@/lib/services/activity-logs';
import {
  validateProductClaims,
  resolveProductGrounding,
  ProductConflict,
} from '@/lib/services/product-grounding';
import { z } from 'zod';

export type SEOAgentOutput = z.infer<typeof SEOAgentOutputSchema>;

export interface SEOStrategyRequest {
  target_cluster?: string;
  product_name?: string;
  sku?: string;
  target_market?: string;
  target_audience?: string;
  topic_or_prompt?: string;
  actor_email?: string;
  supabaseClient?: any;
}

export interface SEOStrategyResult {
  success: boolean;
  execution_mode: 'live_ai' | 'hardcoded' | 'error';
  model_invoked: boolean;
  is_simulated: boolean;
  model_name?: string;
  output?: SEOAgentOutput;
  saved_keyword_ids?: string[];
  persistence_error?: string;
  approval_id?: string;
  approval_error?: string;
  conflicts_detected?: ProductConflict[];
  error?: string;
}

/**
 * SEO Strategy Agent: Genuinely AI-Powered Organic Search Engine
 * Uses Gemini API to generate grounded keyword clusters, intent mapping,
 * on-page recommendations, and gap analyses strictly verified against factory facts.
 */
export async function executeSEOStrategyAgent(
  req: SEOStrategyRequest
): Promise<SEOStrategyResult> {
  // 1. Resolve and Validate User Inputs against Forbidden Claims
  const allUserInputs = [
    req.target_cluster,
    req.sku,
    req.product_name,
    req.target_market,
    req.target_audience,
    req.topic_or_prompt,
  ]
    .filter(Boolean)
    .join(' ');

  // Reject unsupported absolute claims (e.g. "never scratches", "100% scratch-proof", "guaranteed #1 ranking")
  const claimCheck = validateProductClaims(allUserInputs);
  if (!claimCheck.valid) {
    return {
      success: false,
      execution_mode: 'error',
      model_invoked: false,
      is_simulated: false,
      error: `Input rejected: Unsupported or false claims detected (${claimCheck.forbiddenClaimsFound.join(', ')}). Absolute durability claims and unverified certifications are strictly prohibited under KRIA product truth policies.`,
    };
  }

  // Resolve Product Grounding strictly from verified records
  const grounding = resolveProductGrounding({
    sku: req.sku,
    product_name: req.product_name,
    topic_or_prompt: req.topic_or_prompt,
  });
  const { productName, sku, dimensions, verifiedSpecs, userProvidedClaims, conflicts } = grounding;

  const targetCluster =
    req.target_cluster ||
    (grounding.product ? grounding.product.category : undefined) ||
    'Magnetic Acrylic Photo Frames & Fridge Keepsakes';

  const targetMarket = req.target_market || 'Pan-India Wholesale & Personalized Retail';
  const targetAudience =
    req.target_audience ||
    'Wedding studio photographers, gift boutique retailers, event planners, and modern interior decorators';

  // 2. Build Structured System Instruction and Grounded Prompt
  const systemInstruction = `
You are the official SEO Strategy AI Agent for KRIA TECH, a precision acrylic fabrication company based in Hyderabad, India.
Your role is to formulate high-converting, intent-driven organic search strategies, keyword clusters, on-page optimization directives, and content gap analyses.

CRITICAL SEO & PRODUCT TRUTH CONSTRAINTS:
1. SPECIFICATION INTEGRITY:
   - Ground every keyword theme and on-page recommendation strictly on KRIA TECH verified manufacturing standards:
${verifiedSpecs.map((s) => `     * ${s}`).join('\n')}
   - DO NOT invent product specifications (e.g., do not claim N35 magnets for keychains, or 2mm thickness for MAPF blocks).
   - DO NOT use absolute claims such as "never scratches", "zero scratches", "100% scratch-proof", or "unbreakable".
2. TRUTH IN SEARCH VOLUMES (KRIA GUIDELINES):
   - In accordance with KRIA truth-in-data guidelines, search volumes MUST NOT be fabricated as if they were live Google Ads API measurements.
   - For volume_estimate, provide a conservative relative order-of-magnitude tier or null if unverified.
   - Categorize intent strictly into 'informational', 'navigational', 'commercial', or 'transactional'.
   - Prioritize high-intent commercial and wholesale keywords (e.g. bulk orders, sample kit inquiries, return gifts).
3. OUTPUT REQUIREMENT:
   You must respond ONLY with a valid JSON object strictly matching this schema:
   {
     "reasoning_summary": string (minimum 10 characters detailing strategy angle and buyer intent),
     "sources": string[] (list of specifications and factual sources referenced),
     "verified_facts": string[] (minimum 1 verified factory specification included),
     "assumptions": string[] (creative assumptions regarding buyer search behavior),
     "target_cluster": "${targetCluster}",
     "recommended_keywords": [
       {
         "keyword": string (lower case target search query),
         "volume_estimate": number or null (conservative relative volume tier or null),
         "intent": "informational" | "navigational" | "commercial" | "transactional",
         "target_page": string (e.g. "/products/magnetic-acrylic-frames", "/wholesale", "/products/acrylic-keychains"),
         "priority": "low" | "medium" | "high"
       }
     ],
     "on_page_recommendations": string[] (minimum 2 actionable on-page fixes: Title, H1, Schema markup, specs proof),
     "content_gap_analysis": string (detailed analysis of keyword and competitor gaps)
   }

${PROMPT_INJECTION_DEFENSE}
`.trim();

  const promptParts: string[] = [
    `Formulate a comprehensive organic search strategy and keyword cluster for:`,
    `- Target Cluster: ${targetCluster}`,
  ];

  if (productName) promptParts.push(`- Associated Product: ${productName}`);
  if (sku) promptParts.push(`- SKU: ${sku}`);
  if (dimensions) promptParts.push(`- Dimensions: ${dimensions}`);

  promptParts.push('- Verified Product Specifications:');
  for (const s of verifiedSpecs) {
    promptParts.push(`  * ${s}`);
  }

  if (userProvidedClaims.length > 0) {
    promptParts.push('- User Campaign Notes (Unverified):');
    for (const c of userProvidedClaims) {
      promptParts.push(`  * ${c}`);
    }
  }

  if (conflicts.length > 0) {
    promptParts.push('- CONFLICT DIRECTIVE (Verified records override user claims):');
    for (const c of conflicts) {
      promptParts.push(`  * [${c.field}] Verified: "${c.verifiedValue}" | Overrides user request: "${c.userClaim}"`);
    }
  }

  promptParts.push(`- Target Market: ${targetMarket}`);
  promptParts.push(`- Target Audience: ${targetAudience}`);
  if (req.topic_or_prompt) {
    promptParts.push(`- Specific Strategy Guidance: ${req.topic_or_prompt}`);
  }

  promptParts.push('Ensure recommended_keywords has between 3 and 7 high-intent keywords, with accurate intent categorization and zero hallucinated specifications.');

  const userPrompt = promptParts.join('\n');

  // 3. Invoke Real Gemini Model
  let geminiResult;
  try {
    geminiResult = await generateStructuredWithGemini({
      prompt: userPrompt,
      systemInstruction,
      schema: SEOAgentOutputSchema,
    });
  } catch (err: any) {
    // Explicit provider error reporting — NEVER silently substitute mock data!
    return {
      success: false,
      execution_mode: 'error',
      model_invoked: false,
      is_simulated: false,
      error: `Gemini AI Generation Failed: ${err.message}`,
    };
  }

  if (!geminiResult || !geminiResult.data) {
    return {
      success: false,
      execution_mode: 'error',
      model_invoked: false,
      is_simulated: false,
      error: 'Gemini AI Generation failed to return structured data.',
    };
  }

  const generated = geminiResult.data;

  // 4. Persist in Supabase seo_keywords table
  const savedKeywordIds: string[] = [];
  let persistenceError: string | undefined;
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

      if (generated.recommended_keywords && generated.recommended_keywords.length > 0) {
        const rowsToInsert = generated.recommended_keywords.map((kw) => ({
          keyword: kw.keyword.trim().toLowerCase(),
          search_intent: kw.intent,
          cluster: generated.target_cluster,
          priority: kw.priority,
          target_page: kw.target_page,
          status: 'targeted',
          verified_search_volume: kw.volume_estimate ?? null,
          source: 'gemini_seo_agent',
          is_demo: false,
        }));

        const { data, error } = await supabase
          .from('seo_keywords')
          .insert(rowsToInsert)
          .select('id');

        if (error) {
          persistenceError = error.message;
          console.warn('Supabase seo_keywords insert warning:', error.message);
        } else if (data) {
          data.forEach((r: { id: string }) => savedKeywordIds.push(r.id));
        }
      }
    }
  } catch (persistErr: any) {
    persistenceError = persistErr?.message || String(persistErr);
    console.warn('Warning: Failed to persist generated keywords in Supabase seo_keywords:', persistErr);
  }

  // 5. Submit On-Page Changes to Approval Queue (Human Gate Enforcement)
  let approvalId: string | undefined;
  let approvalError: string | undefined;
  try {
    const approvalRes = req.supabaseClient
      ? await createApprovalRequest({
          action_type: 'website_change',
          title: `SEO On-Page & Keyword Strategy: ${generated.target_cluster}`,
          proposed_content: {
            target_cluster: generated.target_cluster,
            recommended_keywords: generated.recommended_keywords,
            on_page_recommendations: generated.on_page_recommendations,
            content_gap_analysis: generated.content_gap_analysis,
            verified_facts: generated.verified_facts,
            conflicts_detected: conflicts,
            model_used: geminiResult.model,
          },
          destination: `KRIA Storefront Architecture (/seo & Target Pages)`,
          agent_id: 'seo-agent',
          risk_level: 'low',
          requested_by: req.actor_email || 'admin@kriatech.com',
        }, req.supabaseClient)
      : await createApprovalRequest({
          action_type: 'website_change',
          title: `SEO On-Page & Keyword Strategy: ${generated.target_cluster}`,
          proposed_content: {
            target_cluster: generated.target_cluster,
            recommended_keywords: generated.recommended_keywords,
            on_page_recommendations: generated.on_page_recommendations,
            content_gap_analysis: generated.content_gap_analysis,
            verified_facts: generated.verified_facts,
            conflicts_detected: conflicts,
            model_used: geminiResult.model,
          },
          destination: `KRIA Storefront Architecture (/seo & Target Pages)`,
          agent_id: 'seo-agent',
          risk_level: 'low',
          requested_by: req.actor_email || 'admin@kriatech.com',
        });

    if (approvalRes.success && approvalRes.data) {
      approvalId = approvalRes.data.id;
    } else if (approvalRes.error) {
      approvalError = approvalRes.error;
    }
  } catch (apprErr: any) {
    approvalError = apprErr?.message || String(apprErr);
    console.warn('Warning: Failed to route SEO strategy to Approval Gate:', apprErr);
  }

  // 6. Log Agent Task Activity
  await logActivity({
    entity_type: 'seo_keyword',
    entity_id: savedKeywordIds[0] || generated.target_cluster,
    action: 'seo_strategy_generated_real_ai',
    description: `SEO Agent formulated keyword strategy for cluster '${generated.target_cluster}' (${generated.recommended_keywords.length} keywords) using live ${geminiResult.model}`,
    actor_type: 'agent',
    actor_id: 'seo-agent',
    metadata: {
      target_cluster: generated.target_cluster,
      model: geminiResult.model,
      keywords_count: generated.recommended_keywords.length,
      approval_id: approvalId,
      conflicts_count: conflicts.length,
    },
  }, req.supabaseClient);

  // 7. Return Honest Live AI Metadata
  return {
    success: true,
    execution_mode: 'live_ai',
    model_invoked: true,
    is_simulated: false,
    model_name: geminiResult.model,
    output: generated,
    saved_keyword_ids: savedKeywordIds,
    persistence_error: persistenceError,
    approval_id: approvalId,
    approval_error: approvalError,
    conflicts_detected: conflicts,
  };
}
