'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { getLeads } from '@/lib/services/leads';
import { getProducts } from '@/lib/services/products';
import { Lead, Product } from '@/types/database';
import { TrendingUp, Users, Package, Sparkles, AlertCircle, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export default function AnalyticsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLiveDatabase, setIsLiveDatabase] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    async function load() {
      const [lRes, pRes] = await Promise.all([getLeads(), getProducts()]);
      setLeads(lRes.data);
      setProducts(pRes.data);
      setIsLiveDatabase(Boolean(lRes.isLive || pRes.isLive));
    }
    load();
  }, []);

  async function handleRunAnalysis() {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/agents/business-analyst/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'synthesize_quarterly_metrics', task_type: 'executive_brief' }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAnalysisResult(data.output);
      } else {
        alert(data.error || 'Failed to synthesize business analytics.');
      }
    } catch (err: any) {
      console.error('Analyst agent error:', err);
      alert('Could not connect to Business Analyst agent.');
    } finally {
      setAnalyzing(false);
    }
  }

  // Compute real distributions from stored data
  const sourceDistribution = leads.reduce((acc, lead) => {
    acc[lead.source] = (acc[lead.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pipelineDistribution = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryDistribution = products.reduce((acc, prod) => {
    acc[prod.category] = (acc[prod.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <Header
        title="Operations & Growth Analytics"
        subtitle="Live metrics computed directly from database CRM records and product catalog"
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Authoritative Data Provenance Indicator */}
        <div className="p-3.5 rounded-xl bg-kria-card border border-kria-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <div className={`h-2.5 w-2.5 rounded-full ${isLiveDatabase ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="font-semibold text-slate-200">
              {isLiveDatabase
                ? 'Authoritative Production Database (Connected to Supabase PostgreSQL)'
                : 'Offline Demo Baseline (Local Verified Seeded Schema)'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400">
            Backed by <strong className="text-white">{leads.length}</strong> CRM Leads and <strong className="text-white">{products.length}</strong> Product SKUs
          </div>
        </div>

        {/* Executive AI Analyst Action Panel */}
        <div className="p-5 rounded-xl bg-gradient-to-r from-kria-850 via-kria-900 to-kria-card border border-electric/30 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Business Analyst Agent Synthesis</h3>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-electric/20 text-electric-light border border-electric/30">
                Grounded Engine
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Synthesize pipeline velocity, wholesale lead bottlenecks, and acrylic framing demand into an executive briefing.
            </p>
          </div>

          <button
            onClick={handleRunAnalysis}
            disabled={analyzing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-electric hover:bg-electric-dark text-white disabled:opacity-50 transition-colors shadow-glow flex-shrink-0"
          >
            <Sparkles className="h-4 w-4" />
            {analyzing ? 'Synthesizing Data...' : 'Run Analyst Synthesis'}
          </button>
        </div>

        {/* Analyst Briefing Box */}
        {analysisResult && (
          <div className="p-5 rounded-xl bg-kria-card border border-electric/40 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-kria-border/70 pb-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Executive Synthesis Briefing
              </span>
              <span className="text-[11px] text-slate-400">Source: Real CRM & Product Database</span>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed bg-kria-surface p-3 rounded-lg border border-kria-border/60">
              {analysisResult.executive_summary}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-kria-surface border border-kria-border/60 space-y-2">
                <span className="font-bold text-white block">Top Demanded Offerings</span>
                <ul className="space-y-1 text-slate-300 text-[11px]">
                  {analysisResult.top_demanded_products?.map((prod: string, i: number) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-electric" />
                      {prod}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 rounded-lg bg-kria-surface border border-amber-500/20 space-y-2">
                <span className="font-bold text-amber-400 block">Identified Bottlenecks</span>
                <ul className="space-y-1 text-slate-300 text-[11px]">
                  {analysisResult.identified_bottlenecks?.map((bot: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                      {bot}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 rounded-lg bg-kria-surface border border-emerald-500/20 space-y-2">
                <span className="font-bold text-emerald-400 block">Recommended Actions</span>
                <ul className="space-y-1 text-slate-300 text-[11px]">
                  {analysisResult.recommended_growth_actions?.map((act: string, i: number) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      {act}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Live Database Metrics Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Chart 1: Pipeline Breakdown */}
          <div className="p-5 rounded-xl bg-kria-card border border-kria-border shadow-card">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Pipeline Stage Breakdown</span>
              <Users className="h-4 w-4 text-electric-light" />
            </h3>

            <div className="space-y-3">
              {Object.entries(pipelineDistribution).map(([stage, count]) => {
                const percentage = Math.round((count / (leads.length || 1)) * 100);
                return (
                  <div key={stage} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span className="capitalize">{stage.replace('_', ' ')}</span>
                      <span className="font-semibold">{count} leads ({percentage}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-kria-surface overflow-hidden">
                      <div
                        className="h-full bg-electric rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 2: Lead Acquisition Sources */}
          <div className="p-5 rounded-xl bg-kria-card border border-kria-border shadow-card">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Lead Acquisition Source</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </h3>

            <div className="space-y-3">
              {Object.entries(sourceDistribution).map(([source, count]) => {
                const percentage = Math.round((count / (leads.length || 1)) * 100);
                return (
                  <div key={source} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span className="uppercase font-mono text-[11px]">{source}</span>
                      <span className="font-semibold">{count} ({percentage}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-kria-surface overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 3: Product Catalog Distribution */}
          <div className="p-5 rounded-xl bg-kria-card border border-kria-border shadow-card">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Catalog by Category</span>
              <Package className="h-4 w-4 text-purple-400" />
            </h3>

            <div className="space-y-3">
              {Object.entries(categoryDistribution).map(([cat, count]) => {
                const percentage = Math.round((count / (products.length || 1)) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-300">
                      <span>{cat}</span>
                      <span className="font-semibold">{count} products</span>
                    </div>
                    <div className="h-2 rounded-full bg-kria-surface overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
