'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { getLeads } from '@/lib/services/leads';
import { getProducts } from '@/lib/services/products';
import { Lead, Product } from '@/types/database';
import {
  TrendingUp,
  Users,
  Package,
  Sparkles,
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Cpu,
  DollarSign,
  Layers,
  Clock,
} from 'lucide-react';

export default function AnalyticsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLiveDatabase, setIsLiveDatabase] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [analysisMeta, setAnalysisMeta] = useState<any | null>(null);
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
        setAnalysisMeta({
          unit_economics: data.unit_economics,
          pipeline_summary: data.pipeline_summary,
          execution_mode: data.execution_mode,
          model_name: data.model_name,
        });
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-kria-border/70 pb-3 gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Executive Synthesis Briefing
              </span>
              <div className="flex items-center gap-2">
                {analysisMeta?.execution_mode === 'live_ai' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <Cpu className="h-3 w-3" /> Live AI ({analysisMeta.model_name || 'Gemini 3.5 Flash Lite'})
                  </span>
                )}
                <span className="text-[11px] text-slate-400">Source: Real CRM & Unit Economics Registry</span>
              </div>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed bg-kria-surface p-3.5 rounded-lg border border-kria-border/60">
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

            {/* Grounded Unit Economics & Margin Modeling Matrix */}
            {analysisMeta?.unit_economics && (
              <div className="pt-2 border-t border-kria-border/70 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                    Factory Unit Economics & Wholesale Margin Modeling
                  </h4>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-slate-400">
                      Avg 500-Tier Margin: <strong className="text-emerald-400">{analysisMeta.unit_economics.average_gross_margin_pct}%</strong>
                    </span>
                    <span className="text-slate-400">
                      Top Margin SKU: <strong className="text-electric-light">{analysisMeta.unit_economics.top_margin_sku}</strong>
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-kria-border/60">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-kria-850 text-slate-400 uppercase font-semibold text-[10px]">
                      <tr>
                        <th className="px-3 py-2">Product SKU</th>
                        <th className="px-3 py-2">Catalog Name</th>
                        <th className="px-3 py-2">Retail Price</th>
                        <th className="px-3 py-2">Wholesale 500 Tier</th>
                        <th className="px-3 py-2">Factory COGS</th>
                        <th className="px-3 py-2">500-Tier Margin</th>
                        <th className="px-3 py-2">Sheet Yield</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-kria-border/50 text-slate-300">
                      {analysisMeta.unit_economics.products?.map((p: any) => (
                        <tr key={p.sku} className="hover:bg-kria-surface/70">
                          <td className="px-3 py-2 font-mono text-white">{p.sku}</td>
                          <td className="px-3 py-2">{p.product_name}</td>
                          <td className="px-3 py-2">₹{p.retail_price_inr}</td>
                          <td className="px-3 py-2 font-semibold text-white">₹{p.wholesale_500_inr}</td>
                          <td className="px-3 py-2 font-mono text-slate-400">₹{p.estimated_cogs_inr}</td>
                          <td className="px-3 py-2 font-bold text-emerald-400">{p.wholesale_500_margin_pct}%</td>
                          <td className="px-3 py-2 font-mono text-slate-400">{p.units_per_master_sheet} pcs / sheet</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Inventory Velocity Highlights */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] pt-1">
                  <div className="p-2.5 rounded-lg bg-kria-850 border border-kria-border/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Daily Shift Capacity</span>
                    <span className="text-white font-bold text-sm mt-0.5 block">
                      {analysisMeta.unit_economics.inventory_velocity.daily_factory_capacity_units} units
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-kria-850 border border-kria-border/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Wholesale SLA</span>
                    <span className="text-white font-bold text-sm mt-0.5 block">
                      {analysisMeta.unit_economics.inventory_velocity.standard_dispatch_sla_days} days (VIP: 1 day)
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-kria-850 border border-kria-border/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Sheet Safety Stock</span>
                    <span className="text-white font-bold text-sm mt-0.5 block">
                      {analysisMeta.unit_economics.inventory_velocity.acrylic_sheet_safety_stock} sheets (~1,440 frames)
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-kria-850 border border-kria-border/60">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">VIP Break-Even</span>
                    <span className="text-emerald-400 font-bold text-sm mt-0.5 block">
                      {analysisMeta.unit_economics.break_even_vip_units} units (-₹2/pc)
                    </span>
                  </div>
                </div>
              </div>
            )}
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
