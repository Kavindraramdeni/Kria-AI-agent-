'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { getApprovals, updateApprovalStatus } from '@/lib/services/approvals';
import { logActivity } from '@/lib/services/activity-logs';
import { ApprovalRequest, ApprovalStatus } from '@/types/approval';
import {
  ShieldCheck,
  CheckCircle,
  Lock,
  Zap
} from 'lucide-react';

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'reviewed' | 'all'>('pending');
  const [selectedItem, setSelectedItem] = useState<ApprovalRequest | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    loadApprovals();
  }, []);

  async function loadApprovals() {
    setLoading(true);
    const res = await getApprovals();
    setApprovals(res.data);
    setLoading(false);
  }

  async function handleDecision(id: string, status: ApprovalStatus, notes?: string) {
    const reviewer = 'admin@kriatech.com';
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
        body: JSON.stringify({ actor_email: 'admin@kriatech.com' }),
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

                {/* Proposed Content Preview Box */}
                <div className="p-3.5 rounded-lg bg-kria-surface border border-kria-border/70 text-xs font-mono text-slate-300 overflow-x-auto max-h-48">
                  <pre className="whitespace-pre-wrap font-sans text-xs text-slate-200">
                    {JSON.stringify(item.proposed_content, null, 2)}
                  </pre>
                </div>

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
