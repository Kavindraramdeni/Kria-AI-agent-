import { ContentAgentOutputSchema } from '@/lib/agents/schemas';
import { generateStructuredWithGemini } from '@/lib/ai/gemini-client';
import { KRIA_CATALOG_VARIANTS, KRIA_TECH_MANUFACTURING_SPECS } from '@/lib/data/kria-catalog-matrix';
import { KRIA_MANUFACTURING_FACTS, PROMPT_INJECTION_DEFENSE } from '@/lib/agents/guardrails';
import { createClient } from '@/lib/supabase/server';
import { createApprovalRequest } from '@/lib/services/approvals';
import { logActivity } from '@/lib/services/activity-logs';
import { z } from 'zod';

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
  approval_id?: string;
  error?: string;
}

/**
 * Validates against unsupported or hallucinated product claims.
 */
export function validateProductClaims(text: string): { valid: boolean; forbiddenClaimsFound: string[] } {
  const forbiddenPatterns = [
    { pattern: /\b(bulletproof|bullet-proof)\b/i, name: 'bulletproof' },
    { pattern: /\b(iso[- ]?900[0-9]|iso[- ]?certified)\b/i, name: 'unverified ISO certification' },
    { pattern: /\b(aerospace|military[- ]?grade|titanium[- ]?infused)\b/i, name: 'unsupported military/aerospace claim' },
    { pattern: /\b(lifetime[- ]?warranty|10[- ]?year[- ]?warranty)\b/i, name: 'unsupported warranty claim' },
    { pattern: /\b(ce[- ]?certified|fda[- ]?approved)\b/i, name: 'unsupported regulatory certification' },
  ];

  const found: string[] = [];
  for (const { pattern, name } of forbiddenPatterns) {
    if (pattern.test(text)) {
      found.push(name);
    }
  }

  return {
    valid: found.length === 0,
    forbiddenClaimsFound: found,
  };
}

/**
 * Content Studio Agent: Genuinely AI-Powered Generation Engine
 * Uses Gemini API to generate structured content strictly grounded on factory facts.
 */
export async function executeContentStudioAgent(
  req: ContentGenerationRequest
): Promise<ContentGenerationResult> {
  // 1. Resolve and Validate Product Specifications
  const allUserInputs = [
    req.sku,
    req.product_name,
    req.topic_or_prompt,
    req.target_audience,
    req.tone,
    ...(req.verified_specs || []),
  ].filter(Boolean).join(' ');

  // Check if user is attempting to inject unsupported claims into prompt
  const claimCheck = validateProductClaims(allUserInputs);
  if (!claimCheck.valid) {
    return {
      success: false,
      execution_mode: 'error',
      model_invoked: false,
      is_simulated: false,
      error: `Input rejected: Unsupported or false product claims detected (${claimCheck.forbiddenClaimsFound.join(', ')}). KRIA AI strictly refuses to invent unverified factory certifications or physical capabilities.`,
    };
  }

  const query = allUserInputs.toLowerCase();

  // Lookup matching verified product
  const matchedKriaVariant = KRIA_CATALOG_VARIANTS.find(
    (p) =>
      p.sku.toLowerCase() === req.sku?.toLowerCase() ||
      query.includes(p.sku.toLowerCase()) ||
      query.includes(p.name.toLowerCase())
  );

  const matchedMapf = Object.entries(KRIA_MANUFACTURING_FACTS.products).find(
    ([sku, data]) =>
      sku.toLowerCase() === req.sku?.toLowerCase() ||
      query.includes(sku.toLowerCase()) ||
      query.includes(data.title.toLowerCase())
  );

  const productName =
    req.product_name ||
    matchedKriaVariant?.name ||
    matchedMapf?.[1].title ||
    'Minimal Acrylic Photo Magnet (3×3")';

  const sku = req.sku || matchedKriaVariant?.sku || matchedMapf?.[0] || 'KRA-SQU-0303';

  const dimensions =
    req.dimensions ||
    matchedKriaVariant?.dimensions ||
    matchedMapf?.[1].thickness ||
    '3 × 3 inches (2mm cell-cast acrylic with grade N35 flush neodymium magnet)';

  const verifiedSpecs = req.verified_specs || [
    '2mm monolithic cell-cast acrylic',
    '93% optical clarity with diamond-polished edges',
    'Grade N35 flush neodymium magnet that never scratches metallic surfaces',
    'High-definition moisture-sealed photo print core',
    'Manufactured in Hyderabad, Telangana, India',
  ];

  const contentType: ContentType = req.content_type || 'instagram_caption';
  const targetAudience = req.target_audience || 'Wedding return gifts, family portrait enthusiasts, modern home decor';
  const tone = req.tone || 'Minimalist, elegant, high craftsmanship, authentic Indian manufacturing';
  const language = req.language || 'English';

  // 2. Build Structured System Instruction and Grounded Prompt
  const systemInstruction = `
You are the official Content Studio AI Agent for KRIA TECH, a precision acrylic fabrication company located in Hyderabad, India.
Your role is to craft marketing copy, product descriptions, and social media captions that highlight the exceptional craft, clarity, and precision of KRIA products.

CRITICAL FACTUAL CONSTRAINTS:
1. Ground every claim on KRIA TECH verified manufacturing standards:
   - Materials: ${verifiedSpecs.join('; ')}.
   - Manufacturing base: ${KRIA_TECH_MANUFACTURING_SPECS.location}.
   - Optical transmission: 93% clarity, shatterproof, non-yellowing.
2. STRICT NEGATIVE CONSTRAINTS:
   - DO NOT invent certifications (e.g. ISO, CE, FDA, MIL-SPEC).
   - DO NOT claim bulletproof, unbreakable, or scratch-proof (use "scratch-resistant flush magnet").
   - DO NOT invent promotional discounts or warranty periods not provided in the prompt.
3. OUTPUT REQUIREMENT:
   You must respond ONLY with a valid JSON object strictly matching this schema:
   {
     "reasoning_summary": string (minimum 10 characters detailing content angle),
     "sources": string[] (list of specifications and factual sources used),
     "verified_facts": string[] (minimum 1 factual specification included),
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

  const userPrompt = `
Generate a ${contentType.replace('_', ' ')} for:
- Product Title: ${productName}
- SKU: ${sku}
- Dimensions: ${dimensions}
- Verified Specifications: ${verifiedSpecs.join(', ')}
- Target Audience: ${targetAudience}
- Desired Tone: ${tone}
- Language: ${language}
${req.topic_or_prompt ? `- Specific Prompt Guidance: ${req.topic_or_prompt}` : ''}

Ensure the output is 100% compliant with the JSON schema.
`.trim();

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
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (process.env.NODE_ENV === 'test' || (supabaseUrl && !supabaseUrl.includes('placeholder'))) {
      let supabase: any;
      try {
        supabase = createClient();
      } catch {
        const { createClient: createBrowserClient } = await import('@/lib/supabase/client');
        supabase = createBrowserClient();
      }

      const { data, error } = await supabase
        .from('content_items')
        .insert([
          {
            title: generated.title,
            content_type: generated.content_type,
            body: generated.body,
            target_audience: generated.target_audience,
            objective: `Content Studio AI generation for ${sku} (${productName})`,
            keywords: generated.keywords_used,
            suggested_cta: generated.suggested_cta,
            status: 'draft', // MUST remain draft per Requirement 9
            is_demo: false,
          },
        ])
        .select('id')
        .single();

      if (error) {
        console.warn('Supabase content_items insert warning:', error.message);
      } else if (data) {
        savedContentId = data.id;
      }
    }
  } catch (persistErr: any) {
    console.error('Warning: Failed to persist generated content in Supabase content_items:', persistErr);
    // Note: Generation succeeded from AI, but persistence threw an error
  }

  // 5. Submit Draft to Approval Queue (Human Gate Enforcement)
  let approvalId: string | undefined;
  try {
    const approvalRes = await createApprovalRequest({
      action_type: 'content_publish',
      title: `Publish Review: ${generated.title}`,
      proposed_content: {
        sku,
        product_name: productName,
        content_type: generated.content_type,
        body: generated.body,
        keywords: generated.keywords_used,
        suggested_cta: generated.suggested_cta,
        model_used: geminiResult.model,
      },
      destination:
        contentType === 'instagram_caption' || contentType === 'reels_script'
          ? 'Instagram / Social Feed'
          : 'KRIA TECH Storefront CMS',
      agent_id: 'content-agent',
      risk_level: 'medium',
      requested_by: req.actor_email || 'admin@kriatech.com',
    });

    if (approvalRes.success && approvalRes.data) {
      approvalId = approvalRes.data.id;
    }
  } catch (approvalErr: any) {
    console.error('Warning: Failed to route content to Approval Gate:', approvalErr);
  }

  // 6. Log Agent Task Activity
  await logActivity({
    entity_type: 'content_item',
    entity_id: savedContentId || sku,
    action: 'content_generated_real_ai',
    description: `Content Studio generated ${contentType} for ${sku} using live ${geminiResult.model}`,
    actor_type: 'agent',
    actor_id: 'content-agent',
    metadata: {
      sku,
      model: geminiResult.model,
      content_type: contentType,
      approval_id: approvalId,
    },
  });

  // 7. Return Honest Live AI Metadata
  return {
    success: true,
    execution_mode: 'live_ai',
    model_invoked: true,
    is_simulated: false,
    model_name: geminiResult.model,
    output: generated,
    saved_content_id: savedContentId,
    approval_id: approvalId,
  };
}
