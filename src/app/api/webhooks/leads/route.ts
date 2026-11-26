import { NextRequest, NextResponse } from 'next/server';
import { executeSalesLeadAgent } from '@/lib/services/sales-lead-agent';
import { advanceWorkflow, DEMO_WORKFLOW_RUNS } from '@/lib/workflows/b2b-bulk-order-workflow';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/services/rate-limit';
import { logActivity } from '@/lib/services/activity-logs';

export const dynamic = 'force-dynamic';

/**
 * Inbound Lead Ingestion Webhook for kriatech.in
 * Connects WhatsApp Order Generator, Contact Forms, and Storefront Inquiries directly to KRIA AI.
 * Automatically runs deterministic wholesale tier pricing and queues quotes to the Approval Center.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Check (Max 30 leads per minute per IP)
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local-client';
    const rateCheck = checkRateLimit(`inbound_lead_${clientIp}`, 30, 60);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded for lead ingestion. Please wait before retrying.',
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

    // 2. Secret Verification (if KRIA_INBOUND_WEBHOOK_SECRET is configured)
    const configuredSecret = process.env.KRIA_INBOUND_WEBHOOK_SECRET;
    if (configuredSecret && configuredSecret.trim() !== '') {
      const authHeader = req.headers.get('x-kria-webhook-secret') || req.headers.get('authorization');
      const providedSecret = authHeader?.replace(/^Bearer\s+/i, '').trim();

      if (providedSecret !== configuredSecret.trim()) {
        return NextResponse.json(
          { error: 'Unauthorized: Invalid or missing webhook secret.' },
          { status: 401 }
        );
      }
    }

    // 3. Parse and Validate Request Body
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Invalid payload: Request body must be a valid JSON object.' },
        { status: 400 }
      );
    }

    const {
      name,
      business_name,
      phone,
      email,
      sku,
      quantity,
      has_subscription,
      budget,
      location,
      notes,
      message,
      is_reply,
      reply_to_lead_id,
      source = 'kriatech_storefront',
    } = body;

    // Contact info requirement: at least phone or email or name must be present
    if (!phone && !email && !name && !reply_to_lead_id) {
      return NextResponse.json(
        { error: 'Validation failed: At least one of name, phone, or email is required.' },
        { status: 400 }
      );
    }

    let supabase: any = undefined;
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (process.env.NODE_ENV === 'test' || (supabaseUrl && !supabaseUrl.includes('placeholder'))) {
        supabase = createClient();
      }
    } catch {
      supabase = undefined;
    }

    // 3b. Inbound Customer Reply Tracking (Stage 4 -> Stage 5: awaiting_reply -> qualified)
    if (is_reply === true || reply_to_lead_id) {
      const replyText = message || notes || 'Customer replied to outreach.';
      let matchedLeadId: string | undefined = reply_to_lead_id;
      let matchedWorkflowId: string | undefined;

      // Check demo workflow runs first if in demo/test mode without DB match
      const demoRun = DEMO_WORKFLOW_RUNS.find(
        (r) =>
          r.current_stage === 'awaiting_reply' &&
          ((matchedLeadId && r.lead_id === matchedLeadId) ||
            (phone && r.metadata?.lead_input?.phone === phone) ||
            (email && r.metadata?.lead_input?.email === email))
      );
      if (demoRun) {
        matchedWorkflowId = demoRun.id;
        matchedLeadId = matchedLeadId || demoRun.lead_id || undefined;
      }

      if (supabase && typeof supabase.from === 'function') {
        try {
          if (!matchedLeadId && (phone || email)) {
            let leadQuery = supabase.from('leads').select('id');
            if (phone) leadQuery = leadQuery.eq('phone', phone);
            else if (email) leadQuery = leadQuery.eq('email', email);
            const { data: leadRow } = await leadQuery.maybeSingle?.() || { data: null };
            if (leadRow?.id) matchedLeadId = leadRow.id;
          }

          if (matchedLeadId && !matchedWorkflowId) {
            const { data: wfRow } =
              (await supabase
                .from('workflow_runs')
                .select('id')
                .eq('lead_id', matchedLeadId)
                .eq('current_stage', 'awaiting_reply')
                .maybeSingle?.()) || { data: null };
            if (wfRow?.id) matchedWorkflowId = wfRow.id;
          }

          if (matchedLeadId) {
            await supabase
              .from('approval_requests')
              .update({
                execution_state: 'customer_responded',
                customer_responded_at: new Date().toISOString(),
                customer_response: replyText,
              })
              .eq('lead_id', matchedLeadId);
          }
        } catch (replyErr: any) {
          console.warn('Reply lookup warning:', replyErr?.message);
        }
      }

      let advanceRes: any = null;
      if (matchedWorkflowId) {
        advanceRes = await advanceWorkflow(
          matchedWorkflowId,
          'qualified',
          {
            reply_message: replyText,
            sku: typeof sku === 'string' && sku.trim() ? sku.trim() : undefined,
            quantity: Number(quantity) > 0 ? Number(quantity) : undefined,
            budget: budget ? Number(budget) : undefined,
          },
          demoRun ? undefined : supabase
        );
      }

      await logActivity({
        entity_type: 'lead',
        entity_id: matchedLeadId || phone || email || 'unknown',
        action: 'inbound_customer_reply_tracked',
        description: `Inbound customer reply recorded${matchedWorkflowId ? ` and workflow ${matchedWorkflowId} advanced to qualified` : ''}.`,
        actor_type: 'system',
        actor_id: 'inbound-webhook',
        metadata: {
          lead_id: matchedLeadId,
          workflow_run_id: matchedWorkflowId,
          reply_message: replyText,
        },
      });

      return NextResponse.json(
        {
          success: true,
          reply_tracked: true,
          data: {
            lead_id: matchedLeadId || null,
            workflow_run_id: matchedWorkflowId || null,
            workflow_stage: advanceRes?.current_stage || null,
            execution_state: advanceRes?.execution_state || 'customer_responded',
          },
        },
        { status: 200 }
      );
    }

    // 3c. Strict SKU & Quantity Validation (No fabricated defaults)
    const targetSku = typeof sku === 'string' ? sku.trim() : '';
    if (!targetSku) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed: Explicit product SKU is required (e.g. KRA-SQU-0202, KRA-REC-0604, KRA-KIT-DEMO24).',
        },
        { status: 400 }
      );
    }

    const parsedQty = Number(quantity);
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed: Explicit positive quantity is required.',
        },
        { status: 400 }
      );
    }

    const validQuantity = parsedQty;
    const promptMessage = notes || message || `Inbound B2B wholesale inquiry from ${name || 'Buyer'} for ${validQuantity} units.`;

    // 4. Run Sales & CRM Lead Agent (Deterministic Pricing + Intent Qualification + Approval Gate)
    const agentResult = await executeSalesLeadAgent(
      {
        lead_name: name || 'Inquiry Contact',
        business_name: business_name || null,
        phone: phone || undefined,
        email: email || undefined,
        location: location || undefined,
        sku: targetSku,
        quantity: validQuantity,
        has_subscription: Boolean(has_subscription),
        budget: budget ? Number(budget) : undefined,
        source,
        topic_or_prompt: promptMessage,
        actor_email: 'system@kriatech.in',
      },
      supabase
    );

    if (!agentResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: agentResult.error || 'Sales agent rejected or failed to process inquiry.',
        },
        { status: 422 }
      );
    }

    if (!agentResult.saved_lead_id || !agentResult.approval_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Persistence error: Lead record or owner quote approval could not be created.',
        },
        { status: 500 }
      );
    }

    // 5. Log Activity Audit Trail
    await logActivity({
      entity_type: 'lead',
      entity_id: agentResult.saved_lead_id || targetSku,
      action: 'inbound_lead_webhook_processed',
      description: `Inbound lead from '${name || phone || email}' (${validQuantity} pcs of ${targetSku}) ingested via ${source}. Quote: ₹${agentResult.quote?.final_total_inr || 0}`,
      actor_type: 'system',
      actor_id: 'inbound-webhook',
      metadata: {
        source,
        sku: targetSku,
        quantity: validQuantity,
        saved_lead_id: agentResult.saved_lead_id,
        approval_id: agentResult.approval_id,
        quote_total: agentResult.quote?.final_total_inr,
      },
    });

    // 6. Return Structured Response
    return NextResponse.json(
      {
        success: true,
        message: 'Lead successfully ingested and processed by KRIA AI Sales Agent.',
        data: {
          lead_id: agentResult.saved_lead_id,
          approval_id: agentResult.approval_id,
          status: 'approval_pending',
          quote: agentResult.quote,
          intent_tier: agentResult.output?.intent_tier || 'wholesale_reseller',
          lead_score: agentResult.output?.score || 85,
          draft_response_message: agentResult.output?.draft_response_message,
        },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Fatal error in /api/webhooks/leads:', err);
    return NextResponse.json(
      { error: 'Internal Server Error', message: err?.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
