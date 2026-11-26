'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { getApprovals, updateApprovalStatus } from '@/lib/services/approvals';
import { logActivity } from '@/lib/services/activity-logs';
import { createClient } from '@/lib/supabase/client';
import { ApprovalRequest, ApprovalStatus } from '@/types/approval';
import { ExecutionStateLabels, ExecutionStateDescriptions } from '@/lib/types/workflow-states';
import {
  ShieldCheck,
  CheckCircle,
  Lock,
  Zap,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Globe,
  FileText
} from 'lucide-react';

function ProposedContentPreview({ content, actionType }: { content: any; actionType: string }) {
  const [showRaw, setShowRaw] = useState(false);

  if (!content || typeof content !== 'object') {
    return (
      <div className="p-3 rounded-lg bg-kria-surface border border-kria-border/70 text-xs text-slate-300">
        {String(content)}
      </div>
    );
  }

  // 1. Customer Message / Sales Quote
  if (actionType === 'customer_message' || content.draft_response_message) {
    return (
      <div className="space-y-3">
        {/* Key Commercial Summary Bar */}
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-kria-900 border border-kria-border text-xs">
          {content.lead_name && (
            <div className="flex items-center gap-1.5 text-slate-200">
              <span className="text-slate-400">Buyer:</span>
              <strong className="text-white font-semibold">{content.lead_name}</strong>
              {content.business_name && (
                <span className="text-slate-400 text-[11px]">({content.business_name})</span>
              )}
            </div>
          )}
          {content.quantity && (
            <div className="flex items-center gap-1 text-slate-300 sm:border-l sm:border-kria-border sm:pl-3">
              <span className="text-slate-400">Order:</span>
              <strong className="text-electric-light font-semibold">{content.quantity} pcs</strong>
              {content.product_name && (
                <span className="text-slate-400 text-[11px] truncate max-w-[200px]">
                  ({content.product_name})
                </span>
              )}
            </div>
          )}
          {content.total_inr && (
            <div className="flex items-center gap-1 text-slate-300 sm:border-l sm:border-kria-border sm:pl-3">
              <span className="text-slate-400">Quote Total:</span>
              <strong className="text-emerald-400 font-bold text-sm">
                ₹{Number(content.total_inr).toLocaleString()}
              </strong>
              {content.unit_price_inr && (
                <span className="text-[11px] text-slate-400">(@ ₹{content.unit_price_inr}/pc)</span>
              )}
            </div>
          )}
        </div>

        {/* WhatsApp Message Preview Bubble */}
        <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-400">
            <span className="flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Proposed Message for Customer (WhatsApp / Email):
            </span>
            <span className="text-[10px] text-emerald-400/80 px-2 py-0.5 rounded bg-emerald-500/10 font-mono">
              Ready to Dispatch
            </span>
          </div>
          <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans bg-kria-900/80 p-3 rounded-lg border border-emerald-500/20">
            {content.draft_response_message || content.message || content.text || 'No message draft provided.'}
          </div>
        </div>

        {/* Collapsible Technical Details */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
          >
            {showRaw ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showRaw ? 'Hide Technical Metadata' : 'View Full Technical Payload'}
          </button>
          {showRaw && (
            <div className="mt-2 p-3 rounded-lg bg-kria-950 border border-kria-border text-[11px] font-mono text-slate-400 max-h-48 overflow-auto">
              <pre className="whitespace-pre-wrap">{JSON.stringify(content, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Website Change / Technical SEO Remediation
  if (actionType === 'website_change' || content.critical_issues || content.on_page_recommendations) {
    const priorities = content.ai_priorities || [];

    return (
      <div className="space-y-3">
        {content.target_url && (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-kria-900 border border-kria-border text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Globe className="h-3.5 w-3.5 text-electric-light" />
              <span className="text-slate-400">Target URL:</span>
              <span className="text-white font-mono underline">{content.target_url}</span>
            </div>
            {content.overall_score && (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold text-[11px]">
                Health Score: {content.overall_score}/100
              </span>
            )}
          </div>
        )}

        {priorities.length > 0 && (
          <div className="p-3 rounded-xl bg-kria-900 border border-kria-border space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Top Optimization Directives:
            </p>
            <ul className="list-disc list-inside text-xs text-slate-200 space-y-1">
              {priorities.slice(0, 3).map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowRaw(!showRaw)}
            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
          >
            {showRaw ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showRaw ? 'Hide Technical Details' : 'View Full Issue List & JSON'}
          </button>
          {showRaw && (
            <div className="mt-2 p-3 rounded-lg bg-kria-950 border border-kria-border text-[11px] font-mono text-slate-400 max-h-48 overflow-auto">
              <pre className="whitespace-pre-wrap">{JSON.stringify(content, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Fallback Clean View for Content & Other
  return (
    <div className="space-y-2">
      {content.title && <h4 className="text-xs font-bold text-white">{content.title}</h4>}
      {content.body && (
        <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed p-3 rounded-lg bg-kria-surface border border-kria-border/70">
          {content.body}
        </p>
      )}
      {!content.title && !content.body && (
        <div className="p-3 rounded-lg bg-kria-surface border border-kria-border/70 text-xs font-mono text-slate-300 max-h-48 overflow-auto">
          <pre className="whitespace-pre-wrap">{JSON.stringify(content, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed' | 'all'>('pending');
  const [selectedItem, setSelectedItem] = useState<ApprovalRequest | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

  useEffect(() => {
    loadApprovals();
    loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        setCurrentUserEmail(user.email);
      }
    } catch {
      // Silent fallback
    }
  }

  async function loadApprovals() {
    setLoading(true);
    const res = await getApprovals();
    setApprovals(res.data);
    setLoading(false);
  }

  async function handleDecision(id: string, status: ApprovalStatus, notes?: string) {
    const reviewer = currentUserEmail || 'authorized-reviewer';
    const res = await updateApprovalStatus(id, status, reviewer, notes);

    if (res.success) {
      await logActivity({
        entity_type: 'approval',
        entity_id: id,
        action: `approval_${status}`,
        description: `Approval decision for "${selectedItem?.title || id}": ${status.toUpperCase()} by ${reviewer}`,
        actor_type: 'user',
        actor_id: reviewer,
      });

      setActionMessage(`Action marked as ${status.toUpperCase()}. Audit entry logged.`);
      setTimeout(() => setActionMessage(''), 4000);
      setSelectedItem(null);
      setRevisionNotes('');
      loadApprovals();
    }
  }

  async function handleExecute(id: string) {
    try {
      const resp = await fetch(`/api/approvals/${id}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const res = await resp.json();

      if (resp.ok && res.success) {
        setActionMessage(`ACTION DISPATCHED TO: ${res.destination}. Single-use execution recorded.`);
        setTimeout(() => setActionMessage(''), 4500);
        loadApprovals();
      } else {
        alert(res.error || `Execution blocked by security gate (${res.error_code || resp.status}).`);
      }
    } catch (err: any) {
      alert(`Network or Server error: ${err.message}`);
    }
  }

  const filtered = approvals.filter((item) => {
    if (activeTab === 'pending') return item.status === 'pending';
    if (activeTab === 'reviewed') return item.status !== 'pending';
    return true;
  });

  const pendingCount = approvals.filter((a) => a.status === 'pending').length;

  return (
    <>
      <Header
        title="Human Approval Gate"
        subtitle="Mandatory review and sign-off for AI content, customer quotes, campaigns and website changes"
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Strict Gate Policy Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-kria-850 to-kria-900 border border-amber-500/30 flex items-start gap-3 shadow-card">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5 flex-shrink-0">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-white text-sm">KRIA Safety Policy Active</h3>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Single-Use Verification
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              No AI agent is authorized to dispatch emails, post to Instagram/Meta, modify production website files, or spend capital without an explicit signed approval. Approvals are re-verified server-side immediately prior to execution and are never treated as blanket permissions.
            </p>
          </div>
        </div>

        {actionMessage && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            {actionMessage}
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex items-center justify-between border-b border-kria-border/70 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'pending'
                  ? 'bg-electric text-white shadow-glow'
                  : 'text-slate-400 hover:text-white bg-kria-card'
              }`}
            >
              <span>Pending Review</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-white/20 text-white">
                {pendingCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('reviewed')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'reviewed'
                  ? 'bg-electric text-white'
                  : 'text-slate-400 hover:text-white bg-kria-card'
              }`}
            >
              <span>Decision History</span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                activeTab === 'all'
                  ? 'bg-electric text-white'
                  : 'text-slate-400 hover:text-white bg-kria-card'
              }`}
            >
              <span>All Requests ({approvals.length})</span>
            </button>
          </div>

          <span className="text-xs text-slate-400 hidden sm:inline">
            Awaiting Decision: <strong className="text-amber-400">{pendingCount}</strong>
          </span>
        </div>

        {/* Approval Queue List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading approval queue...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center bg-kria-card rounded-xl border border-kria-border">
            <ShieldCheck className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">Queue is completely clear!</p>
            <p className="text-xs text-slate-500 mt-1">There are no pending actions requiring human sign-off.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-xl bg-kria-card border border-kria-border hover:border-kria-600 transition-all flex flex-col space-y-4 shadow-card"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        item.risk_level === 'critical'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : item.risk_level === 'high'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {item.risk_level} Risk
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Type: <strong className="text-slate-200">{item.action_type}</strong>
                    </span>
                    {item.agent_id && (
                      <span className="text-xs text-electric-light font-medium">
                        • {item.agent_id}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                        item.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : item.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : item.status === 'rejected'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-kria-800 text-slate-300'
                      }`}
                    >
                      Status: {item.status}
                    </span>
                    {item.execution_state && ExecutionStateLabels[item.execution_state] && (
                      <span
                        title={ExecutionStateDescriptions[item.execution_state] || ''}
                        className="px-2 py-0.5 rounded text-[11px] font-semibold bg-kria-800 text-electric-light border border-electric/20"
                      >
                        {ExecutionStateLabels[item.execution_state]}
                      </span>
                    )}
                    <span className="text-slate-500 text-[11px]">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-white text-sm">{item.title}</h3>
                  <div className="mt-1 text-xs text-slate-400 flex items-center gap-2">
                    <span>Target Destination:</span>
                    <strong className="text-slate-200">{item.destination}</strong>
                  </div>
                </div>

                {/* Proposed Content Preview Box (Clean Business Card View) */}
                <ProposedContentPreview
                  content={item.proposed_content}
                  actionType={item.action_type}
                />

                {/* Decision Controls */}
                {item.status === 'pending' ? (
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-kria-border/60">
                    <span className="text-[11px] text-slate-400">
                      Action cannot execute until reviewed by an authorized KRIA manager.
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-kria-850 hover:bg-kria-800 text-slate-300 border border-kria-border transition-colors"
                      >
                        Request Revision
                      </button>

                      <button
                        onClick={() => handleDecision(item.id, 'rejected')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors"
                      >
                        Reject
                      </button>

                      <button
                        onClick={() => handleDecision(item.id, 'approved')}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-glow"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Approve Action
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 text-xs text-slate-400 border-t border-kria-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span>
                        Reviewed by: <strong className="text-slate-200">{item.reviewed_by || 'Owner'}</strong> on{' '}
                        {item.reviewed_at ? new Date(item.reviewed_at).toLocaleString() : 'N/A'}
                      </span>
                      {item.review_notes && (
                        <p className="text-amber-300 italic mt-0.5">&ldquo;{item.review_notes}&rdquo;</p>
                      )}
                      {item.executed_at && (
                        <p className="text-emerald-400 font-medium text-[11px] mt-0.5">
                          ✓ Executed and dispatched on {new Date(item.executed_at).toLocaleString()}
                        </p>
                      )}
                    </div>

                    {item.status === 'approved' && !item.executed_at && (
                      <button
                        onClick={() => handleExecute(item.id)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-electric hover:bg-electric-dark text-white transition-colors shadow-glow flex-shrink-0"
                      >
                        <Zap className="h-3.5 w-3.5" />
                        Dispatch Execution (Single-Use)
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Modal: Request Revision */}
        {selectedItem && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-kria-900 border border-kria-border rounded-xl w-full max-w-md shadow-2xl p-6 relative">
              <h3 className="text-sm font-bold text-white mb-1">Request Revision</h3>
              <p className="text-xs text-slate-400 mb-3">
                Specify feedback for &ldquo;{selectedItem.title}&rdquo;. The task will be sent back for refinement.
              </p>

              <textarea
                rows={3}
                placeholder="e.g. Tone is too aggressive; adjust wholesale minimum quote to 25 units and highlight optical flame polishing."
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric mb-3"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-kria-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDecision(selectedItem.id, 'revision_requested', revisionNotes)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white"
                >
                  Submit Revision Request
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
