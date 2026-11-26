import { NextRequest, NextResponse } from 'next/server';
import { executeSalesLeadAgent } from '@/lib/services/sales-lead-agent';
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
      source = 'kriatech_storefront',
    } = body;

    // Contact info requirement: at least phone or email or name must be present
    if (!phone && !email && !name) {
      return NextResponse.json(
        { error: 'Validation failed: At least one of name, phone, or email is required.' },
        { status: 400 }
      );
    }

    const targetSku = typeof sku === 'string' ? sku.trim() : '';
    const parsedQty = Number(quantity);
    const validQuantity = Number.isFinite(parsedQty) && parsedQty > 0 ? parsedQty : null;

    if (!targetSku || validQuantity === null) {
      return NextResponse.json(
        {
          success: false,
          error: 'A valid product SKU and order quantity are required to create an accurate quotation.',
          required_fields: ['sku', 'quantity'],
        },
        { status: 422 }
      );
    }

    const promptMessage = notes || message || `Inbound B2B wholesale inquiry from ${name || 'Buyer'} for ${validQuantity} units.`;

    // 4. Run Sales & CRM Lead Agent (Deterministic Pricing + Intent Qualification + Approval Gate)
    const agentResult = await executeSalesLeadAgent({
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
    });

    if (!agentResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: agentResult.error || 'KRIA AI could not process this lead.',
          execution_mode: agentResult.execution_mode,
          model_invoked: agentResult.model_invoked,
        },
        { status: 502 }
      );
    }

    if (!agentResult.saved_lead_id || !agentResult.approval_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Lead analysis completed, but CRM persistence or quotation approval creation did not complete.',
          lead_saved: Boolean(agentResult.saved_lead_id),
          approval_created: Boolean(agentResult.approval_id),
        },
        { status: 503 }
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
          intent_tier: agentResult.output?.intent_tier,
          lead_score: agentResult.output?.score,
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
