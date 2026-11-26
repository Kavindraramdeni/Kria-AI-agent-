'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import {
  ExecutionState,
  ExecutionStateLabels,
  ExecutionStateDescriptions,
} from '@/lib/types/workflow-states';
import { FollowUp, WorkflowRun, WorkflowStage } from '@/types/database';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  IndianRupee,
  Play,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

const EIGHT_STAGES: { key: WorkflowStage; label: string; step: number; hint: string }[] = [
  { key: 'research', label: '1. Find B2B Customers', step: 1, hint: 'Research retailers, distributors & gift shops' },
  { key: 'outreach_prepared', label: '2. Prepare Outreach', step: 2, hint: 'Generate customer-specific message' },
  { key: 'awaiting_approval', label: '3. Owner Approval', step: 3, hint: 'Review & approve before dispatch' },
  { key: 'awaiting_reply', label: '4. Track Replies', step: 4, hint: 'Dispatched (simulated); awaiting buyer reply' },
  { key: 'qualified', label: '5. Qualify Lead', step: 5, hint: 'Capture SKU, quantity & budget requirements' },
  { key: 'quoted', label: '6. Prepare Quotation', step: 6, hint: 'Verified SKU, MOQ 50 & factory pricing' },
  { key: 'follow_up', label: '7. Follow-Ups', step: 7, hint: 'Durable reminders & overdue tracking' },
  { key: 'order_confirmed', label: '8. Orders & Revenue', step: 8, hint: 'Track confirmed orders & revenue' },
];

const NEXT_STAGE_MAP: Partial<Record<WorkflowStage, WorkflowStage>> = {
  research: 'outreach_prepared',
  outreach_prepared: 'awaiting_approval',
  awaiting_approval: 'awaiting_reply',
  awaiting_reply: 'qualified',
  qualified: 'quoted',
  quoted: 'follow_up',
  follow_up: 'order_confirmed',
  order_confirmed: 'completed',
};

export default function SalesWorkflowPage() {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [dueFollowUps, setDueFollowUps] = useState<FollowUp[]>([]);
  const [overdueFollowUps, setOverdueFollowUps] = useState<FollowUp[]>([]);
  const [revenue, setRevenue] = useState<{ total_inr: number; confirmed_orders: number }>({
    total_inr: 0,
    confirmed_orders: 0,
  });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Quick-launch form state
  const [buyerName, setBuyerName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [sku, setSku] = useState('KRA-REC-0604');
  const [quantity, setQuantity] = useState(50);

  async function loadWorkflowState() {
    setLoading(true);
    try {
      const res = await fetch('/api/workflows/b2b-bulk-order');
      const data = await res.json();
      if (data.success) {
        setRuns(data.runs || []);
        setDueFollowUps(data.follow_ups?.due || []);
        setOverdueFollowUps(data.follow_ups?.overdue || []);
        setRevenue(data.revenue || { total_inr: 0, confirmed_orders: 0 });
      }
    } catch (err: any) {
      setStatusMessage(err?.message || 'Failed to load workflow data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWorkflowState();
  }, []);

  async function handleStartWorkflow(e: React.FormEvent) {
    e.preventDefault();
    setBusyId('new');
    setStatusMessage(null);
    try {
      const res = await fetch('/api/workflows/b2b-bulk-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: `Get bulk magnetic acrylic frame order from ${businessName || buyerName || 'B2B Buyer'}`,
          lead: {
            name: buyerName || 'B2B Buyer',
            business_name: businessName || undefined,
            phone: phone || undefined,
            sku,
            quantity: Number(quantity),
            source: 'b2b_research',
          },
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setStatusMessage(`Error: ${data.error || 'Workflow failed to start.'}`);
      } else {
        setStatusMessage(`Workflow started: ${data.output_summary}`);
        setBuyerName('');
        setBusinessName('');
        setPhone('');
        await loadWorkflowState();
      }
    } catch (err: any) {
      setStatusMessage(`Error: ${err?.message || 'Network error'}`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleAdvance(run: WorkflowRun) {
    const nextStage = NEXT_STAGE_MAP[run.current_stage];
    if (!nextStage) return;

    setBusyId(run.id);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/workflows/b2b-bulk-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'advance',
          workflow_run_id: run.id,
          to_stage: nextStage,
          options: {
            sku: run.metadata?.lead_input?.sku,
            quantity: run.metadata?.lead_input?.quantity,
          },
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setStatusMessage(`Blocked: ${data.error}`);
      } else {
        setStatusMessage(`Advanced to '${data.current_stage}': ${data.output_summary}`);
        await loadWorkflowState();
      }
    } catch (err: any) {
      setStatusMessage(`Error: ${err?.message || 'Failed to advance workflow.'}`);
    } finally {
      setBusyId(null);
    }
  }

  const allDue = [...overdueFollowUps, ...dueFollowUps];

  return (
    <div className="min-h-screen bg-kria-900 text-slate-200">
      <Header
        title="B2B Sales Workflow"
        subtitle="8-Stage Bulk Magnetic Acrylic Frame Pipeline — https://kriatech.in"
      />

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Top KPI Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-kria-850 border border-kria-border">
            <div className="text-xs text-slate-400">Active Workflows</div>
            <div className="mt-1 text-2xl font-bold text-white">{runs.length}</div>
          </div>

          <div className="p-4 rounded-xl bg-kria-850 border border-kria-border">
            <div className="text-xs text-slate-400">Due / Overdue Follow-Ups</div>
            <div className="mt-1 text-2xl font-bold text-amber-400">{allDue.length}</div>
          </div>

          <div className="p-4 rounded-xl bg-kria-850 border border-kria-border">
            <div className="text-xs text-slate-400">Confirmed Orders</div>
            <div className="mt-1 text-2xl font-bold text-emerald-400">
              {revenue.confirmed_orders}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-kria-850 border border-kria-border">
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <IndianRupee className="h-3.5 w-3.5 text-emerald-400" />
              Confirmed Revenue
            </div>
            <div className="mt-1 text-2xl font-bold text-emerald-400">
              ₹{Number(revenue.total_inr || 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* 8-Stage Pipeline Overview */}
        <section className="p-4 rounded-xl bg-kria-850 border border-kria-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">KRIA AI — Bulk Sales Workflow Stages</h2>
            <button
              onClick={loadWorkflowState}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-kria-800 border border-kria-border"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {EIGHT_STAGES.map((s) => {
              const count = runs.filter((r) => r.current_stage === s.key).length;
              return (
                <div
                  key={s.key}
                  className="p-2.5 rounded-lg bg-kria-900 border border-kria-border/70 flex flex-col justify-between"
                  title={s.hint}
                >
                  <div className="text-[11px] font-semibold text-white">{s.label}</div>
                  <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{count} active</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Start New Workflow Form */}
        <section className="p-4 rounded-xl bg-kria-850 border border-kria-border space-y-3">
          <h2 className="text-sm font-bold text-white">Start New Bulk Sales Workflow</h2>
          <form onSubmit={handleStartWorkflow} className="grid grid-cols-1 sm:grid-cols-6 gap-3">
            <input
              type="text"
              placeholder="Buyer Name"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="px-3 py-2 rounded-lg bg-kria-900 border border-kria-border text-xs text-white"
            />
            <input
              type="text"
              placeholder="Business / Retailer Name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="px-3 py-2 rounded-lg bg-kria-900 border border-kria-border text-xs text-white"
            />
            <input
              type="text"
              placeholder="WhatsApp (+91...)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="px-3 py-2 rounded-lg bg-kria-900 border border-kria-border text-xs text-white"
            />
            <input
              type="text"
              placeholder="SKU (e.g. KRA-REC-0604)"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="px-3 py-2 rounded-lg bg-kria-900 border border-kria-border text-xs text-white font-mono"
            />
            <input
              type="number"
              min={1}
              placeholder="Qty (MOQ 50)"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="px-3 py-2 rounded-lg bg-kria-900 border border-kria-border text-xs text-white"
            />
            <button
              type="submit"
              disabled={busyId === 'new'}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-electric hover:bg-electric/90 text-white text-xs font-semibold disabled:opacity-50"
            >
              <Play className="h-3.5 w-3.5" />
              {busyId === 'new' ? 'Starting...' : 'Run Workflow'}
            </button>
          </form>
          {statusMessage && (
            <div className="p-2.5 rounded-lg bg-kria-900 border border-kria-border text-xs text-slate-200">
              {statusMessage}
            </div>
          )}
        </section>

        {/* Active Workflow Runs + Due Follow-Ups */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold text-white">Active Workflow Runs</h2>
            {runs.length === 0 ? (
              <div className="p-6 rounded-xl bg-kria-850 border border-kria-border text-xs text-slate-400 text-center">
                No workflow runs yet. Start one above or send a lead via{' '}
                <code className="text-slate-200">/api/webhooks/leads</code>.
              </div>
            ) : (
              runs.map((run) => {
                const execState: ExecutionState = run.execution_state || 'ai_generated';
                const stateLabel = ExecutionStateLabels[execState] || execState;
                const stateDesc = ExecutionStateDescriptions[execState] || '';
                const nextStage = NEXT_STAGE_MAP[run.current_stage];
                const requiresApproval = run.current_stage === 'awaiting_approval';
                const isDone = run.current_stage === 'completed';

                return (
                  <div
                    key={run.id}
                    className="p-4 rounded-xl bg-kria-850 border border-kria-border space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          {run.metadata?.lead_input?.name || run.title}
                          {run.metadata?.lead_input?.business_name
                            ? ` — ${run.metadata.lead_input.business_name}`
                            : ''}
                        </h3>
                        <p className="text-xs text-slate-400">{run.objective}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-electric/20 text-electric-light border border-electric/30">
                          Stage: {run.current_stage}
                        </span>
                        <span
                          title={stateDesc}
                          className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20"
                        >
                          {stateLabel}
                        </span>
                      </div>
                    </div>

                    {run.summary && (
                      <p className="text-xs text-slate-300 bg-kria-900 p-2.5 rounded-lg border border-kria-border/60">
                        {run.summary}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t border-kria-border/50">
                      <div className="text-slate-400">
                        {run.metadata?.quote_total_inr ? (
                          <span>
                            Quote:{' '}
                            <strong className="text-emerald-400">
                              ₹{Number(run.metadata.quote_total_inr).toLocaleString()}
                            </strong>
                          </span>
                        ) : (
                          <span>{stateDesc}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {requiresApproval && (
                          <Link
                            href="/approvals"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-semibold hover:bg-amber-500/25"
                          >
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Review in Approvals
                          </Link>
                        )}
                        {nextStage && !isDone && (
                          <button
                            onClick={() => handleAdvance(run)}
                            disabled={requiresApproval || busyId === run.id}
                            title={
                              requiresApproval
                                ? 'Owner must approve on /approvals before dispatching'
                                : `Advance to ${nextStage}`
                            }
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-kria-800 hover:bg-kria-700 text-white border border-kria-border text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Advance to {nextStage}
                            <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {isDone && (
                          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                            <CheckCircle2 className="h-4 w-4" />
                            Completed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Due & Overdue Follow-Ups Panel */}
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-white">Due & Overdue Follow-Ups</h2>
            {allDue.length === 0 ? (
              <div className="p-5 rounded-xl bg-kria-850 border border-kria-border text-xs text-slate-400">
                No due or overdue follow-ups right now.
              </div>
            ) : (
              allDue.map((fu) => {
                const isOverdue = fu.status === 'overdue' || new Date(fu.scheduled_for).getTime() < Date.now() - 3600_000;
                return (
                  <div
                    key={fu.id}
                    className="p-3.5 rounded-xl bg-kria-850 border border-kria-border space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-white">{fu.assigned_action}</span>
                      <span
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          isOverdue
                            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {isOverdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {isOverdue ? 'Overdue' : 'Due'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Scheduled: {new Date(fu.scheduled_for).toLocaleString()}
                    </div>
                    {fu.notes && <div className="text-[11px] text-slate-300">{fu.notes}</div>}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
