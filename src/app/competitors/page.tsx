'use client';

import React from 'react';
import { Header } from '@/components/layout/header';
import { DemoBadge } from '@/components/ui/demo-badge';
import { ShieldCheck } from 'lucide-react';

export default function CompetitorResearchPage() {
  const competitors = [
    {
      id: 'comp-001',
      name: 'CustomFrameHub India',
      website: 'https://example-competitor1.in',
      focus: 'Retail acrylic photo frames & personalized wooden clocks',
      pricing_notes: '4x6 magnetic frame retails at ₹699 (KRIA TECH direct price is ₹549)',
      strengths: ['Strong Amazon / Flipkart SEO presence'],
      weaknesses: ['Thin 15mm total acrylic thickness (vs KRIA 20mm)', 'No bulk discount tier listed'],
      is_demo: true,
    },
    {
      id: 'comp-002',
      name: 'LaserCraft B2B Supplies',
      website: 'https://example-competitor2.in',
      focus: 'MDF blanks, sublimation substrates & neon signage',
      pricing_notes: 'Sublimation keychains ₹45 at 100 units (KRIA TECH factory rate is ₹38)',
      strengths: ['Pan-India wholesale distribution network'],
      weaknesses: ['Long lead time (10-12 days)', 'Minimum order quantity 200 pcs'],
      is_demo: true,
    },
  ];

  return (
    <>
      <Header
        title="Competitor Intelligence & Market Gap"
        subtitle="Ethical, publicly verifiable market analysis for acrylic manufacturing & gifts"
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        <div className="p-4 rounded-xl bg-kria-card border border-kria-border flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Strict Ethical Scraping Policy</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Competitor research agents strictly observe public robots.txt directives, never bypass logins or paywalls, and cite verifiable source URLs for all competitive benchmarking.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {competitors.map((comp) => (
            <div
              key={comp.id}
              className="p-5 rounded-xl bg-kria-card border border-kria-border hover:border-kria-600 transition-all space-y-3 shadow-card"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm">{comp.name}</h3>
                <DemoBadge />
              </div>

              <p className="text-xs text-slate-400">
                Focus: <span className="text-slate-300">{comp.focus}</span>
              </p>

              <div className="p-3 rounded-lg bg-kria-surface border border-kria-border/60 text-xs text-slate-300 space-y-1">
                <span className="font-semibold text-white block">Pricing Comparison:</span>
                <p className="text-slate-400">{comp.pricing_notes}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                <div>
                  <span className="font-semibold text-slate-300 block mb-1">Competitor Strengths</span>
                  <ul className="list-disc list-inside text-slate-400 text-[11px] space-y-0.5">
                    {comp.strengths.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <span className="font-semibold text-emerald-400 block mb-1">KRIA TECH Edge</span>
                  <ul className="list-disc list-inside text-slate-400 text-[11px] space-y-0.5">
                    {comp.weaknesses.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
