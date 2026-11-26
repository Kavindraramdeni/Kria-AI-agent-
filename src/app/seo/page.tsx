'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { DemoBadge } from '@/components/ui/demo-badge';
import { getSeoKeywords } from '@/lib/services/seo-keywords';
import { createApprovalRequest } from '@/lib/services/approvals';
import { SEOKeyword } from '@/types/database';
import {
  Search,
  Plus,
  AlertCircle,
  Globe,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  Layers,
  Gauge,
  Zap,
  Code,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export default function SEOStudioPage() {
  const [keywords, setKeywords] = useState<SEOKeyword[]>([]);
  const [search, setSearch] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [intent, setIntent] = useState<'commercial' | 'transactional' | 'informational'>('commercial');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('high');
  const [cluster] = useState('Magnetic Frames');

  // AI SEO Strategy Generator State (Phase 2B)
  const [strategyPrompt, setStrategyPrompt] = useState('Magnetic Acrylic Fridge Frames & Return Gifts');
  const [generatingStrategy, setGeneratingStrategy] = useState(false);
  const [strategyResult, setStrategyResult] = useState<any | null>(null);
  const [strategyMeta, setStrategyMeta] = useState<{
    execution_mode: string;
    model_name?: string;
  } | null>(null);
  const [strategyApprovalSent, setStrategyApprovalSent] = useState(false);

  // Real Technical SEO & Core Web Vitals Scanner State (Phase 3)
  const [scannerUrl, setScannerUrl] = useState('https://kriatech.in');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scannerProposalSent, setScannerProposalSent] = useState(false);
  const [selectedIssueCategory, setSelectedIssueCategory] = useState<'all' | 'seo' | 'performance' | 'mobile_ux' | 'schema'>('all');

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

  async function handleRunDeepScan(e: React.FormEvent) {
    e.preventDefault();
    if (!scannerUrl.trim()) return;

    setScanning(true);
    setScanResult(null);
    setScannerError(null);
    setScannerProposalSent(false);

    try {
      const res = await fetch('/api/seo/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: scannerUrl.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.scan) {
        setScanResult(data.scan);
      } else {
        setScannerError(data.error || 'Failed to complete website scan.');
      }
    } catch (err: any) {
      console.error('SEO Scanner error:', err);
      setScannerError('Could not connect to SEO scanner endpoint.');
    } finally {
      setScanning(false);
    }
  }

  async function handleSendScannerProposal() {
    if (!scanResult) return;

    const res = await createApprovalRequest({
      action_type: 'website_change',
      title: `Technical SEO & Core Web Vitals Remediation: ${scanResult.url} (${scanResult.scores.overall}/100)`,
      proposed_content: {
        target_url: scanResult.url,
        overall_score: scanResult.scores.overall,
        scores: scanResult.scores,
        critical_issues: scanResult.issues.filter((i: any) => i.severity === 'critical' || i.severity === 'high'),
        ai_priorities: scanResult.aiRemediation?.topPriorities || [],
      },
      destination: `Live Website Production (${scanResult.url})`,
      agent_id: 'website-agent',
      risk_level: 'high',
    });

    if (res.success) {
      setScannerProposalSent(true);
    }
  }

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

  const filteredKeywords = keywords.filter((k) =>
    k.keyword.toLowerCase().includes(search.toLowerCase()) ||
    (k.cluster && k.cluster.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredIssues = scanResult?.issues?.filter((i: any) =>
    selectedIssueCategory === 'all' ? true : i.category === selectedIssueCategory
  ) || [];

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

        {/* Real Website SEO Scanner & Core Web Vitals Engine (Phase 3) */}
        <div className="p-5 rounded-xl bg-kria-card border border-kria-border shadow-card space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-electric-light" />
                Live Website Technical SEO & Core Web Vitals Scanner (Phase 3)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Fetches target URL over network, audits DOM hierarchy, measures TTFB latency, diagnoses CLS risks, and verifies Schema.org Rich Results.
              </p>
            </div>
            {scanResult && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold border ${
                scanResult.executionMode === 'live_network'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {scanResult.executionMode === 'live_network' ? '⚡ Live Network Scan' : '🧪 Mock Diagnostics'}
              </span>
            )}
          </div>

          <form onSubmit={handleRunDeepScan} className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              required
              value={scannerUrl}
              onChange={(e) => setScannerUrl(e.target.value)}
              placeholder="https://kriatech.in"
              className="flex-1 px-3.5 py-2.5 rounded-lg bg-kria-850 border border-kria-border text-xs text-white focus:outline-none focus:border-electric font-mono"
            />
            <button
              type="submit"
              disabled={scanning}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold bg-electric hover:bg-electric-dark text-white disabled:opacity-50 shadow-glow flex-shrink-0 transition-colors"
            >
              {scanning ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Fetching & Auditing DOM...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Perform Real SEO Scan
                </>
              )}
            </button>
          </form>

          {scannerError && (
            <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
              <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block">Scan Terminated / Connection Blocked:</span>
                <span className="font-mono text-[11px]">{scannerError}</span>
              </div>
            </div>
          )}

          {/* Comprehensive Scan Diagnostic Dashboard */}
          {scanResult && (
            <div className="p-5 rounded-xl bg-kria-surface border border-kria-border text-xs space-y-5">
              {/* Top Banner: URL, Mode, and Overall Score */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-kria-border gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase bg-kria-850 text-slate-300 px-2 py-0.5 rounded border border-kria-border">
                      Status {scanResult.network.statusCode} ({scanResult.network.statusText})
                    </span>
                    <span className="font-bold text-white text-sm font-mono truncate max-w-md">
                      {scanResult.url}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 block font-mono">
                    Scanned at: {new Date(scanResult.timestamp).toLocaleString()} • {scanResult.network.payloadSizeKb} KB ({scanResult.dom.semanticHtml.hasMain ? 'Semantic HTML5' : 'Non-semantic layout'})
                  </span>
                </div>

                <div className="flex items-center gap-4 bg-kria-850 p-2.5 rounded-xl border border-kria-border flex-shrink-0">
                  <div className="text-right">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block">Weighted Overall Score</span>
                    <span className="text-2xl font-black text-white font-mono">
                      {scanResult.scores.overall}
                      <span className="text-xs text-slate-400 font-normal">/100</span>
                    </span>
                  </div>
                  <div className={`p-2.5 rounded-lg font-bold text-xs uppercase ${
                    scanResult.scores.overall >= 80
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : scanResult.scores.overall >= 60
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {scanResult.scores.overall >= 80 ? 'Grade A (Optimal)' : scanResult.scores.overall >= 60 ? 'Grade B (Action Required)' : 'Grade C (Poor)'}
                  </div>
                </div>
              </div>

              {/* 4 Multi-Category Mathematical Score Gauges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-kria-850 border border-kria-border/70 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-blue-400" />
                    Technical SEO
                  </span>
                  <div className="my-2">
                    <span className="text-2xl font-black text-blue-400 font-mono">{scanResult.scores.seoHealth}</span>
                    <span className="text-slate-400 text-xs">/100</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    H1: {scanResult.dom.headings.h1Count} • Meta: {scanResult.dom.metaDescription.status}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-kria-850 border border-kria-border/70 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    Performance & CWV
                  </span>
                  <div className="my-2">
                    <span className="text-2xl font-black text-amber-400 font-mono">{scanResult.scores.performance}</span>
                    <span className="text-slate-400 text-xs">/100</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Latency: {scanResult.network.requestResponseStartMs ?? scanResult.network.ttfbMs}ms • Scripts: {scanResult.coreWebVitals.renderBlockingScriptsCount}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-kria-850 border border-kria-border/70 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <Gauge className="h-3.5 w-3.5 text-purple-400" />
                    Mobile UX & Access
                  </span>
                  <div className="my-2">
                    <span className="text-2xl font-black text-purple-400 font-mono">{scanResult.scores.mobileUx}</span>
                    <span className="text-slate-400 text-xs">/100</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Missing Alt: {scanResult.dom.images.missingAlt} of {scanResult.dom.images.total}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-kria-850 border border-kria-border/70 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    Structured Data
                  </span>
                  <div className="my-2">
                    <span className="text-2xl font-black text-emerald-400 font-mono">{scanResult.scores.structuredData}</span>
                    <span className="text-slate-400 text-xs">/100</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Rich Results: {scanResult.schema.productSchema.googleRichResultsEligible ? 'Eligible' : 'Ineligible'}
                  </span>
                </div>
              </div>

              {/* Core Web Vitals Diagnostic Strip */}
              <div className="p-4 rounded-xl bg-kria-850 border border-kria-border space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    Core Web Vitals Server Diagnostics & Static Asset Risk Heuristics
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    Est. LCP Risk: ~{scanResult.coreWebVitals.estimatedLcpHeuristicMs ?? scanResult.coreWebVitals.estimatedLcpMs}ms • Est. CLS Risk: {scanResult.coreWebVitals.estimatedClsHazardScore ?? scanResult.coreWebVitals.estimatedClsScore}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  * Note: Server request-to-response start latency and DOM asset counts are directly measured. LCP and CLS figures are predictive static heuristics; INP and real layout shifts require real-user monitoring (RUM) field data.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-kria-surface border border-kria-border/60">
                    <span className="text-slate-400 text-[10px] block">Req &rarr; Resp Start</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-bold text-white font-mono">{scanResult.network.requestResponseStartMs ?? scanResult.network.ttfbMs} ms</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                        (scanResult.coreWebVitals.requestResponseRating ?? scanResult.coreWebVitals.ttfbRating) === 'good'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : (scanResult.coreWebVitals.requestResponseRating ?? scanResult.coreWebVitals.ttfbRating) === 'needs-improvement'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {scanResult.coreWebVitals.requestResponseRating ?? scanResult.coreWebVitals.ttfbRating}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-kria-surface border border-kria-border/60">
                    <span className="text-slate-400 text-[10px] block">Render-Blocking Assets</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-bold text-white font-mono">
                        {scanResult.coreWebVitals.renderBlockingScriptsCount} scripts
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                        scanResult.coreWebVitals.renderBlockingScriptsCount === 0
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {scanResult.coreWebVitals.renderBlockingScriptsCount === 0 ? 'Optimal' : 'Hazard'}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-kria-surface border border-kria-border/60">
                    <span className="text-slate-400 text-[10px] block">CLS Image Dimension Hazards</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-bold text-white font-mono">
                        {scanResult.dom.images.missingDimensions} of {scanResult.dom.images.total}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                        scanResult.dom.images.missingDimensions === 0
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {scanResult.dom.images.missingDimensions === 0 ? 'Pass' : 'CLS Risk'}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-kria-surface border border-kria-border/60">
                    <span className="text-slate-400 text-[10px] block">Payload Compression</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-bold text-white font-mono">
                        {scanResult.network.payloadSizeKb} KB
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                        scanResult.network.isCompressed
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {scanResult.network.isCompressed ? 'Active' : 'Missing Gzip'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Schema.org Google Rich Results Compliance Diagnostic */}
              <div className="p-4 rounded-xl bg-kria-850 border border-kria-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Code className="h-3.5 w-3.5 text-emerald-400" />
                    Schema.org JSON-LD & Google Rich Results Verification
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    scanResult.schema.productSchema.googleRichResultsEligible
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {scanResult.schema.productSchema.googleRichResultsEligible
                      ? '✓ Google Rich Results Eligible'
                      : '✗ Ineligible for Price Snippets'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                  <div className="p-2 rounded-lg bg-kria-surface border border-kria-border/50">
                    <span className="text-slate-400 text-[10px] block">Product Entity</span>
                    <span className="font-semibold text-white block mt-0.5">
                      {scanResult.schema.productSchema.found ? (
                        <span className="text-emerald-400">✓ Declared ({scanResult.schema.productSchema.name || 'Unnamed'})</span>
                      ) : (
                        <span className="text-rose-400">✗ Missing @type: Product</span>
                      )}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-kria-surface border border-kria-border/50">
                    <span className="text-slate-400 text-[10px] block">B2B Wholesale AggregateOffer</span>
                    <span className="font-semibold text-white block mt-0.5">
                      {scanResult.schema.productSchema.hasAggregateOffer ? (
                        <span className="text-emerald-400">✓ Tier Pricing Configured</span>
                      ) : scanResult.schema.productSchema.hasOffers ? (
                        <span className="text-amber-400">! Retail Only (Missing Tier AggregateOffer)</span>
                      ) : (
                        <span className="text-rose-400">✗ Missing Offers</span>
                      )}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-kria-surface border border-kria-border/50">
                    <span className="text-slate-400 text-[10px] block">Organization Entity</span>
                    <span className="font-semibold text-white block mt-0.5">
                      {scanResult.schema.organizationSchema.found ? (
                        <span className="text-emerald-400">✓ Declared ({scanResult.schema.organizationSchema.name || 'KRIA TECH'})</span>
                      ) : (
                        <span className="text-slate-400">— Not declared</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Gemini AI Strategic Remediation Synthesis */}
              {scanResult.aiRemediation && (
                <div className="p-4 rounded-xl bg-kria-850 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      Gemini Technical Remediation Strategy ({scanResult.aiRemediation.modelName})
                    </span>
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed">
                    {scanResult.aiRemediation.summary}
                  </p>

                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">High-Priority Technical Directives:</span>
                    <ul className="list-disc list-inside space-y-1 text-slate-300 text-xs">
                      {scanResult.aiRemediation.topPriorities.map((item: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">{item}</li>
                      ))}
                    </ul>
                  </div>

                  {scanResult.aiRemediation.mobileActionDirective && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px]">
                      <strong>Mobile Direct Action:</strong> {scanResult.aiRemediation.mobileActionDirective}
                    </div>
                  )}
                </div>
              )}

              {/* Measured Code & Structural Issues Drawer */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-bold text-slate-200 block text-xs uppercase tracking-wider">
                    Measurable Structural Issues ({scanResult.issues.length} detected):
                  </span>
                  <div className="flex items-center gap-1.5">
                    {(['all', 'seo', 'performance', 'mobile_ux', 'schema'] as const).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedIssueCategory(cat)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase transition-colors ${
                          selectedIssueCategory === cat
                            ? 'bg-electric text-white'
                            : 'bg-kria-850 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  {filteredIssues.length === 0 ? (
                    <div className="p-3 text-center text-slate-400 text-xs bg-kria-850 rounded-lg">
                      No issues detected for category &apos;{selectedIssueCategory}&apos;.
                    </div>
                  ) : (
                    filteredIssues.map((iss: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-kria-850 border border-kria-border/70 space-y-2 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                              iss.severity === 'critical'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : iss.severity === 'high'
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                : iss.severity === 'medium'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-slate-500/20 text-slate-300'
                            }`}>
                              {iss.severity}
                            </span>
                            <span className="text-[10px] font-mono uppercase text-slate-400">
                              [{iss.category}]
                            </span>
                            <span className="font-semibold text-white">{iss.issue}</span>
                          </div>
                        </div>

                        <p className="text-slate-400 text-[11px] leading-relaxed">
                          <strong>Impact:</strong> {iss.impact}
                        </p>
                        <p className="text-emerald-400 text-[11px] leading-relaxed">
                          <strong>Fix:</strong> {iss.fix}
                        </p>

                        {iss.codeSnippet && (
                          <div className="mt-1.5 p-2 rounded bg-kria-surface border border-kria-border font-mono text-[10px] text-slate-300 overflow-x-auto">
                            <code>{iss.codeSnippet}</code>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Submit Remediation Proposal to Human Approval Gate */}
              <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-kria-border">
                <p className="text-[11px] text-slate-400">
                  {scanResult.savedAuditId ? `Audit saved to Supabase (ID: ${scanResult.savedAuditId.slice(0, 8)}...). ` : ''}
                  Submitting will create an approval request for the webmaster to deploy changes.
                </p>

                {scannerProposalSent ? (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4" />
                    Remediation Proposal Queued for Approval
                  </span>
                ) : (
                  <button
                    onClick={handleSendScannerProposal}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white transition-colors"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Submit Remediation to Human Approval Gate
                  </button>
                )}
              </div>
            </div>
          )}
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

              {strategyResult.reasoning_summary && (
                <div className="p-3 rounded-lg bg-kria-850 border border-kria-border/60">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Commercial Strategy Reasoning</span>
                  <p className="text-slate-300 text-xs leading-relaxed">{strategyResult.reasoning_summary}</p>
                </div>
              )}

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

              {strategyResult.content_gap_analysis && (
                <div className="p-3 rounded-lg bg-kria-850 border border-kria-border/60">
                  <span className="text-[10px] uppercase font-bold text-amber-400 block mb-1">Competitor & Content Gap Analysis</span>
                  <p className="text-slate-300 text-xs leading-relaxed">{strategyResult.content_gap_analysis}</p>
                </div>
              )}

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
                {filteredKeywords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No tracked keywords yet. Add high-intent acrylic framing terms or run the SEO Strategy Agent above.
                    </td>
                  </tr>
                ) : (
                  filteredKeywords.map((kw) => (
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
