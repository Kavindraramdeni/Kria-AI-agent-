import { SalesAgentOutputSchema } from '@/lib/agents/schemas';
import { generateStructuredWithGemini } from '@/lib/ai/gemini-client';
import { PROMPT_INJECTION_DEFENSE } from '@/lib/agents/guardrails';
import { createClient } from '@/lib/supabase/server';
import { createApprovalRequest } from '@/lib/services/approvals';
import { createFollowUp } from '@/lib/services/follow-up-scheduler';
import { logActivity } from '@/lib/services/activity-logs';
import { calculateWholesaleQuote, QuoteCalculationResult } from '@/lib/services/pricing-engine';
import {
  validateProductClaims,
  resolveProductGrounding,
  ProductConflict,
} from '@/lib/services/product-grounding';
import { z } from 'zod';

export type SalesAgentOutput = z.infer<typeof SalesAgentOutputSchema>;

export interface SalesLeadAgentRequest {
  lead_id?: string;
  lead_name?: string;
  business_name?: string;
  phone?: string;
  email?: string;
  location?: string;
  sku?: string;
  quantity?: number;
  has_subscription?: boolean;
  budget?: number;
  source?: string;
  topic_or_prompt?: string;
  actor_email?: string;
}

export interface SalesLeadAgentResult {
  success: boolean;
  execution_mode: 'live_ai' | 'hardcoded' | 'error';
  model_invoked: boolean;
  is_simulated: boolean;
  model_name?: string;
  output?: SalesAgentOutput;
  quote?: QuoteCalculationResult;
  saved_lead_id?: string;
  approval_id?: string;
  conflicts_detected?: ProductConflict[];
  error?: string;
}

/**
 * Sales & CRM Lead Agent: Genuinely AI-Powered Qualification & Dynamic Quoting Engine
 * Combines deterministic wholesale pricing calculations with Gemini AI lead intent scoring,
 * follow-up strategy, and draft response messaging.
 */
export async function executeSalesLeadAgent(
  req: SalesLeadAgentRequest
): Promise<SalesLeadAgentResult> {
  // 1. Validate Input Against Forbidden Claims
  const allUserInputs = [
    req.lead_name,
    req.business_name,
    req.sku,
    req.topic_or_prompt,
    req.location,
  ]
    .filter(Boolean)
    .join(' ');

  const claimCheck = validateProductClaims(allUserInputs);
  if (!claimCheck.valid) {
    return {
      success: false,
      execution_mode: 'error',
      model_invoked: false,
      is_simulated: false,
      error: `Input rejected: Unsupported or false claims detected (${claimCheck.forbiddenClaimsFound.join(', ')}). Absolute durability claims such as 'never scratches' and unverified certifications are strictly prohibited.`,
    };
  }

  // 2. Resolve Product Grounding & Authoritative Pricing Quote
  const requestedSku = req.sku?.trim() || 'KRA-REC-0604';
  const quantity = typeof req.quantity === 'number' && req.quantity > 0 ? req.quantity : 50;
  const hasSubscription = Boolean(req.has_subscription);

  let quoteCalculation: QuoteCalculationResult;
  try {
    quoteCalculation = calculateWholesaleQuote({
      sku: requestedSku,
      quantity,
      hasSubscription,
    });
  } catch {
    // If specific SKU calculation fails, fall back to core 6x4 frame
    quoteCalculation = calculateWholesaleQuote({
      sku: 'KRA-REC-0604',
      quantity,
      hasSubscription,
    });
  }

  const grounding = resolveProductGrounding({
    sku: quoteCalculation.sku,
    topic_or_prompt: req.topic_or_prompt,
  });

  const { productName, sku, dimensions, verifiedSpecs, userProvidedClaims, conflicts } = grounding;

  // 3. Build Structured System Instruction and Grounded Prompt
  const systemInstruction = `
You are the official Sales & CRM Lead AI Agent for KRIA TECH, a precision acrylic fabrication company located in Hyderabad, India.
Your role is to evaluate incoming buyer inquiries, score purchase intent (0-100), classify priority, calculate exact quotations, and craft professional WhatsApp/Email quotation drafts.

CRITICAL SALES & QUOTATION CONSTRAINTS:
1. MATHEMATICAL PRICING INTEGRITY:
   - The authoritative factory pricing calculation engine has evaluated this order:
     * Product: ${quoteCalculation.product_name} (${quoteCalculation.sku})
     * Quantity: ${quoteCalculation.quantity} units
     * Tier Applied: ${quoteCalculation.tier_applied}
     * Below MOQ (< ${quoteCalculation.min_bulk_quantity} pcs): ${quoteCalculation.is_below_moq}
     * Effective Unit Price: ₹${quoteCalculation.effective_unit_price}
     * Final Total Amount: ₹${quoteCalculation.final_total_inr.toLocaleString()} (INR)
   - You MUST report these exact numbers in "recommended_quote" and in the "draft_response_message". DO NOT ALTER THE PRICES.
2. PRODUCT SPECIFICATION GROUNDING:
   - Reference only verified factory specifications:
${verifiedSpecs.map((s) => `     * ${s}`).join('\n')}
   - DO NOT claim "never scratches", "zero scratches", "100% scratch-proof", or "unbreakable". Use tempered descriptions like "flush-mounted magnet to minimize surface friction".
3. INTENT SCORING GUIDELINES:
   - High Volume / Above MOQ (>= 250 pcs): score 90-98, intent_tier: 'Ready to Buy', priority: 'urgent' or 'high'.
   - Medium Wholesale (50 - 249 pcs): score 80-89, intent_tier: 'Bulk Evaluator', priority: 'high'.
   - Below MOQ (< 50 pcs): score 50-75, intent_tier: 'Retail Curious', priority: 'medium' or 'low'. In response message, suggest the KRIA Demo Starter Kit (24 pcs for ₹999 all-inclusive) or storefront base pricing.
   - Vague / Non-commercial: score 30-49, intent_tier: 'Window Shopper', priority: 'low'.
4. OUTPUT REQUIREMENT:
   You must respond ONLY with a valid JSON object strictly matching this schema:
   {
     "reasoning_summary": string (minimum 10 characters detailing buyer intent score rationale),
     "sources": string[] (list of pricing matrices and factory specifications referenced),
     "verified_facts": string[] (minimum 1 item: verified pricing tier or product specification),
     "assumptions": string[] (payment terms, shipping destination, subscription status),
     "score": number (0 to 100 integer),
     "priority": "low" | "medium" | "high" | "urgent",
     "intent_tier": "Window Shopper" | "Retail Curious" | "Bulk Evaluator" | "Ready to Buy",
     "suggested_action": string (recommended next step for operations/sales representative),
     "suggested_follow_up_hours": number (recommended follow-up window in hours: 4, 12, 24, 48),
     "draft_response_message": string (polished, ready-to-dispatch WhatsApp or Email quotation message),
     "recommended_quote": {
       "sku": "${quoteCalculation.sku}",
       "quantity": ${quoteCalculation.quantity},
       "unit_price_inr": ${quoteCalculation.effective_unit_price},
       "total_inr": ${quoteCalculation.final_total_inr},
       "tier_applied": "${quoteCalculation.tier_applied}"
     }
   }

${PROMPT_INJECTION_DEFENSE}
`.trim();

  const promptParts: string[] = [
    `Evaluate incoming lead inquiry and generate quotation response for:`,
    `- Lead Name: ${req.lead_name || 'Prospective Buyer'}`,
    req.business_name ? `- Business / Studio: ${req.business_name}` : '',
    req.location ? `- Buyer Location: ${req.location}` : '',
    `- Inquired SKU: ${quoteCalculation.sku}`,
    `- Product Name: ${quoteCalculation.product_name}`,
    `- Order Quantity: ${quoteCalculation.quantity} units`,
    `- Minimum Bulk MOQ: ${quoteCalculation.min_bulk_quantity} units`,
    `- Active VIP Subscription: ${hasSubscription ? 'Yes (-₹2/pc discount applied)' : 'No'}`,
    `- Tier Unit Price: ₹${quoteCalculation.effective_unit_price}`,
    `- Total Quotation Amount: ₹${quoteCalculation.final_total_inr} INR`,
    req.budget ? `- Customer Target Budget: ₹${req.budget}` : '',
    req.topic_or_prompt ? `- Buyer Inquiry Notes: ${req.topic_or_prompt}` : '',
  ].filter(Boolean);

  if (conflicts.length > 0) {
    promptParts.push('- CONFLICT DIRECTIVE (Verified records override user claims):');
    for (const c of conflicts) {
      promptParts.push(`  * [${c.field}] Verified: "${c.verifiedValue}" | Overrides user request: "${c.userClaim}"`);
    }
  }

  promptParts.push('Provide accurate score, priority, and draft response message incorporating exact quotation math.');

  const userPrompt = promptParts.join('\n');

  // 4. Invoke Real Gemini Model
  let geminiResult;
  try {
    geminiResult = await generateStructuredWithGemini({
      prompt: userPrompt,
      systemInstruction,
      schema: SalesAgentOutputSchema,
    });
  } catch (err: any) {
    // Explicit provider error reporting — NEVER silently substitute mock data!
    return {
      success: false,
      execution_mode: 'error',
      model_invoked: false,
      is_simulated: false,
      error: `Gemini AI Lead Scoring Failed: ${err.message}`,
    };
  }

  if (!geminiResult || !geminiResult.data) {
    return {
      success: false,
      execution_mode: 'error',
      model_invoked: false,
      is_simulated: false,
      error: 'Gemini AI Lead Scoring failed to return structured data.',
    };
  }

  const generated = geminiResult.data;

  // 5. CRM Persistence in Supabase leads table
  let savedLeadId: string | undefined = req.lead_id;
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

      const calculatedStatus = quoteCalculation.is_below_moq
        ? 'new'
        : generated.score >= 80
        ? 'qualified'
        : 'contacted';

      if (req.lead_id) {
        // Update existing lead record
        const { error } = await supabase
          .from('leads')
          .update({
            priority: generated.priority,
            status: calculatedStatus,
            notes: `[AI Score: ${generated.score}/100 - ${generated.intent_tier}] ${generated.suggested_action}`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', req.lead_id);

        if (error) {
          console.warn('Supabase lead update warning:', error.message);
        }
      } else {
        // Insert new lead into CRM
        const { data, error } = await supabase
          .from('leads')
          .insert([
            {
              name: req.lead_name || 'Inquiry Contact',
              business_name: req.business_name || null,
              phone: req.phone || null,
              email: req.email || null,
              source: req.source || 'direct',
              product_interest: `${quoteCalculation.product_name} (${quoteCalculation.sku})`,
              quantity: quoteCalculation.quantity,
              budget: req.budget || quoteCalculation.final_total_inr,
              location: req.location || null,
              status: calculatedStatus,
              priority: generated.priority,
              notes: `[AI Lead Score: ${generated.score}/100 - ${generated.intent_tier}] ${generated.suggested_action}`,
              is_demo: false,
            },
          ])
          .select('id')
          .single();

        if (error) {
          console.warn('Supabase lead insert warning:', error.message);
        } else if (data) {
          savedLeadId = data.id;
        }
      }
    }
  } catch (persistErr: any) {
    console.error('Warning: Failed to sync lead into Supabase CRM:', persistErr);
  }

  // 6. Submit Quotation to Human Approval Queue
  //    R2 FIX: Store lead_id, phone_number, and email in metadata so the dispatcher
  //    can resolve the actual recipient instead of using a literal channel-name string.
  let approvalId: string | undefined;
  const resolvedPhone = req.phone || null;
  const resolvedEmail = req.email || null;

  // Determine the display destination for the approval card:
  // Use the real phone/email if available; otherwise fall back to a channel label.
  const resolvedDestination = resolvedPhone
    ? `whatsapp:${resolvedPhone}`
    : resolvedEmail
    ? `email:${resolvedEmail}`
    : 'whatsapp:+91-9392576792'; // KRIA Tech owner fallback

  try {
    const approvalRes = await createApprovalRequest({
      action_type: 'customer_message',
      title: `Quote Approval: ${req.lead_name || 'Lead'} (${quoteCalculation.quantity} pcs of ${quoteCalculation.product_name})`,
      proposed_content: {
        lead_name: req.lead_name || 'Prospective Buyer',
        business_name: req.business_name || null,
        // R2: Real contact info so dispatcher resolves recipient correctly
        lead_id: savedLeadId || req.lead_id || null,
        phone_number: resolvedPhone,
        email: resolvedEmail,
        sku: quoteCalculation.sku,
        product_name: quoteCalculation.product_name,
        quantity: quoteCalculation.quantity,
        unit_price_inr: quoteCalculation.effective_unit_price,
        total_inr: quoteCalculation.final_total_inr,
        tier_applied: quoteCalculation.tier_applied,
        score: generated.score,
        priority: generated.priority,
        intent_tier: generated.intent_tier,
        suggested_action: generated.suggested_action,
        draft_response_message: generated.draft_response_message,
        model_used: geminiResult.model,
      },
      destination: resolvedDestination,
      agent_id: 'sales-agent',
      lead_id: savedLeadId || req.lead_id || null,
      risk_level: 'medium',
      requested_by: req.actor_email || null,
    });

    if (approvalRes.success && approvalRes.data) {
      approvalId = approvalRes.data.id;
    }
  } catch (approvalErr: any) {
    console.error('Warning: Failed to route quote to Approval Gate:', approvalErr);
  }

  // R3: Create a durable follow-up record using suggested_follow_up_hours from AI output
  try {
    const followUpHours =
      typeof generated.suggested_follow_up_hours === 'number' &&
      generated.suggested_follow_up_hours > 0
        ? generated.suggested_follow_up_hours
        : 24;

    if (savedLeadId) {
      await createFollowUp({
        lead_id: savedLeadId,
        follow_up_hours: followUpHours,
        action_type: generated.suggested_action || 'sales_follow_up',
        notes: `AI-scheduled follow-up after quote dispatch. Score: ${generated.score}/100 (${generated.intent_tier}).`,
        approval_id: approvalId,
      });
    }
  } catch (followUpErr: any) {
    // Non-fatal: log but do not block the sales result
    console.warn('Warning: Failed to schedule follow-up:', followUpErr?.message);
  }

  // 7. Log Activity Trail
  await logActivity({
    entity_type: 'lead',
    entity_id: savedLeadId || quoteCalculation.sku,
    action: 'lead_scored_real_ai',
    description: `Sales Agent scored lead '${req.lead_name || 'Inquiry'}' (${generated.score}/100, ${generated.intent_tier}) for ${quoteCalculation.quantity} units of ${quoteCalculation.sku}`,
    actor_type: 'agent',
    actor_id: 'sales-agent',
    metadata: {
      sku: quoteCalculation.sku,
      quantity: quoteCalculation.quantity,
      score: generated.score,
      intent_tier: generated.intent_tier,
      tier_applied: quoteCalculation.tier_applied,
      total_inr: quoteCalculation.final_total_inr,
      approval_id: approvalId,
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
    quote: quoteCalculation,
    saved_lead_id: savedLeadId,
    approval_id: approvalId,
    conflicts_detected: conflicts,
  };
}
