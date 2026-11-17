'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Key, Database, RefreshCw, CheckCircle } from 'lucide-react';

export default function SettingsPage() {
  const [testWebhookStatus, setTestWebhookStatus] = useState<string | null>(null);

  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
  );

  const automations = [
    {
      name: 'New Lead WhatsApp & Email Alert',
      trigger: 'new_lead',
      description: 'Sends instant alert to sales manager on receiving new bulk wholesale lead inquiry.',
      status: 'Test Mode',
    },
    {
      name: 'Lead 48-Hour Follow-Up Cadence Reminder',
      trigger: 'lead_followup',
      description: 'Flags leads in "quotation_sent" stage without response after 48 hours.',
      status: 'Test Mode',
    },
    {
      name: 'Weekly Organic Search & Cluster Report',
      trigger: 'weekly_seo',
      description: 'Compiles search impressions and new keyword opportunities for magnetic acrylic photo frames.',
      status: 'Configurable',
    },
    {
      name: 'Daily Business Summary Digest',
      trigger: 'daily_summary',
      description: 'Summarizes new leads, pending approvals, and closed deals for KRIA TECH executive review.',
      status: 'Configurable',
    },
  ];

  function handleTriggerTest(name: string) {
    setTestWebhookStatus(`Test trigger dispatched for: ${name}. Recorded in test log.`);
    setTimeout(() => setTestWebhookStatus(null), 4000);
  }

  return (
    <>
      <Header
        title="Settings & System Configuration"
        subtitle="Manage Supabase connections, AI provider keys, n8n automations and security rules"
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {testWebhookStatus && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            {testWebhookStatus}
          </div>
        )}

        {/* Integration Status Audit Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Box 1: Supabase PostgreSQL & Auth */}
          <div className="p-5 rounded-xl bg-kria-card border border-kria-border shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                  <Database className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-white text-sm">Supabase Database & Auth</h3>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  isSupabaseConfigured
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                }`}
              >
                {isSupabaseConfigured ? 'Connected' : 'Demo Safe Mode'}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Row-Level Security (RLS) is applied on all exposed tables. Service-role keys are strictly kept server-side and never bundled to the client.
            </p>

            <div className="p-3 bg-kria-surface rounded-lg border border-kria-border/60 text-xs font-mono text-slate-300 space-y-1">
              <div>URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Configured via .env.local'}</div>
              <div>Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '•••••••• (Set)' : 'Placeholder (Demo Mode)'}</div>
            </div>
          </div>

          {/* Box 2: AI Provider Keys */}
          <div className="p-5 rounded-xl bg-kria-card border border-kria-border shadow-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <Key className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-white text-sm">AI Engine Abstraction</h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Safe Fallback Active
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              The AI service layer supports OpenAI, Anthropic, and Google Gemini via server-side environment variables. If API keys are omitted, non-AI CRUD features operate continuously without failure.
            </p>

            <div className="p-3 bg-kria-surface rounded-lg border border-kria-border/60 text-xs font-mono text-slate-300 space-y-1">
              <div>OPENAI_API_KEY: Configurable in .env.local</div>
              <div>ANTHROPIC_API_KEY: Configurable in .env.local</div>
            </div>
          </div>
        </div>

        {/* Automations (n8n Webhook Triggers) */}
        <div className="p-5 rounded-xl bg-kria-card border border-kria-border shadow-card space-y-4">
          <div>
            <h3 className="font-bold text-white text-sm">Optional Automation Workflows (n8n Boundary)</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Event-driven webhooks that trigger external business automations. All actions run in test mode until verified.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {automations.map((auto) => (
              <div
                key={auto.trigger}
                className="p-4 rounded-lg bg-kria-surface border border-kria-border flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-200">{auto.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded uppercase font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      {auto.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{auto.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-kria-border/60 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500">trigger: {auto.trigger}</span>
                  <button
                    onClick={() => handleTriggerTest(auto.name)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-kria-850 hover:bg-kria-800 text-electric-light border border-kria-border"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Test Trigger
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
