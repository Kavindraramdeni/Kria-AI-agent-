'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { getActivityLogs } from '@/lib/services/activity-logs';
import { verifyAuditLogIntegrity, TamperCheckResult } from '@/lib/services/tamper-proof';
import { ActivityLog } from '@/types/database';
import { History, Shield, Bot, User, CheckCircle2, AlertTriangle, KeyRound } from 'lucide-react';

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tamperStatus, setTamperStatus] = useState<TamperCheckResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await getActivityLogs();
      setLogs(res.data);
      setLoading(false);
    }
    load();
  }, []);

  function handleVerifyIntegrity() {
    setVerifying(true);
    setTimeout(() => {
      const result = verifyAuditLogIntegrity(logs);
      setTamperStatus(result);
      setVerifying(false);
    }, 400);
  }

  return (
    <>
      <Header
        title="Activity Logs & Security Audit Trail"
        subtitle="Cryptographically chained, tamper-evident audit ledger of user actions, agent outputs and gate dispatches"
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Verification Action Banner */}
        <div className="p-4 rounded-xl bg-kria-card border border-kria-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 flex-shrink-0">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Tamper-Evident SHA-256 Audit Ledger
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Each event is hashed with the previous record&apos;s checksum to form an unbroken verification chain.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleVerifyIntegrity}
              disabled={verifying || logs.length === 0}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold bg-kria-800 hover:bg-kria-700 text-slate-200 border border-kria-border transition-colors disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4 text-electric-light" />
              {verifying ? 'Verifying Chain...' : 'Verify Chain Integrity'}
            </button>
          </div>
        </div>

        {/* Tamper Check Result Alert */}
        {tamperStatus && (
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 shadow-card ${
              tamperStatus.isValid
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            }`}
          >
            {tamperStatus.isValid ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">
                {tamperStatus.isValid
                  ? 'Cryptographic Verification Passed'
                  : 'Tamper Alert Detected'}
              </p>
              <p className="text-xs mt-1 text-slate-300">
                {tamperStatus.isValid
                  ? `Successfully validated ${tamperStatus.totalLogsVerified} audit records. All SHA-256 block hashes and chronological chain links are intact and unaltered.`
                  : `Integrity check failed at Log ID ${tamperStatus.tamperedLogId}: ${tamperStatus.tamperReason}`}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading audit records...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 rounded-xl bg-kria-card border border-kria-border text-center space-y-3 shadow-card">
            <div className="inline-flex p-3 rounded-xl bg-kria-800 text-slate-400">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-white">No Activity Events Recorded Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your audit trail is clean. As users create leads, agents generate proposals, and the owner dispatches approvals, each event will be cryptographically hashed with SHA-256 and chained here.
            </p>
          </div>
        ) : (
          <div className="rounded-xl bg-kria-card border border-kria-border overflow-hidden shadow-card">
            <div className="divide-y divide-kria-border">
              {logs.map((log) => {
                const isAgent = log.actor_type === 'agent';
                const isSystem = log.actor_type === 'system';

                return (
                  <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-kria-surface/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg mt-0.5 ${
                          isAgent
                            ? 'bg-purple-500/10 text-purple-400'
                            : isSystem
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-emerald-500/10 text-emerald-400'
                        }`}
                      >
                        {isAgent ? (
                          <Bot className="h-4 w-4" />
                        ) : isSystem ? (
                          <History className="h-4 w-4" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white font-mono uppercase">
                            {log.action.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase bg-kria-800 text-slate-300">
                            {log.entity_type}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 mt-0.5">{log.description}</p>

                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                          <span>Actor: <strong className="text-slate-400">{log.actor_id || log.actor_type}</strong></span>
                          <span>•</span>
                          <span>Source: {log.actor_type}</span>
                          {log.hash && (
                            <>
                              <span>•</span>
                              <span className="font-mono text-[10px] text-slate-400 bg-kria-850 px-1.5 py-0.5 rounded border border-kria-border/60">
                                SHA256: {log.hash.substring(0, 10)}...
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono sm:text-right whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
