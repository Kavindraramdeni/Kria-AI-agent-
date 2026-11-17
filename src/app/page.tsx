'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { DemoBadge } from '@/components/ui/demo-badge';
import {
  Users,
  Package,
  Search,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { getProducts } from '@/lib/services/products';
import { getLeads } from '@/lib/services/leads';
import { getApprovals } from '@/lib/services/approvals';
import { getActivityLogs } from '@/lib/services/activity-logs';
import { Product, Lead, ActivityLog } from '@/types/database';
import { ApprovalRequest } from '@/types/approval';

export default function OverviewPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [prodRes, leadRes, apprRes, actRes] = await Promise.all([
          getProducts(),
          getLeads(),
          getApprovals(),
          getActivityLogs(),
        ]);
        setProducts(prodRes.data);
        setLeads(leadRes.data);
        setApprovals(apprRes.data);
        setActivities(actRes.data);
      } catch (err) {
        console.error('Failed loading dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.status === 'new').length;
  const qualifiedLeads = leads.filter((l) => l.status === 'qualified' || l.status === 'negotiation').length;
  const pendingApprovals = approvals.filter((a) => a.status === 'pending').length;
  const totalProducts = products.length;

  return (
    <>
      <Header
        title="Executive Overview"
        subtitle="KRIA TECH Acrylic Manufacturing & Marketing Command Center"
      />

      <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Safety Gate Alert Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-kria-850 to-kria-900 border border-electric/30 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-electric/10 border border-electric/30 text-electric-light mt-0.5 sm:mt-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-sm">Strict Approval Gate Active</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  GUARDED
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Zero automated publishing, ad spend, or live website modifications. All agent outputs require manual review.
              </p>
            </div>
          </div>
          <Link
            href="/approvals"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-electric hover:bg-electric-dark text-white transition-colors flex-shrink-0 shadow-glow"
          >
            Review Pending Queue ({pendingApprovals})
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Real Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Leads */}
          <div className="p-4 rounded-xl bg-kria-card border border-kria-border hover:border-kria-600 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Leads in CRM</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white tracking-tight">
                {loading ? '...' : totalLeads}
              </span>
              <span className="text-xs text-slate-400">in pipeline</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-kria-border/60 pt-2">
              <span>New: <strong className="text-slate-200">{newLeads}</strong></span>
              <span>Qualified: <strong className="text-emerald-400">{qualifiedLeads}</strong></span>
            </div>
          </div>

          {/* Card 2: Pending Approvals */}
          <div className="p-4 rounded-xl bg-kria-card border border-kria-border hover:border-kria-600 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Pending Approvals</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-400 tracking-tight">
                {loading ? '...' : pendingApprovals}
              </span>
              <span className="text-xs text-slate-400">action gates</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-kria-border/60 pt-2">
              <span>Risk: 1 Critical</span>
              <Link href="/approvals" className="text-electric-light hover:underline font-medium">
                Resolve now
              </Link>
            </div>
          </div>

          {/* Card 3: Products Catalog */}
          <div className="p-4 rounded-xl bg-kria-card border border-kria-border hover:border-kria-600 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Active Products</span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Package className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white tracking-tight">
                {loading ? '...' : totalProducts}
              </span>
              <span className="text-xs text-slate-400">in catalog</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-kria-border/60 pt-2">
              <span>Focus: Magnetic Acrylics</span>
              <Link href="/products" className="text-electric-light hover:underline font-medium">
                View all
              </Link>
            </div>
          </div>

          {/* Card 4: AI Agents Ready */}
          <div className="p-4 rounded-xl bg-kria-card border border-kria-border hover:border-kria-600 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">AI Agents Configured</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white tracking-tight">6</span>
              <span className="text-xs text-slate-400">specialized roles</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between border-t border-kria-border/60 pt-2">
              <span>Status: <strong className="text-emerald-400">Structured Safe</strong></span>
              <Link href="/agents" className="text-electric-light hover:underline font-medium">
                Manage
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="p-4 rounded-xl bg-kria-card border border-kria-border">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Quick Operational Actions
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Link
              href="/leads"
              className="p-3 rounded-lg bg-kria-surface hover:bg-kria-hover border border-kria-border hover:border-electric/40 text-left transition-all group"
            >
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Users className="h-4 w-4" />
              </div>
              <p className="text-xs font-bold text-white">Add New Lead</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Capture buyer details</p>
            </Link>

            <Link
              href="/products"
              className="p-3 rounded-lg bg-kria-surface hover:bg-kria-hover border border-kria-border hover:border-electric/40 text-left transition-all group"
            >
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Package className="h-4 w-4" />
              </div>
              <p className="text-xs font-bold text-white">Add Product</p>
              <p className="text-[11px] text-slate-400 mt-0.5">SKU & bulk pricing</p>
            </Link>

            <Link
              href="/seo"
              className="p-3 rounded-lg bg-kria-surface hover:bg-kria-hover border border-kria-border hover:border-electric/40 text-left transition-all group"
            >
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Search className="h-4 w-4" />
              </div>
              <p className="text-xs font-bold text-white">Research Keyword</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Discover buyer intent</p>
            </Link>

            <Link
              href="/content"
              className="p-3 rounded-lg bg-kria-surface hover:bg-kria-hover border border-kria-border hover:border-electric/40 text-left transition-all group"
            >
              <div className="h-8 w-8 rounded-lg bg-pink-500/10 text-pink-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Sparkles className="h-4 w-4" />
              </div>
              <p className="text-xs font-bold text-white">Generate Content</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Product & social drafts</p>
            </Link>

            <Link
              href="/competitors"
              className="p-3 rounded-lg bg-kria-surface hover:bg-kria-hover border border-kria-border hover:border-electric/40 text-left transition-all group"
            >
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <TrendingUp className="h-4 w-4" />
              </div>
              <p className="text-xs font-bold text-white">Competitor Gap</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Benchmark market</p>
            </Link>
          </div>
        </div>

        {/* Two-Column Lower Section: Pending Approvals & High-Priority Leads */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section A: Pending Approvals Queue */}
          <div className="p-5 rounded-xl bg-kria-card border border-kria-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                <h3 className="text-sm font-bold text-white">Pending Approval Queue</h3>
              </div>
              <Link href="/approvals" className="text-xs text-electric-light hover:underline font-medium">
                View All Approvals &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              {approvals.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-kria-surface border border-kria-border hover:border-kria-600 transition-all flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-200 line-clamp-1">
                      {item.title}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        item.risk_level === 'critical'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : item.risk_level === 'high'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      }`}
                    >
                      {item.risk_level} Risk
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Dest: <strong className="text-slate-300">{item.destination}</strong></span>
                    <span className="text-amber-400 font-medium">Pending Review</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section B: Recent Audit & Activity Logs */}
          <div className="p-5 rounded-xl bg-kria-card border border-kria-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-electric-light" />
                <h3 className="text-sm font-bold text-white">Recent Activity & Audit Trail</h3>
              </div>
              <Link href="/activity" className="text-xs text-electric-light hover:underline font-medium">
                View Full Audit Logs &rarr;
              </Link>
            </div>

            <div className="space-y-3">
              {activities.slice(0, 4).map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-lg bg-kria-surface border border-kria-border/60 flex items-start justify-between gap-3 text-xs"
                >
                  <div>
                    <p className="text-slate-200 font-medium">{act.description}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Actor: <span className="text-slate-300">{act.actor_id || 'System'}</span> ({act.actor_type})
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">
                    {new Date(act.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Priority Product Spotlight: Magnetic Acrylic Photo Frames */}
        <div className="p-5 rounded-xl bg-gradient-to-br from-kria-card to-kria-surface border border-electric/20">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">Focus Priority: Magnetic Acrylic Photo Frames</h3>
                <DemoBadge />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Target retail and wholesale buyers (photographers, gift shops, wedding planners, corporate awards).
              </p>
            </div>
            <Link
              href="/products"
              className="text-xs font-semibold text-electric-light hover:text-white flex items-center gap-1"
            >
              Explore Frame Catalog <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {products
              .filter((p) => p.category === 'Photo Frames')
              .slice(0, 3)
              .map((frame) => (
                <div
                  key={frame.id}
                  className="p-4 rounded-lg bg-kria-850/80 border border-kria-border flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-slate-100">{frame.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-kria-800 text-slate-300">
                        {frame.sku}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-2">{frame.description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-kria-border flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-400">Retail: </span>
                      <strong className="text-white">₹{frame.retail_price}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Bulk (≥{frame.min_bulk_quantity}): </span>
                      <strong className="text-emerald-400">₹{frame.bulk_price}</strong>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </main>
    </>
  );
}
