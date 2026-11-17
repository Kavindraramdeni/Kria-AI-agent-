import { NextRequest, NextResponse } from 'next/server';
import { executeApprovedAction } from '@/lib/services/execution-dispatcher';
import { checkRateLimit } from '@/lib/services/rate-limit';

/**
 * POST /api/approvals/[id]/dispatch
 * Protected Server-Side Action Dispatch Endpoint
 * Strictly enforces single-use approval, role authorization, concurrency locking, and idempotency.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const approvalId = params.id;
    if (!approvalId) {
      return NextResponse.json(
        { error: 'Approval ID parameter is required.' },
        { status: 400 }
      );
    }

    // Rate Limiting Check (15 calls per minute)
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local-client';
    const rateCheck = checkRateLimit(`dispatch_${clientIp}`, 15, 60);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded for approval execution dispatches. Please wait.',
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

    // Check Idempotency-Key header or body
    const headerIdempotencyKey = req.headers.get('idempotency-key') || req.headers.get('x-idempotency-key');

    let actorEmail = 'admin@kriatech.com';
    let bodyIdempotencyKey: string | undefined;

    try {
      const body = await req.json();
      if (body.actor_email) {
        actorEmail = body.actor_email;
      }
      if (body.idempotency_key) {
        bodyIdempotencyKey = body.idempotency_key;
      }
    } catch {
      // Body is optional
    }

    const idempotencyKey = headerIdempotencyKey || bodyIdempotencyKey;
    const result = await executeApprovedAction(approvalId, actorEmail, idempotencyKey);

    if (!result.success) {
      if (result.error_code === 'ALREADY_EXECUTED' || result.error_code === 'CONCURRENCY_LOCKED') {
        return NextResponse.json(
          {
            success: false,
            error_code: result.error_code,
            error: result.error,
          },
          { status: 409 } // Conflict
        );
      }

      if (result.error_code === 'NOT_APPROVED' || result.error_code === 'CRITICAL_ACTION_RESTRICTED') {
        return NextResponse.json(
          {
            success: false,
            error_code: result.error_code,
            error: result.error,
          },
          { status: 403 } // Forbidden
        );
      }

      return NextResponse.json(
        {
          success: false,
          error_code: result.error_code || 'BAD_REQUEST',
          error: result.error || 'Execution blocked by security gate.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      approval_id: result.approval_id,
      action_type: result.action_type,
      destination: result.destination,
      executed_at: result.executed_at,
      idempotency_key: result.idempotency_key,
      dispatch_payload: result.dispatch_payload,
    });
  } catch (error: any) {
    console.error('API Dispatch execution error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during dispatch.' },
      { status: 500 }
    );
  }
}
