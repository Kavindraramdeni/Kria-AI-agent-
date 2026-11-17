'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Bot,
  Package,
  Users,
  Search,
  PenTool,
  TrendingUp,
  Megaphone,
  CheckCircle2,
  BarChart3,
  History,
  Settings,
  Menu,
  X,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  isApprovalGate?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '/', icon: LayoutDashboard },
  { label: 'AI Agents', href: '/agents', icon: Bot, badge: '6' },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Leads & CRM', href: '/leads', icon: Users },
  { label: 'SEO Studio', href: '/seo', icon: Search },
  { label: 'Content Studio', href: '/content', icon: PenTool },
  { label: 'Competitor Research', href: '/competitors', icon: TrendingUp },
  { label: 'Campaigns', href: '/campaigns', icon: Megaphone },
  { label: 'Approvals', href: '/approvals', icon: CheckCircle2, isApprovalGate: true, badge: 'Gate' },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Activity Logs', href: '/activity', icon: History },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Top Bar Toggle */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-kria-900 border-b border-kria-border sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-electric flex items-center justify-center font-bold text-white shadow-glow">
            K
          </div>
          <span className="font-bold text-lg text-white tracking-wider">KRIA AI</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-kria-800 focus:outline-none"
          aria-label="Toggle Navigation"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 w-64 bg-kria-900 border-r border-kria-border flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-kria-border flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-electric-dark to-electric flex items-center justify-center font-black text-white shadow-glow">
              K
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-wide text-white">KRIA AI</span>
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-electric/20 text-electric-light border border-electric/30">
                  Command
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">KRIA TECH Operations</p>
            </div>
          </Link>
        </div>

        {/* Safety Gate Banner */}
        <div className="mx-3 mt-3 p-2.5 rounded-lg bg-kria-850 border border-electric/20 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-electric-light flex-shrink-0" />
          <p className="text-[11px] text-slate-300 leading-tight">
            <strong className="text-white">Strict Gate:</strong> External actions require human approval.
          </p>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-electric text-white shadow-glow'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-kria-800'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      'h-4 w-4 transition-colors',
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-electric-light'
                    )}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider',
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.isApprovalGate
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-kria-800 text-slate-400 border border-kria-border'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Workspace Footer */}
        <div className="p-3 border-t border-kria-border bg-kria-950/60">
          <div className="p-2.5 rounded-lg bg-kria-850 border border-kria-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <p className="text-xs font-semibold text-slate-200">KRIA Workspace</p>
                <p className="text-[10px] text-slate-400">Acrylic & Gifting Hub</p>
              </div>
            </div>
            <Zap className="h-3.5 w-3.5 text-electric-light" />
          </div>
        </div>
      </aside>
    </>
  );
}
