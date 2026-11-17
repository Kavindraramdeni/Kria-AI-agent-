'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { DemoBadge } from '@/components/ui/demo-badge';
import { getCompetitorReports } from '@/lib/services/competitors';
import { ShieldCheck, Search, Sparkles, TrendingUp, Layers, Cpu, Award } from 'lucide-react';

interface CompetitorCard {
  id: string;
  name: string;
  website: string;
  focus: string;
  pricing_notes: string;
  strengths: string[];
  weaknesses: string[];
  is_demo: boolean;
  verified_facts?: string[];
  sources?: string[];
  model_name?: string;
  is_live_ai?: boolean;
}

export default function CompetitorResearchPage() {
  const [competitors, setCompetitors] = useState<CompetitorCard[]>([]);
  const [competitorName, setCompetitorName] = useState('');
  const [selectedSku, setSelectedSku] = useState('KRA-REC-0604');
  const [analyzing, setAnalyzing] = useState(false);
  const [agentOutput, setAgentOutput] = useState<any | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  useEffect(() => {
    async function loadReports() {
      try {
        const { data } = await getCompetitorReports();
        if (data && data.length > 0) {
          const mapped: CompetitorCard[] = data.map((r) => ({
            id: r.id,
            name: r.competitor_name,
            website: r.website_url || 'Public Marketplace Benchmark',
            focus:
              (r.products_analyzed && r.products_analyzed[0]?.product_name) ||
              'Direct B2B Acrylic Framing Competitor',
            pricing_notes:
              (r.pricing_analysis as any)?.pricing_gap_vs_kria || 'Analyzed via Competitor Agent',
            strengths: r.seo_opportunities || [],
            weaknesses: (r.pricing_analysis as any)?.kria_advantages || [],
            is_demo: r.is_demo,
            sources: r.source_urls || [],
          }));
          setCompetitors(mapped);
        } else {
          setCompetitors([]);
        }
      } catch (err) {
        console.error('Failed to load competitor reports:', err);
      } finally {
        setLoadingInitial(false);
      }
    }
    loadReports();
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
        body: JSON.stringify({
          input: competitorName,
          competitor_name: competitorName,
          sku: selectedSku,
          task_type: 'competitor_benchmark',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAgentOutput(data.output);
        const newCard: CompetitorCard = {
          id: data.saved_report_id || 'comp-' + Date.now(),
          name: data.output.competitor_name || competitorName,
          website: 'Public Marketplace Benchmark',
          focus:
            data.output.products_analyzed?.[0]?.product_name ||
            'Direct B2B Framing Competitor',
          pricing_notes:
            data.output.pricing_gap_vs_kria || 'Analyzed via Competitor Agent',
          strengths: data.output.opportunities || ['Market presence'],
          weaknesses:
            data.output.kria_competitive_advantages || ['Thinner acrylic specs'],
          is_demo: false,
          verified_facts: data.output.verified_facts,
          sources: data.output.sources,
          model_name: data.model_name,
          is_live_ai: data.execution_mode === 'live_ai',
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
              KRIA AI operates exclusively with publicly verifiable information. No private data is scraped, no logins bypassed, and no automated requests violate terms of service. Comparisons are grounded against verified KRIA Hyderabad factory specifications.
            </p>
          </div>
        </div>

        {/* Competitor Analysis Search Panel */}
        <div className="p-5 rounded-xl bg-kria-card border border-kria-border shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-electric-light" />
              Benchmark a Competitor with Real Gemini AI
            </h3>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Live AI Grounded
            </span>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 relative">
                <input
                  type="text"
                  value={competitorName}
                  onChange={(e) => setCompetitorName(e.target.value)}
                  placeholder="Enter competitor name or marketplace brand (e.g. Mass Market Acrylic Aggregators)"
                  className="w-full px-3 py-2 pl-9 rounded-lg bg-kria-850 border border-kria-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-electric"
                />
                <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
              </div>

              <div>
                <select
                  value={selectedSku}
                  onChange={(e) => setSelectedSku(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric"
                >
                  <option value="KRA-REC-0604">6×4&quot; Fridge Magnet (KRA-REC-0604)</option>
                  <option value="MAPF-0406-CL">4×6&quot; Tabletop Block 20mm (MAPF-0406-CL)</option>
                  <option value="KRA-KEY-CIR25">2.5&quot; Circle Keychain (KRA-KEY-CIR25)</option>
                  <option value="KRA-KIT-DEMO24">24-pc Starter Kit (KRA-KIT-DEMO24)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={analyzing || !competitorName.trim()}
                className="px-5 py-2 rounded-lg text-xs font-semibold bg-electric hover:bg-electric-dark text-white disabled:opacity-50 transition-colors shadow-glow flex items-center justify-center gap-1.5"
              >
                <TrendingUp className="h-4 w-4" />
                {analyzing ? 'Benchmarking with Gemini AI...' : 'Run Live Competitor Benchmark'}
              </button>
            </div>
          </form>
        </div>

        {/* Competitor Benchmarks Grid / Zero State */}
        {loadingInitial ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading competitor reports...</div>
        ) : competitors.length === 0 ? (
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
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      {comp.name}
                      {comp.is_live_ai && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-electric/10 text-electric-light border border-electric/20 font-semibold inline-flex items-center gap-1">
                          <Cpu className="h-3 w-3" /> Live AI
                        </span>
                      )}
                    </h4>
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

                {comp.verified_facts && comp.verified_facts.length > 0 && (
                  <div className="pt-2 border-t border-kria-border/40 text-[11px] text-slate-400 flex items-start gap-1.5">
                    <Award className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-slate-300">Grounded Fact:</strong> {comp.verified_facts[0]}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
