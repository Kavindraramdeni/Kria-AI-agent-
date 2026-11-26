import { NextRequest, NextResponse } from 'next/server';
import { runB2BBulkOrderWorkflow } from '@/lib/workflows/b2b-bulk-order-workflow';

/**
 * POST /api/workflows/b2b-bulk-order
 *
 * Triggers the B2B bulk magnetic acrylic frame order workflow.
 *
 * Request body:
 * {
 *   "goal": "string — business objective",
 *   "lead": {
 *     "name": "string",
 *     "business_name": "string",
 *     "phone": "+91...",
 *     "email": "...",
 *     "location": "...",
 *     "sku": "KRA-REC-0604",
 *     "quantity": 100,
 *     "budget": 50000,
 *     "source": "b2b_research"
 *   },
 *   "actor_email": "owner@kriatech.in"
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

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
