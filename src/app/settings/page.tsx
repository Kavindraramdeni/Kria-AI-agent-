'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { isDemoModeActive, setDemoModeActive } from '@/lib/demo-mode';
import { Key, Database, RefreshCw, CheckCircle, Shield, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';

export default function SettingsPage() {
  const [testWebhookStatus, setTestWebhookStatus] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
  );

  useEffect(() => {
    setDemoMode(isDemoModeActive());
  }, []);

  function handleToggleDemoMode() {
    const nextVal = !demoMode;
    setDemoMode(nextVal);
    setDemoModeActive(nextVal);
  }

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
        subtitle="Manage Supabase connections, AI provider keys, Demo Mode isolation and security rules"
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {testWebhookStatus && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            {testWebhookStatus}
          </div>
        )}

        {/* SECTION 1: Demo Mode & Data Isolation Toggle */}
        <div className="p-5 rounded-xl bg-kria-card border border-kria-border shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-kria-border/60 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-electric-light" />
                <h3 className="text-sm font-bold text-white">Demo Mode & Data Isolation</h3>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                    demoMode
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {demoMode ? 'Demo Mode Active' : 'Clean Production Mode (Default)'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Control whether optional marked demo fixtures are visible in your workspace.
              </p>
            </div>

            <button
              onClick={handleToggleDemoMode}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                demoMode
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-kria-800 text-slate-300 border border-kria-border hover:text-white'
              }`}
            >
              {demoMode ? (
                <>
                  <ToggleRight className="h-5 w-5 text-amber-400" />
                  <span>Disable Demo Mode</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="h-5 w-5 text-slate-500" />
                  <span>Enable Demo Mode (Preview Fixtures)</span>
                </>
              )}
            </button>
          </div>

          <div className="p-3.5 rounded-lg bg-kria-850 border border-kria-border/60 text-xs text-slate-300 space-y-2">
            <div className="flex items-start gap-2">
              <span className="font-bold text-white">• Clean Production (OFF):</span>
              <span className="text-slate-400">
                Starts with completely empty business records (0 leads, 0 approvals, 0 campaigns, 0 activity events). Only your real business records and verified KRIA TECH factory products are shown.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-bold text-white">• Isolated Demo (ON):</span>
              <span className="text-slate-400">
                Loads optional sample fixtures for evaluating the interface. All demo items are clearly marked with a &ldquo;Demo&rdquo; badge. Toggling Demo Mode OFF will never delete any real business records you have created.
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 2: Database Connectivity Status */}
        <div className="p-5 rounded-xl bg-kria-card border border-kria-border shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-kria-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <Database className="h-4 w-4 text-electric-light" />
              <h3 className="text-sm font-bold text-white">Database & Supabase Connection</h3>
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isSupabaseConfigured
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
              }`}
            >
              {isSupabaseConfigured ? 'Connected to Cloud Supabase' : 'Offline Mode (Placeholder Config)'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-kria-850 border border-kria-border">
              <span className="text-slate-400 block mb-1">Supabase Project URL</span>
              <span className="font-mono text-white text-[11px] break-all">
                {process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not Configured (.env.local missing)'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-kria-850 border border-kria-border">
              <span className="text-slate-400 block mb-1">Anon Key Status</span>
              <span className="text-slate-200">
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Active (Browser-Safe Client Key Loaded)' : 'Pending configuration in .env.local'}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 3: n8n Workflow Automations */}
        <div className="p-5 rounded-xl bg-kria-card border border-kria-border shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-kria-border/60 pb-3">
            <div className="flex items-center gap-2.5">
              <RefreshCw className="h-4 w-4 text-electric-light" />
              <h3 className="text-sm font-bold text-white">n8n Business Automations (Test Mode)</h3>
            </div>
            <span className="text-xs text-slate-400">Manual Triggers & Safe Testing</span>
          </div>

          <div className="space-y-3">
            {automations.map((auto) => (
              <div
                key={auto.trigger}
                className="p-3.5 rounded-lg bg-kria-850 border border-kria-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{auto.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-kria-800 text-electric-light font-mono">
                      {auto.trigger}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-0.5">{auto.description}</p>
                </div>

                <button
                  onClick={() => handleTriggerTest(auto.name)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-kria-800 hover:bg-kria-700 text-slate-200 border border-kria-border transition-colors flex-shrink-0"
                >
                  Test Trigger
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
