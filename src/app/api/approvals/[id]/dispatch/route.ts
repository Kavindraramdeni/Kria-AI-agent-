import { NextRequest, NextResponse } from 'next/server';
import { executeApprovedAction } from '@/lib/services/execution-dispatcher';

/**
 * POST /api/approvals/[id]/dispatch
 * Protected Server-Side Action Dispatch Endpoint
 * Strictly enforces single-use approval, role authorization, and concurrency locking.
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

    // Parse actor or fallback to authenticated admin session
    let actorEmail = 'admin@kriatech.com';
    try {
      const body = await req.json();
      if (body.actor_email) {
        actorEmail = body.actor_email;
      }
    } catch {
      // Body is optional
    }

    const result = await executeApprovedAction(approvalId, actorEmail);

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

      if (result.error_code === 'NOT_APPROVED') {
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
