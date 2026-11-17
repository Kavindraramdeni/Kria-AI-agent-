'use client';

import React, { useEffect, useState } from 'react';
import { Header } from '@/components/layout/header';
import { getLeads } from '@/lib/services/leads';
import { getProducts } from '@/lib/services/products';
import { Lead, Product } from '@/types/database';
import { TrendingUp, Users, Package } from 'lucide-react';

export default function AnalyticsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function load() {
      const [lRes, pRes] = await Promise.all([getLeads(), getProducts()]);
      setLeads(lRes.data);
      setProducts(pRes.data);
    }
    load();
  }, []);

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
