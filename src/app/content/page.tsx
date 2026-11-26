'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { DemoBadge } from '@/components/ui/demo-badge';
import { createApprovalRequest } from '@/lib/services/approvals';
import { getContentItems } from '@/lib/services/content-items';
import { isDemoModeActive } from '@/lib/demo-mode';
import { ContentItem } from '@/types/database';
import { Copy, Check, Sparkles, PenTool } from 'lucide-react';

const OPTIONAL_DEMO_CONTENT: ContentItem[] = [
  {
    id: 'cnt-001',
    title: 'B2B Carousel: Why KRIA 2mm + 2mm Magnetic Acrylic Fridge Frames Lead Retail Margins [DEMO]',
    content_type: 'instagram_caption',
    body: `Upgrade your gift store or photo studio margins with factory-direct KRIA Tech magnetic acrylic frames from Hyderabad, Telangana! ✨

1. 100% Cell-Cast Monolithic 2mm + 2mm (4mm Dual-Plate) Acrylic — 93% optical clarity.
2. 8 Grade N35 Flush Neodymium Magnets per Frame — High hold with minimal contact friction.
3. Accessible MOQ 50 pcs — Or test quality first with our Demo Starter Kit (KRA-KIT-DEMO24): 24 pcs for ₹999 with free pan-India air delivery!

Order via https://kriatech.in | WhatsApp: +91-9392576792 | Email: sales@kriatech.in
#KRIAtech #AcrylicPhotoFrame #B2BWholesale`,
    target_audience: 'Souvenir gift shop owners, wedding planners, photo studios',
    objective: 'Drive Demo Starter Kit and MOQ 50 bulk inquiries',
    keywords: ['magnetic acrylic photo frame', 'acrylic fridge magnet wholesale', 'kriatech.in'],
    suggested_cta: 'WhatsApp +91-9392576792 or visit https://kriatech.in',
    status: 'review',
    generated_by_agent_task_id: null,
    scheduled_for: new Date(Date.now() + 86400000 * 2).toISOString(),
    is_demo: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export default function ContentStudioPage() {
  const [contentList, setContentList] = useState<ContentItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [approvalSentId, setApprovalSentId] = useState<string | null>(null);

  useEffect(() => {
    async function loadContent() {
      const res = await getContentItems();
      if (res.data && res.data.length > 0) {
        setContentList(res.data);
      } else if (isDemoModeActive()) {
        setContentList(OPTIONAL_DEMO_CONTENT);
      } else {
        setContentList([]);
      }
    }
    loadContent();
  }, []);

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  async function handleSendToApproval(item: ContentItem) {
    const res = await createApprovalRequest({
      action_type: 'content_publish',
      title: `Publish: ${item.title}`,
      proposed_content: {
        body: item.body,
        keywords: item.keywords,
        content_type: item.content_type,
      },
      destination: 'Instagram / Social Outbox',
      risk_level: 'medium',
    });

    if (res.success) {
      setApprovalSentId(item.id);
      setTimeout(() => setApprovalSentId(null), 3500);
    } else {
      alert('Failed to submit content to Approval Gate.');
    }
  }

  return (
    <>
      <Header
        title="Marketing Content & Publishing Studio"
        subtitle="Manage articles, SEO product copy, social scripts and publication approvals"
      />

      <main className="p-6 max-w-7xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Total Content Drafts: <strong className="text-white">{contentList.length}</strong></span>
          </div>

          <Link
            href="/agents"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-electric hover:bg-electric-dark text-white transition-colors shadow-glow"
          >
            <Sparkles className="h-4 w-4" />
            Generate New Content with AI
          </Link>
        </div>

        {contentList.length === 0 ? (
          <div className="p-12 rounded-xl bg-kria-card border border-kria-border text-center space-y-3 shadow-card">
            <div className="inline-flex p-3 rounded-xl bg-kria-800 text-slate-400">
              <PenTool className="h-6 w-6" />
            </div>
            <h3 className="text-sm font-bold text-white">No Content Drafts Yet</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Your content library is empty. Use the Content Studio Agent to generate product descriptions, Instagram captions, or reels scripts grounded in factory truth.
            </p>
            <div className="pt-2">
              <Link
                href="/agents"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-electric hover:bg-electric-dark text-white transition-colors shadow-glow"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate First Piece of Content
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {contentList.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-xl bg-kria-card border border-kria-border hover:border-kria-600 transition-all space-y-4 shadow-card"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-kria-border/60 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-kria-800 text-electric-light uppercase tracking-wider">
                        {item.content_type.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">
                        Status: {item.status}
                      </span>
                      {item.is_demo && <DemoBadge />}
                    </div>
                    <h3 className="text-sm font-bold text-white mt-1">{item.title}</h3>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleCopy(item.body, item.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-kria-800 hover:bg-kria-700 text-slate-200 border border-kria-border transition-colors"
                    >
                      {copiedId === item.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedId === item.id ? 'Copied' : 'Copy'}
                    </button>

                    <button
                      onClick={() => handleSendToApproval(item)}
                      disabled={approvalSentId === item.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-electric hover:bg-electric-dark text-white disabled:opacity-50 transition-colors shadow-glow"
                    >
                      {approvalSentId === item.id ? 'Submitted to Gate' : 'Submit to Approval Gate'}
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-kria-850/80 border border-kria-border/60 text-xs text-slate-300 whitespace-pre-line leading-relaxed font-sans">
                  {item.body}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">Target Audience:</span>
                  <span>{item.target_audience}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
