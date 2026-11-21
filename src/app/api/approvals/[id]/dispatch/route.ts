import { NextRequest, NextResponse } from 'next/server';
import { executeApprovedAction } from '@/lib/services/execution-dispatcher';
import { checkRateLimit } from '@/lib/services/rate-limit';
import { getServerSession } from '@/lib/auth/session';
import { createClient as createServerClient } from '@/lib/supabase/server';

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

    // 1. Verify server-side authentication using server-side Supabase client
    const serverSupabase = createServerClient(req.cookies);
    const session = await getServerSession(serverSupabase);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Authentication required to dispatch approval actions.' },
        { status: 401 }
      );
    }

    // 2. Enforce server-side role authorization: Only owner or admin can dispatch approved actions
    if (session.role !== 'owner' && session.role !== 'admin') {
      return NextResponse.json(
        { error: `Forbidden: Insufficient privileges. Role '${session.role}' cannot dispatch approved actions.` },
        { status: 403 }
      );
    }

    // Check Idempotency-Key header or body
    const headerIdempotencyKey = req.headers.get('idempotency-key') || req.headers.get('x-idempotency-key');

    // Trusted server-controlled actor identity from verified session
    const actor = {
      email: session.email,
      role: session.role,
    };
    let bodyIdempotencyKey: string | undefined;

    try {
      const body = await req.json();
      if (body.idempotency_key) {
        bodyIdempotencyKey = body.idempotency_key;
      }
    } catch {
      // Body is optional
    }

    const idempotencyKey = headerIdempotencyKey || bodyIdempotencyKey;
    const result = await executeApprovedAction(approvalId, actor, idempotencyKey, undefined, serverSupabase);

    if (!result.success) {
      if (result.error_code === 'CRITICAL_ACTION_RESTRICTED') {
        return NextResponse.json(
          {
            success: false,
            error_code: result.error_code,
            error: result.error,
          },
          { status: 403 }
        );
      }

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

      if (result.error_code === 'NOT_FOUND') {
        return NextResponse.json(
          {
            success: false,
            error_code: result.error_code,
            error: result.error,
          },
          { status: 404 }
        );
      }

      if (result.error_code === 'NOT_APPROVED') {
        return NextResponse.json(
          {
            success: false,
            error_code: result.error_code,
            error: result.error,
          },
          { status: 422 } // Unprocessable Entity
        );
      }

      return NextResponse.json(
        {
          success: false,
          error_code: result.error_code,
          error: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      approval_id: result.approval_id,
      action_type: result.action_type,
      destination: result.destination,
      executed_at: result.executed_at,
      idempotency_key: result.idempotency_key,
      payload: result.dispatch_payload,
      message: 'Action successfully dispatched and permanently recorded in immutable audit log.',
    });
  } catch (error: any) {
    console.error('Approval dispatch execution error:', error);
    return NextResponse.json(
      { error: error.message || 'Action dispatch failed.' },
      { status: 500 }
    );
  }
}
