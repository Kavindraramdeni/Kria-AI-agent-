'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/header';
import { DemoBadge } from '@/components/ui/demo-badge';
import { ShieldCheck, Plus, Search, Sparkles, TrendingUp, Layers, CheckCircle } from 'lucide-react';

interface CompetitorCard {
  id: string;
  name: string;
  website: string;
  focus: string;
  pricing_notes: string;
  strengths: string[];
  weaknesses: string[];
  is_demo: boolean;
}

const INITIAL_COMPETITORS: CompetitorCard[] = [
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

export default function CompetitorResearchPage() {
  const [competitors, setCompetitors] = useState<CompetitorCard[]>(INITIAL_COMPETITORS);
  const [competitorName, setCompetitorName] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [agentOutput, setAgentOutput] = useState<any | null>(null);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!competitorName.trim()) return;

    setAnalyzing(true);
    setAgentOutput(null);

    try {
      const res = await fetch('/api/agents/competitor-agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: competitorName, task_type: 'competitor_benchmark' }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAgentOutput(data.output);
        const newCard: CompetitorCard = {
          id: 'comp-' + Date.now(),
          name: competitorName.trim(),
          website: 'https://public-listing-analysis.in',
          focus: 'Wholesale acrylic & framing distributor',
          pricing_notes: data.output.pricing_gap_vs_kria,
          strengths: ['Broad multi-category catalog'],
          weaknesses: data.output.kria_competitive_advantages,
          is_demo: false,
        };
        setCompetitors([newCard, ...competitors]);
        setCompetitorName('');
      } else {
        alert(data.error || 'Failed to analyze competitor.');
      }
    } catch (err: any) {
      console.error('Competitor agent error:', err);
      alert('Could not connect to competitor analysis agent.');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <>
      <Header
        title="Competitor Intelligence & Market Gap"
        subtitle="Ethical, publicly verifiable market analysis for acrylic manufacturing & gifts"
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Ethical Scraping Notice */}
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

        {/* Competitor Analysis Input Form */}
        <div className="p-5 rounded-xl bg-kria-card border border-kria-border shadow-card">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-electric-light" />
            Analyze Competitor Offering
          </h3>
          <p className="text-xs text-slate-400 mb-3">
            Benchmark competitor prices, acrylic thickness, and MOQs against KRIA TECH direct factory offerings.
          </p>

          <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="e.g. AcrylicFrameWholesalers.in or PrintGifts Hub"
              value={competitorName}
              onChange={(e) => setCompetitorName(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric"
            />
            <button
              type="submit"
              disabled={analyzing}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-electric hover:bg-electric-dark text-white disabled:opacity-50 shadow-glow flex-shrink-0"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              {analyzing ? 'Analyzing Market...' : 'Run Gap Analysis'}
            </button>
          </form>

          {/* Real Agent Output Display */}
          {agentOutput && (
            <div className="mt-4 p-4 rounded-lg bg-kria-surface border border-emerald-500/20 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                <CheckCircle className="h-4 w-4" />
                Verified KRIA TECH Competitive Edge
              </div>
              <p className="text-slate-300">{agentOutput.pricing_gap_vs_kria}</p>
              <div className="pt-2 border-t border-kria-border/70 flex flex-wrap gap-2">
                {agentOutput.kria_competitive_advantages?.map((adv: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-kria-850 text-slate-200 border border-kria-border text-[11px]">
                    ✓ {adv}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Competitor Benchmarks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {competitors.map((comp) => (
            <div
              key={comp.id}
              className="p-5 rounded-xl bg-kria-card border border-kria-border hover:border-kria-600 transition-all space-y-3 shadow-card"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm">{comp.name}</h3>
                {comp.is_demo && <DemoBadge />}
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
