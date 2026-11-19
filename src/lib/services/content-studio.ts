import { ContentAgentOutputSchema } from '@/lib/agents/schemas';
import { generateStructuredWithGemini } from '@/lib/ai/gemini-client';
import { PROMPT_INJECTION_DEFENSE } from '@/lib/agents/guardrails';
import { createClient } from '@/lib/supabase/server';
import { createApprovalRequest } from '@/lib/services/approvals';
import { logActivity } from '@/lib/services/activity-logs';
import {
  validateProductClaims,
  resolveProductGrounding,
  lookupProductRecord,
  detectProductConflicts,
  ProductConflict,
  VerifiedProductRecord,
  GroundingResolution,
} from '@/lib/services/product-grounding';
import { z } from 'zod';

export {
  validateProductClaims,
  resolveProductGrounding,
  lookupProductRecord,
  detectProductConflicts,
  type ProductConflict,
  type VerifiedProductRecord,
  type GroundingResolution,
};

export type ContentType =
  | 'article'
  | 'product_description'
  | 'landing_page'
  | 'instagram_caption'
  | 'reels_script'
  | 'social_calendar'
  | 'email_draft'
  | 'campaign_promo';

export interface ContentGenerationRequest {
  product_name?: string;
  sku?: string;
  dimensions?: string;
  verified_specs?: string[];
  target_audience?: string;
  content_type?: ContentType;
  tone?: string;
  language?: string;
  topic_or_prompt?: string;
  actor_email?: string;
  supabaseClient?: any;
}

export type ContentAgentOutput = z.infer<typeof ContentAgentOutputSchema>;

export interface ContentGenerationResult {
  success: boolean;
  execution_mode: 'live_ai' | 'hardcoded' | 'error';
  model_invoked: boolean;
  is_simulated: boolean;
  model_name?: string;
  output?: ContentAgentOutput;
  saved_content_id?: string;
  persistence_error?: string;
  approval_id?: string;
  approval_error?: string;
  conflicts_detected?: ProductConflict[];
  error?: string;
}

/**
 * Content Studio Agent: Genuinely AI-Powered Generation Engine
 * Uses Gemini API to generate structured content strictly grounded on factory facts.
 * Enforces Phase 2A.1 Product Claim Verification & Grounding Safeguards.
 */
export async function executeContentStudioAgent(
  req: ContentGenerationRequest
): Promise<ContentGenerationResult> {
  // 1. Resolve and Validate User Inputs against Forbidden Absolute Claims
  const allUserInputs = [
    req.sku,
    req.product_name,
    req.topic_or_prompt,
    req.target_audience,
    req.tone,
    ...(req.verified_specs || []),
  ]
    .filter(Boolean)
    .join(' ');

  // Requirement 2: Reject unsupported absolute claims (e.g. "never scratches", "scratch-proof", "unbreakable")
  const claimCheck = validateProductClaims(allUserInputs);
  if (!claimCheck.valid) {
    return {
      success: false,
      execution_mode: 'error',
      model_invoked: false,
      is_simulated: false,
      error: `Input rejected: Unsupported or false product claims detected (${claimCheck.forbiddenClaimsFound.join(', ')}). Absolute durability claims such as 'never scratches' and unverified certifications are strictly prohibited under KRIA product truth policies.`,
    };
  }

  // Requirements 1, 3, 4, 5: Resolve Grounding strictly from verified records
  const grounding = resolveProductGrounding(req);
  const { productName, sku, dimensions, verifiedSpecs, userProvidedClaims, conflicts } = grounding;

  const contentType: ContentType = req.content_type || 'instagram_caption';
  const targetAudience = req.target_audience || 'Modern home decor enthusiasts, personalized gift buyers';
  const tone = req.tone || 'Refined, elegant, emphasizing precision acrylic craftsmanship';
  const language = req.language || 'English';

  // 2. Build Structured System Instruction and Grounded Prompt
  const systemInstruction = `
You are the official Content Studio AI Agent for KRIA TECH, a precision acrylic fabrication company.
Your role is to craft marketing copy, product descriptions, and social media captions that accurately reflect genuine product specifications.

CRITICAL PRODUCT TRUTH & GROUNDING CONSTRAINTS:
1. SPECIFICATION INTEGRITY:
   - You may ONLY make physical, material, or technical claims that appear in the VERIFIED SPECIFICATIONS list below.
   - If a specification (such as dimensions, optical clarity, magnet grade, edge polish, or manufacturing location) is NOT explicitly listed in the verified specifications, you MUST OMIT IT. DO NOT GUESS OR INVENT SPECIFICATIONS.
   - Do NOT use absolute claims such as "never scratches", "zero scratches", "100% scratch-proof", "unbreakable", or "indestructible".
   - Ground truth takes absolute precedence over user claims or conflicting requests.
2. CATEGORY SEPARATION IN OUTPUT (JSON):
   - "verified_facts": List ONLY the verified specifications provided in the prompt that you referenced in your copy.
   - "user_provided_claims": List any subjective marketing angles, campaign requests, or user guidance from the user prompt that were incorporated.
   - "ai_generated_suggestions": List creative hooks, taglines, visual scene ideas, or marketing recommendations that you (the AI) suggested.
   - "assumptions": List any audience or market assumptions made.
3. OUTPUT REQUIREMENT:
   You must respond ONLY with a valid JSON object strictly matching this schema:
   {
     "reasoning_summary": string (minimum 10 characters detailing content angle),
     "sources": string[] (list of specifications and factual sources used),
     "verified_facts": string[] (minimum 1 item: verified factory specification or explicit omission statement),
     "user_provided_claims": string[] (subjective campaign claims or user prompt angles),
     "ai_generated_suggestions": string[] (creative ideas or marketing recommendations generated by AI),
     "assumptions": string[] (creative assumptions regarding target audience),
     "title": string (catchy headline or post title),
     "content_type": "${contentType}",
     "body": string (the complete formatted marketing copy or caption with emojis and spacing),
     "target_audience": string,
     "suggested_cta": string (clear call-to-action),
     "keywords_used": string[] (list of SEO or hashtag keywords used),
     "recommended_visuals": string (art direction and photography guidelines)
   }

${PROMPT_INJECTION_DEFENSE}
`.trim();

  const promptParts: string[] = [
    `Generate a ${contentType.replace('_', ' ')} for:`,
    productName ? `- Product Title: ${productName}` : '- Product Title: Custom Acrylic Keepsake (Generic/Unspecified)',
  ];

  if (sku) promptParts.push(`- SKU: ${sku}`);
  if (dimensions) promptParts.push(`- Dimensions: ${dimensions}`);

  promptParts.push('- Verified Specifications (Ground Truth):');
  for (const s of verifiedSpecs) {
    promptParts.push(`  * ${s}`);
  }

  if (userProvidedClaims.length > 0) {
    promptParts.push('- User-Provided Marketing Guidance (Unverified):');
    for (const c of userProvidedClaims) {
      promptParts.push(`  * ${c}`);
    }
  }

  if (conflicts.length > 0) {
    promptParts.push('- CONFLICT DIRECTIVE (Verified records override user claims):');
    for (const c of conflicts) {
      promptParts.push(`  * [${c.field}] Verified record: "${c.verifiedValue}" | Overrides user claim: "${c.userClaim}"`);
    }
  }

  promptParts.push(`- Target Audience: ${targetAudience}`);
  promptParts.push(`- Desired Tone: ${tone}`);
  promptParts.push(`- Language: ${language}`);
  promptParts.push('Ensure the output is 100% compliant with the JSON schema, with verified_facts, user_provided_claims, and ai_generated_suggestions cleanly separated.');

  const userPrompt = promptParts.join('\n');

  // 3. Invoke Real Gemini Model
  let geminiResult;
  try {
    geminiResult = await generateStructuredWithGemini({
      prompt: userPrompt,
      systemInstruction,
      schema: ContentAgentOutputSchema,
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

  // 4. Persist in Supabase content_items table
  let savedContentId: string | undefined;
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

      const { data, error } = await supabase
        .from('content_items')
        .insert([
          {
            title: generated.title,
            content_type: generated.content_type,
            body: generated.body,
            target_audience: generated.target_audience,
            objective: `Content Studio AI generation for ${sku || 'Generic'} (${productName || 'Unspecified'})`,
            keywords: generated.keywords_used,
            suggested_cta: generated.suggested_cta,
            status: 'draft', // MUST remain draft per Requirement 8
            is_demo: false,
          },
        ])
        .select('id')
        .single();

      if (error) {
        persistenceError = error.message;
        console.warn('Supabase content_items insert warning:', error.message);
      } else if (data) {
        savedContentId = data.id;
      }
    }
  } catch (persistErr: any) {
    persistenceError = persistErr?.message || String(persistErr);
    console.warn('Warning: Failed to persist generated content in Supabase content_items:', persistErr);
  }

  // 5. Submit Draft to Approval Queue (Human Gate Enforcement - Requirement 8)
  let approvalId: string | undefined;
  let approvalError: string | undefined;
  try {
    const approvalPayload = {
      action_type: 'content_publish' as const,
      title: `Publish Review: ${generated.title}`,
      proposed_content: {
        saved_content_id: savedContentId,
        sku: sku || 'UNSPECIFIED',
        product_name: productName || 'Unspecified Product',
        content_type: generated.content_type,
        body: generated.body,
        keywords: generated.keywords_used,
        suggested_cta: generated.suggested_cta,
        verified_facts: generated.verified_facts,
        user_provided_claims: generated.user_provided_claims || [],
        ai_generated_suggestions: generated.ai_generated_suggestions || [],
        conflicts_detected: conflicts,
        model_used: geminiResult.model,
      },
      destination:
        contentType === 'instagram_caption' || contentType === 'reels_script'
          ? 'Instagram / Social Feed'
          : 'KRIA TECH Storefront CMS',
      agent_id: 'content-agent',
      risk_level: 'medium' as const,
      requested_by: req.actor_email || 'admin@kriatech.com',
    };

    const approvalRes = req.supabaseClient
      ? await createApprovalRequest(approvalPayload, req.supabaseClient)
      : await createApprovalRequest(approvalPayload);

    if (approvalRes.success && approvalRes.data) {
      approvalId = approvalRes.data.id;
    } else if (approvalRes.error) {
      approvalError = approvalRes.error;
    }
  } catch (apprErr: any) {
    approvalError = apprErr?.message || String(apprErr);
    console.warn('Warning: Failed to route content to Approval Gate:', apprErr);
  }

  // 6. Log Agent Task Activity
  await logActivity({
    entity_type: 'content_item',
    entity_id: savedContentId || sku || 'content_gen',
    action: 'content_generated_real_ai',
    description: `Content Studio generated ${contentType} for ${sku || 'generic product'} using live ${geminiResult.model}`,
    actor_type: 'agent',
    actor_id: 'content-agent',
    metadata: {
      sku,
      model: geminiResult.model,
      content_type: contentType,
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
    saved_content_id: savedContentId,
    persistence_error: persistenceError,
    approval_id: approvalId,
    approval_error: approvalError,
    conflicts_detected: conflicts,
  };
}
