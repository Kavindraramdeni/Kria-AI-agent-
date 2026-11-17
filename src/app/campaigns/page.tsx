'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { DemoBadge } from '@/components/ui/demo-badge';
import { isDemoModeActive } from '@/lib/demo-mode';
import { ShieldCheck, Megaphone, Plus, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface CampaignItem {
  id: string;
  name: string;
  objective: string;
  channels: string[];
  budget: number;
  start_date: string;
  end_date: string;
  status: string;
  is_demo: boolean;
}

const OPTIONAL_DEMO_CAMPAIGNS: CampaignItem[] = [
  {
    id: 'cmp-001',
    name: 'Q4 Wholesale Acrylic Framing Push [DEMO]',
    objective: 'Acquire 25 bulk gift shop and studio partners',
    channels: ['Instagram Ads', 'Direct B2B Outreach', 'WhatsApp Catalog'],
    budget: 15000,
    start_date: '2026-11-20',
    end_date: '2026-12-20',
    status: 'review',
    is_demo: true,
  },
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);

  useEffect(() => {
    if (isDemoModeActive()) {
      setCampaigns(OPTIONAL_DEMO_CAMPAIGNS);
    } else {
      setCampaigns([]);
    }
  }, []);

  return (
    <>
      <Header
        title="Marketing Campaigns & Ad Guardrails"
        subtitle="Campaign launch orchestration with strict budget and human sign-off gates"
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        <div className="p-4 rounded-xl bg-kria-card border border-rose-500/30 flex items-start gap-3">
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 mt-0.5">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Ad Spend Financial Safety Lock</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Automated ad spend is strictly prohibited. No marketing campaign can launch, charge a credit card, or bid on ad platforms without explicit Owner approval in the Approval Center.
            </p>
          </div>
        </div>

        {campaigns.length === 0 ? (
          <div className="p-12 rounded-xl bg-kria-card border border-kria-border text-center space-y-3 shadow-card">
            <div className="inline-flex p-3 rounded-xl bg-kria-800 text-slate-400">
              <Megaphone className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-white">No Active Campaigns</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              You have no active ad campaigns or promotional expenditures running. All campaigns require manual proposal and owner approval before launch.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Link
                href="/agents"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-electric hover:bg-electric-dark text-white transition-colors shadow-glow"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Draft Campaign with AI Agent
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {campaigns.map((camp) => (
              <div
                key={camp.id}
                className="p-5 rounded-xl bg-kria-card border border-kria-border hover:border-kria-600 transition-all space-y-3 shadow-card"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-kria-800 text-slate-300">
                    Status: {camp.status}
                  </span>
                  {camp.is_demo && <DemoBadge />}
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white">{camp.name}</h4>
                  <p className="text-xs text-slate-400 mt-1">{camp.objective}</p>
                </div>

                <div className="p-3 rounded-lg bg-kria-850 border border-kria-border/60 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Approved Budget Cap:</span>
                  <strong className="text-white font-mono">₹{camp.budget.toLocaleString()}</strong>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {camp.channels.map((ch) => (
                    <span
                      key={ch}
                      className="text-[10px] px-2 py-0.5 rounded bg-kria-800 text-slate-300 font-medium"
                    >
                      {ch}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
