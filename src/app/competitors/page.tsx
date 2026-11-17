'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { DemoBadge } from '@/components/ui/demo-badge';
import { isDemoModeActive } from '@/lib/demo-mode';
import { ShieldCheck, Search, Sparkles, TrendingUp, Layers, CheckCircle } from 'lucide-react';

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

const OPTIONAL_DEMO_COMPETITORS: CompetitorCard[] = [
  {
    id: 'comp-001',
    name: 'CustomFrameHub India [DEMO]',
    website: 'https://example-competitor1.in',
    focus: 'Retail acrylic photo frames & wooden clocks',
    pricing_notes: '4x6 magnetic frame retails at ₹699 (KRIA TECH direct price is ₹549)',
    strengths: ['Strong marketplace presence'],
    weaknesses: ['Thin 15mm extruded acrylic (vs KRIA 20mm cast)', 'No bulk discount tier listed'],
    is_demo: true,
  },
];

export default function CompetitorResearchPage() {
  const [competitors, setCompetitors] = useState<CompetitorCard[]>([]);
  const [competitorName, setCompetitorName] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [agentOutput, setAgentOutput] = useState<any | null>(null);

  useEffect(() => {
    if (isDemoModeActive()) {
      setCompetitors(OPTIONAL_DEMO_COMPETITORS);
    } else {
      setCompetitors([]);
    }
  }, []);

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
          name: data.output.competitor_name || competitorName,
          website: 'Public Catalog Benchmark',
          focus: 'Direct B2B Framing Competitor',
          pricing_notes: data.output.pricing_gap_vs_kria || 'Analyzed via Competitor Agent',
          strengths: data.output.opportunities || ['Market presence'],
          weaknesses: data.output.kria_competitive_advantages || ['Thinner acrylic specs'],
          is_demo: false,
        };
        setCompetitors((prev) => [newCard, ...prev]);
        setCompetitorName('');
      } else {
        alert(data.error || 'Failed to benchmark competitor.');
      }
    } catch (err: any) {
      console.error('Competitor Agent error:', err);
      alert('Could not connect to Competitor Intelligence Agent.');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <>
      <Header
        title="Competitor Intelligence & Market Benchmarking"
        subtitle="Ethical public-domain pricing, product thickness and positioning analysis"
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Ethical Guardrail Banner */}
        <div className="p-4 rounded-xl bg-kria-card border border-electric/30 flex items-start gap-3 shadow-card">
          <div className="p-2 rounded-lg bg-electric/10 text-electric-light mt-0.5 flex-shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Ethical Intelligence Guardrail</h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              KRIA AI operates exclusively with publicly verifiable information. No private data is scraped, no logins bypassed, and no automated requests violate terms of service.
            </p>
          </div>
        </div>

        {/* Competitor Analysis Search Panel */}
        <div className="p-5 rounded-xl bg-kria-card border border-kria-border shadow-card space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-electric-light" />
            Benchmark a Competitor with AI
          </h3>
          <form onSubmit={handleAnalyze} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={competitorName}
                onChange={(e) => setCompetitorName(e.target.value)}
                placeholder="Enter competitor name or marketplace brand (e.g. Mass Market Acrylic Aggregators)"
                className="w-full px-3 py-2 pl-9 rounded-lg bg-kria-850 border border-kria-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-electric"
              />
              <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
            </div>

            <button
              type="submit"
              disabled={analyzing || !competitorName.trim()}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-electric hover:bg-electric-dark text-white disabled:opacity-50 transition-colors shadow-glow flex items-center justify-center gap-1.5 flex-shrink-0"
            >
              <TrendingUp className="h-4 w-4" />
              {analyzing ? 'Benchmarking...' : 'Run Competitor Benchmark'}
            </button>
          </form>
        </div>

        {/* Competitor Benchmarks Grid / Zero State */}
        {competitors.length === 0 ? (
          <div className="p-12 rounded-xl bg-kria-card border border-kria-border text-center space-y-3 shadow-card">
            <div className="inline-flex p-3 rounded-xl bg-kria-800 text-slate-400">
              <Layers className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-white">No Competitor Reports Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              You haven&apos;t run any competitor comparisons yet. Type a brand or supplier above to compare thickness, pricing gaps, and factory advantages.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {competitors.map((comp) => (
              <div
                key={comp.id}
                className="p-5 rounded-xl bg-kria-card border border-kria-border hover:border-kria-600 transition-all space-y-4 shadow-card"
              >
                <div className="flex items-center justify-between border-b border-kria-border/60 pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white">{comp.name}</h4>
                    <p className="text-[11px] text-slate-400">{comp.website}</p>
                  </div>
                  {comp.is_demo && <DemoBadge />}
                </div>

                <div className="space-y-1.5 text-xs">
                  <span className="font-semibold text-slate-300">Catalog Focus:</span>
                  <p className="text-slate-400">{comp.focus}</p>
                </div>

                <div className="p-3 rounded-lg bg-kria-850 border border-kria-border/60 text-xs">
                  <span className="text-slate-400">Pricing & Thickness Gap vs KRIA TECH:</span>
                  <p className="text-emerald-400 font-medium mt-1">{comp.pricing_notes}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div>
                    <span className="font-semibold text-slate-300 block mb-1">Competitor Strengths:</span>
                    <ul className="list-disc list-inside text-slate-400 space-y-0.5 text-[11px]">
                      {comp.strengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="font-semibold text-slate-300 block mb-1">KRIA TECH Factory Edge:</span>
                    <ul className="list-disc list-inside text-electric-light space-y-0.5 text-[11px]">
                      {comp.weaknesses.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
