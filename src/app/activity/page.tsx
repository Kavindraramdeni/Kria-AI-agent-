'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { getActivityLogs } from '@/lib/services/activity-logs';
import { ActivityLog } from '@/types/database';
import { History, Shield, Bot, User } from 'lucide-react';

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await getActivityLogs();
      setLogs(res.data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <>
      <Header
        title="Activity Logs & Security Audit Trail"
        subtitle="Append-only record of all critical user actions, agent proposals and security gate decisions"
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        <div className="p-4 rounded-xl bg-kria-card border border-kria-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Shield className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-200">
              Tamper-evident audit trail active. All sensitive actions are logged with timestamps.
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Total Logged Events: <strong className="text-white">{logs.length}</strong>
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Loading audit records...</div>
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

                        <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                          <span>Actor: <strong className="text-slate-400">{log.actor_id || log.actor_type}</strong></span>
                          <span>•</span>
                          <span>Source: {log.actor_type}</span>
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
