'use client';

import React from 'react';
import { Header } from '@/components/layout/header';
import { DemoBadge } from '@/components/ui/demo-badge';
import { ShieldCheck } from 'lucide-react';

export default function CampaignsPage() {
  const campaigns = [
    {
      id: 'cmp-001',
      name: 'Q4 Wholesale Acrylic Framing Push',
      objective: 'Acquire 25 bulk gift shop and studio partners',
      channels: ['Instagram Ads', 'Direct B2B Outreach', 'WhatsApp Catalog'],
      budget: 15000,
      start_date: '2026-11-20',
      end_date: '2026-12-20',
      status: 'review',
      is_demo: true,
    },
    {
      id: 'cmp-002',
      name: 'Corporate Executive Year-End Awards Campaign',
      objective: 'Promote 8x10 Acrylic Blocks & Custom LED Signs for IT Corporate Gifting',
      channels: ['LinkedIn Direct', 'Corporate Inbound'],
      budget: 25000,
      start_date: '2026-12-01',
      end_date: '2026-12-31',
      status: 'draft',
      is_demo: true,
    },
  ];

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
              Automated ad spend is strictly prohibited. No marketing campaign can launch, charge a credit card, or bid on ad platforms without owner approval in the Approval Center.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className="p-5 rounded-xl bg-kria-card border border-kria-border hover:border-kria-600 transition-all space-y-3 shadow-card"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{camp.name}</span>
                <div className="flex items-center gap-2">
                  <DemoBadge />
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    {camp.status}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                Objective: <span className="text-slate-200">{camp.objective}</span>
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {camp.channels.map((ch, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-medium px-2 py-0.5 rounded bg-kria-surface text-electric-light border border-kria-border/50"
                  >
                    {ch}
                  </span>
                ))}
              </div>

              <div className="p-3 bg-kria-surface rounded-lg border border-kria-border/60 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Budget</span>
                  <strong className="text-sm font-bold text-emerald-400">
                    ₹{camp.budget.toLocaleString()}
                  </strong>
                </div>

                <div className="text-right text-slate-400 text-[11px]">
                  <span>{camp.start_date} → {camp.end_date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
