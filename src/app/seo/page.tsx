'use client';

import React, { useState } from 'react';
import { Header } from '@/components/layout/header';
import { DemoBadge } from '@/components/ui/demo-badge';
import { DEMO_SEO_KEYWORDS } from '@/lib/demo-data';
import { SEOKeyword } from '@/types/database';
import { Search, Plus, AlertCircle } from 'lucide-react';

export default function SEOStudioPage() {
  const [keywords, setKeywords] = useState<SEOKeyword[]>(DEMO_SEO_KEYWORDS);
  const [search, setSearch] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [intent, setIntent] = useState<'commercial' | 'transactional' | 'informational'>('commercial');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('high');
  const [cluster] = useState('Magnetic Frames');

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
      verified_search_volume: null, // Transparently null until real API is connected
      source: 'manual',
      is_demo: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setKeywords([item, ...keywords]);
    setNewKeyword('');
  }

  const filtered = keywords.filter((k) =>
    k.keyword.toLowerCase().includes(search.toLowerCase()) ||
    (k.cluster && k.cluster.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <Header
        title="SEO Strategy & Keyword Studio"
        subtitle="Organic search visibility, high-intent clusters and keyword targeting for KRIA TECH"
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* Transparent Notice */}
        <div className="p-4 rounded-xl bg-kria-card border border-kria-border flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 mt-0.5">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Truth in Search Data</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              In strict accordance with KRIA AI guidelines, search volumes and ranking positions are never fabricated. Seed volumes reflect baseline industry benchmarks, and live Google Search Console integration can be activated via Settings once OAuth credentials are configured.
            </p>
          </div>
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
                {filtered.map((kw) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
