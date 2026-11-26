import { NextRequest, NextResponse } from 'next/server';
import {
  runB2BBulkOrderWorkflow,
  advanceWorkflow,
  getWorkflowRuns,
} from '@/lib/workflows/b2b-bulk-order-workflow';
import {
  getDueFollowUps,
  getOverdueFollowUps,
} from '@/lib/services/follow-up-scheduler';
import { getTotalRevenue, getAllOrders } from '@/lib/services/order-tracker';

export const dynamic = 'force-dynamic';

/**
 * GET /api/workflows/b2b-bulk-order
 * Returns active workflow runs, due/overdue follow-ups, and confirmed order revenue.
 */
export async function GET() {
  try {
    const [runs, dueFollowUps, overdueFollowUps, revenue, orders] = await Promise.all([
      getWorkflowRuns(),
      getDueFollowUps(),
      getOverdueFollowUps(),
      getTotalRevenue(),
      getAllOrders(),
    ]);

    return NextResponse.json({
      success: true,
      runs,
      follow_ups: {
        due: dueFollowUps,
        overdue: overdueFollowUps,
      },
      revenue,
      orders,
    });
  } catch (err: any) {
    console.error('B2B workflow GET API error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to load workflow state' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflows/b2b-bulk-order
 *
 * Starts a new B2B bulk magnetic acrylic frame order workflow OR advances an existing one:
 * - Start: { goal, lead, actor_email }
 * - Advance: { action: 'advance', workflow_run_id, to_stage, options }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    if (body.action === 'advance') {
      if (!body.workflow_run_id || !body.to_stage) {
        return NextResponse.json(
          { success: false, error: 'workflow_run_id and to_stage are required to advance a workflow.' },
          { status: 400 }
        );
      }

      const result = await advanceWorkflow(
        body.workflow_run_id,
        body.to_stage,
        body.options || {}
      );
      return NextResponse.json(result, { status: result.success ? 200 : 422 });
    }

    const goal: string = body.goal || 'Generate bulk magnetic acrylic frame orders for KRIA Tech';
    const lead = body.lead || {};
    const actor_email: string = body.actor_email || '';

    const result = await runB2BBulkOrderWorkflow({ goal, lead, actor_email });

    return NextResponse.json(result, { status: result.success ? 200 : 422 });
  } catch (err: any) {
    console.error('B2B workflow API error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
