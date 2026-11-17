'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { DemoBadge } from '@/components/ui/demo-badge';
import { getSeoKeywords } from '@/lib/services/seo-keywords';
import { createApprovalRequest } from '@/lib/services/approvals';
import { isDemoModeActive } from '@/lib/demo-mode';
import { SEOKeyword } from '@/types/database';
import { Search, Plus, AlertCircle, Globe, Sparkles, CheckCircle2, ShieldAlert, Layers, ArrowUpRight, TrendingUp } from 'lucide-react';

export default function SEOStudioPage() {
  const [keywords, setKeywords] = useState<SEOKeyword[]>([]);
  const [search, setSearch] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [intent, setIntent] = useState<'commercial' | 'transactional' | 'informational'>('commercial');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('high');
  const [cluster] = useState('Magnetic Frames');

  // AI SEO Strategy Generator State
  const [strategyPrompt, setStrategyPrompt] = useState('Magnetic Acrylic Fridge Frames & Return Gifts');
  const [generatingStrategy, setGeneratingStrategy] = useState(false);
  const [strategyResult, setStrategyResult] = useState<any | null>(null);
  const [strategyMeta, setStrategyMeta] = useState<{
    execution_mode: string;
    model_name?: string;
  } | null>(null);
  const [strategyApprovalSent, setStrategyApprovalSent] = useState(false);

  useEffect(() => {
    async function loadKeywords() {
      const res = await getSeoKeywords();
      if (res.data) setKeywords(res.data);
    }
    loadKeywords();
  }, []);

  async function handleRunSeoStrategy(e: React.FormEvent) {
    e.preventDefault();
    if (!strategyPrompt.trim()) return;

    setGeneratingStrategy(true);
    setStrategyResult(null);
    setStrategyMeta(null);
    setStrategyApprovalSent(false);

    try {
      const res = await fetch('/api/agents/seo-agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: strategyPrompt.trim(),
          target_cluster: strategyPrompt.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setStrategyResult(data.output);
        setStrategyMeta({
          execution_mode: data.execution_mode,
          model_name: data.model_name,
        });

        // Refresh keyword table with newly persisted keywords
        const refreshed = await getSeoKeywords();
        if (refreshed.data && refreshed.data.length > 0) {
          setKeywords(refreshed.data);
        }
      } else {
        alert(data.error || 'Failed to generate SEO strategy.');
      }
    } catch (err: any) {
      console.error('SEO Strategy error:', err);
      alert('Could not connect to SEO Strategy agent.');
    } finally {
      setGeneratingStrategy(false);
    }
  }

  async function handleSendStrategyProposal() {
    if (!strategyResult) return;

    const res = await createApprovalRequest({
      action_type: 'website_change',
      title: `Adopt SEO Strategy: ${strategyResult.target_cluster}`,
      proposed_content: {
        target_cluster: strategyResult.target_cluster,
        recommended_keywords: strategyResult.recommended_keywords,
        on_page_recommendations: strategyResult.on_page_recommendations,
        content_gap_analysis: strategyResult.content_gap_analysis,
        verified_facts: strategyResult.verified_facts,
      },
      destination: `KRIA Storefront Search Architecture`,
      agent_id: 'seo-agent',
      risk_level: 'low',
    });

    if (res.success) {
      setStrategyApprovalSent(true);
    }
  }

  // Website Audit State
  const [auditUrl, setAuditUrl] = useState('https://kriatech.com/products/acrylic-frames');
  const [auditing, setAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any | null>(null);
  const [auditMeta, setAuditMeta] = useState<any | null>(null);
  const [proposalSent, setProposalSent] = useState(false);

  function handleAddKeyword(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    const item: SEOKeyword = {
      id: 'seo-' + Date.now(),
      keyword: newKeyword.trim().toLowerCase(),
      search_intent: intent,
      cluster,
      priority,
      target_page: '/products/magnetic-acrylic-frames',
      status: 'targeted',
      verified_search_volume: null,
      source: 'manual',
      is_demo: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setKeywords([item, ...keywords]);
    setNewKeyword('');
  }

  async function handleRunAudit(e: React.FormEvent) {
    e.preventDefault();
    if (!auditUrl.trim()) return;

    setAuditing(true);
    setAuditResult(null);
    setAuditMeta(null);
    setProposalSent(false);

    try {
      const res = await fetch('/api/agents/website-agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: auditUrl, task_type: 'on_page_audit' }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setAuditResult(data.output);
        setAuditMeta({
          execution_mode: data.execution_mode,
          model_name: data.model_name,
          measured_score: data.measured_score,
          inspection_checks: data.inspection_checks,
        });
      } else {
        alert(data.error || 'Failed to complete website audit.');
      }
    } catch (err: any) {
      console.error('Audit agent error:', err);
      alert('Could not connect to website audit agent.');
    } finally {
      setAuditing(false);
    }
  }

  async function handleSendWebsiteProposal() {
    if (!auditResult) return;

    const res = await createApprovalRequest({
      action_type: 'website_change',
      title: `Proposed SEO & UX Updates for ${auditUrl}`,
      proposed_content: {
        target_url: auditUrl,
        issues: auditResult.detected_issues,
        mobile_ux_notes: auditResult.mobile_ux_notes,
      },
      destination: `KRIA TECH Live Website (${auditUrl})`,
      agent_id: 'website-agent',
      risk_level: 'high',
    });

    if (res.success) {
      setProposalSent(true);
    }
  }

  const filtered = keywords.filter((k) =>
    k.keyword.toLowerCase().includes(search.toLowerCase()) ||
    (k.cluster && k.cluster.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <Header
        title="SEO Strategy & Website Health Studio"
        subtitle="Organic search visibility, high-intent clusters and landing page audits for KRIA TECH"
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Transparent Notice */}
        <div className="p-4 rounded-xl bg-kria-card border border-kria-border flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 mt-0.5">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Truth in Search Data & Website Safety</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              In strict accordance with KRIA AI guidelines, search volumes and ranking positions are never fabricated. Website audits analyze public structure and generate proposals for review; no automated script directly modifies the live KRIA website without passing the Human Approval Gate.
            </p>
          </div>
        </div>

        {/* Real Gemini SEO Strategy Agent Module (Phase 2B) */}
        <div className="p-5 rounded-xl bg-kria-card border border-kria-border shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-emerald-400" />
                AI Keyword Clustering & Intent Strategy Engine
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Powered by Gemini 3.5 Flash Lite — clusters search intent, maps commercial priorities, and persists strategy to database.
              </p>
            </div>
            {strategyMeta && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                ⚡ Real AI ({strategyMeta.model_name || 'Gemini'})
              </span>
            )}
          </div>

          <form onSubmit={handleRunSeoStrategy} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              required
              value={strategyPrompt}
              onChange={(e) => setStrategyPrompt(e.target.value)}
              placeholder="e.g. Magnetic Acrylic Fridge Frames & Return Gifts"
              className="flex-1 px-3.5 py-2.5 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={generatingStrategy}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50 shadow-glow flex-shrink-0 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {generatingStrategy ? 'Analyzing Intent & Generating...' : 'Generate SEO Strategy'}
            </button>
          </form>

          {/* Live SEO Strategy Results */}
          {strategyResult && (
            <div className="p-4 rounded-xl bg-kria-surface border border-kria-border text-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-kria-border gap-2">
                <div>
                  <span className="text-[10px] uppercase font-mono text-emerald-400 tracking-wider block">Grounded Search Cluster</span>
                  <span className="font-bold text-white text-base block">{strategyResult.target_cluster}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-mono uppercase bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    {strategyResult.recommended_keywords?.length || 0} Keywords Mapped
                  </span>
                </div>
              </div>

              {/* Reasoning Summary */}
              {strategyResult.reasoning_summary && (
                <div className="p-3 rounded-lg bg-kria-850 border border-kria-border/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Commercial Strategy Reasoning</span>
                  <p className="text-slate-300 text-xs leading-relaxed">{strategyResult.reasoning_summary}</p>
                </div>
              )}

              {/* Recommended Keywords Table */}
              <div className="space-y-2">
                <span className="font-bold text-slate-200 block text-xs">Clustered Target Keywords (Persisted to Database):</span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-kria-border/60 text-[10px] uppercase text-slate-400 font-mono">
                        <th className="py-2 px-3">Keyword Query</th>
                        <th className="py-2 px-3">Search Intent</th>
                        <th className="py-2 px-3">Priority</th>
                        <th className="py-2 px-3">Recommended Target Page</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-kria-border/40 font-mono text-[11px]">
                      {strategyResult.recommended_keywords?.map((kw: any, i: number) => (
                        <tr key={i} className="hover:bg-kria-850/50">
                          <td className="py-2.5 px-3 font-semibold text-white">{kw.keyword}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-semibold ${
                              kw.intent === 'transactional'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : kw.intent === 'commercial'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : 'bg-slate-500/10 text-slate-300'
                            }`}>
                              {kw.intent}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              kw.priority === 'high' ? 'text-amber-400' : 'text-slate-400'
                            }`}>
                              {kw.priority}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">{kw.target_page}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* On-Page Recommendations */}
              {strategyResult.on_page_recommendations?.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-bold text-slate-200 block text-xs">Actionable On-Page Architecture Directives:</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {strategyResult.on_page_recommendations.map((rec: string, i: number) => (
                      <div key={i} className="p-2.5 rounded-lg bg-kria-850 border border-kria-border/50 text-slate-300 text-xs">
                        {rec}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Gap Analysis */}
              {strategyResult.content_gap_analysis && (
                <div className="p-3 rounded-lg bg-kria-850 border border-kria-border/60">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block mb-1">Competitor & Content Gap Analysis</span>
                  <p className="text-slate-300 text-xs leading-relaxed">{strategyResult.content_gap_analysis}</p>
                </div>
              )}

              {/* Verified Factory Facts Grounding */}
              {strategyResult.verified_facts?.length > 0 && (
                <div className="p-3 rounded-lg bg-kria-850/60 border border-kria-border/40 text-[11px]">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Factory Ground Truth Referenced</span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                    {strategyResult.verified_facts.map((fact: string, i: number) => (
                      <li key={i}>{fact}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Approval Proposal Submission */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-kria-border">
                <p className="text-[11px] text-slate-400">
                  Keywords automatically saved to database. Submit on-page architecture directives to Approval Center.
                </p>

                {strategyApprovalSent ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4" />
                    Strategy Adopted & Queued for Approval
                  </span>
                ) : (
                  <button
                    onClick={handleSendStrategyProposal}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Queue Strategy for Operational Review
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Website Landing Page Audit Module */}
        <div className="p-5 rounded-xl bg-kria-card border border-kria-border shadow-card space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-electric-light" />
              Landing Page SEO & UX Audit Agent
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Scan target product URLs for missing Schema markup, mobile conversion barriers, and optical specification proof.
            </p>
          </div>

          <form onSubmit={handleRunAudit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              required
              value={auditUrl}
              onChange={(e) => setAuditUrl(e.target.value)}
              placeholder="https://kriatech.com/products/magnetic-acrylic-frames"
              className="flex-1 px-3.5 py-2.5 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric"
            />
            <button
              type="submit"
              disabled={auditing}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-electric hover:bg-electric-dark text-white disabled:opacity-50 shadow-glow flex-shrink-0"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {auditing ? 'Scanning Page...' : 'Run On-Page Audit'}
            </button>
          </form>

          {/* Audit Results */}
          {auditResult && (
            <div className="p-4 rounded-xl bg-kria-surface border border-kria-border text-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-kria-border gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{auditResult.page_title}</span>
                    {auditMeta?.execution_mode === 'live_ai' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        ⚡ Real AI ({auditMeta.model_name || 'Gemini'})
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-0.5">{auditResult.target_url}</span>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-[10px] text-slate-400 block uppercase font-semibold">Measured SEO Score</span>
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-xl font-extrabold text-emerald-400">{auditResult.seo_score}</span>
                    <span className="text-[11px] text-slate-400">/ 100</span>
                  </div>
                </div>
              </div>

              {/* Measurable HTML Technical Checks Breakdown */}
              {auditMeta?.inspection_checks && auditMeta.inspection_checks.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-slate-300 block text-[11px] uppercase tracking-wider">
                    Measurable Technical HTML Checks ({auditMeta.inspection_checks.length} verified):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {auditMeta.inspection_checks.map((chk: any) => (
                      <div
                        key={chk.id}
                        className="p-2 rounded-lg bg-kria-850 border border-kria-border/50 text-[11px] flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-semibold text-white truncate">{chk.title}</span>
                          <span
                            className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                              chk.status === 'pass'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : chk.status === 'warning'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {chk.status} ({chk.pointsAwarded}/{chk.maxPoints} pts)
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate" title={chk.evidence}>
                          {chk.evidence}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Mobile UX & Conversion Optimization Directives */}
              {auditResult.mobile_ux_notes && (
                <div className="p-3 rounded-lg bg-kria-850 border border-electric/30 text-xs">
                  <span className="font-bold text-electric-light block mb-1">Mobile UX & Conversion Guidance:</span>
                  <p className="text-slate-300 leading-relaxed text-[11px]">{auditResult.mobile_ux_notes}</p>
                </div>
              )}

              <div className="space-y-2">
                <span className="font-bold text-slate-300 block">Identified Opportunities & Recommendations:</span>
                {auditResult.detected_issues?.map((iss: any, i: number) => (
                  <div key={i} className="p-2.5 rounded-lg bg-kria-850 border border-kria-border/60 flex items-start justify-between gap-3">
                    <div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase mr-2 ${
                        iss.severity === 'critical' || iss.severity === 'high'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {iss.severity}
                      </span>
                      <strong className="text-white">{iss.issue}</strong>
                      <p className="text-slate-400 mt-1 text-[11px]">Recommended Fix: {iss.fix}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-kria-border">
                <p className="text-[11px] text-slate-400">
                  Submitting will create a formal proposal in the Approval Center for webmaster review.
                </p>

                {proposalSent ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4" />
                    Proposal Sent to Approval Queue
                  </span>
                ) : (
                  <button
                    onClick={handleSendWebsiteProposal}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-colors"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Submit Proposal to Approval Gate
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Add Keyword Form */}
        <div className="p-4 rounded-xl bg-kria-card border border-kria-border">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Target New Keyword
          </h3>
          <form onSubmit={handleAddKeyword} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="e.g. acrylic sandwich frame manufacturer coimbatore"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric"
            />
            <select
              value={intent}
              onChange={(e) => setIntent(e.target.value as any)}
              className="px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white"
            >
              <option value="commercial">Commercial Intent</option>
              <option value="transactional">Transactional Intent</option>
              <option value="informational">Informational Intent</option>
            </select>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="px-3 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white"
            >
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
            <button
              type="submit"
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-electric hover:bg-electric-dark text-white shadow-glow"
            >
              <Plus className="h-4 w-4" />
              Add Term
            </button>
          </form>
        </div>

        {/* Search Filter */}
        <div className="relative max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search keywords or cluster..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-kria-card border border-kria-border text-xs text-white placeholder-slate-400 focus:outline-none focus:border-electric"
          />
        </div>

        {/* Keywords Table */}
        <div className="rounded-xl bg-kria-card border border-kria-border overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-kria-850 border-b border-kria-border text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Keyword</th>
                  <th className="px-4 py-3">Cluster</th>
                  <th className="px-4 py-3">Search Intent</th>
                  <th className="px-4 py-3">Est. Volume / Mo</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Target Landing Page</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kria-border text-slate-300">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No tracked keywords yet. Add high-intent acrylic framing terms or run the SEO Strategy Agent above.
                    </td>
                  </tr>
                ) : (
                  filtered.map((kw) => (
                  <tr key={kw.id} className="hover:bg-kria-surface/70 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <span>{kw.keyword}</span>
                        {kw.is_demo && <DemoBadge />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{kw.cluster || 'General'}</td>
                    <td className="px-4 py-3 capitalize">
                      <span className="px-2 py-0.5 rounded text-[10px] bg-kria-800 text-electric-light border border-kria-border">
                        {kw.search_intent || 'commercial'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {kw.verified_search_volume ? `${kw.verified_search_volume.toLocaleString()}/mo` : 'Pending GSC'}
                    </td>
                    <td className="px-4 py-3 uppercase font-bold text-[10px]">
                      <span
                        className={
                          kw.priority === 'high'
                            ? 'text-rose-400'
                            : kw.priority === 'medium'
                            ? 'text-amber-400'
                            : 'text-slate-400'
                        }
                      >
                        {kw.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                      {kw.target_page || '/'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {kw.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
