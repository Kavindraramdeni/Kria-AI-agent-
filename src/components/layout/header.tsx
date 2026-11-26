'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Database, Sparkles, UserCheck, LogOut, Shield } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({ title = 'Command Center', subtitle = 'KRIA TECH Growth & Operations' }: HeaderProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ email: string; role: 'owner' | 'staff' }>({
    email: '',
    role: 'staff',
  });

  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
  );

  useEffect(() => {
    async function loadUser() {
      if (isSupabaseConfigured) {
        try {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', user.id)
              .single();

            setCurrentUser({
              email: user.email || 'sales@kriatech.in',
              role: (profile?.role as 'owner' | 'staff') || 'staff',
            });
          }
        } catch {
          // Keep current fallback state
        }
      }
    }
    loadUser();
  }, [isSupabaseConfigured]);

  async function handleSignOut() {
    if (isSupabaseConfigured) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }

    router.push('/login');
    router.refresh();
  }

  return (
    <header className="h-16 border-b border-kria-border bg-kria-900/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h1 className="text-base font-bold text-white tracking-tight">{title}</h1>
        <p className="text-xs text-slate-400 hidden sm:block">{subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Database Status Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isSupabaseConfigured
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
          }`}
          title={isSupabaseConfigured ? 'Connected to Supabase live instance' : 'Operating in resilient Demo Data mode. Configure .env.local for live database.'}
        >
          <Database className="h-3 w-3" />
          <span className="hidden md:inline">
            {isSupabaseConfigured ? 'Supabase Live' : 'Demo Mode (Offline Safe)'}
          </span>
        </div>

        {/* Quick Actions Dropdown / Direct Links */}
        <div className="hidden sm:flex items-center gap-2">
          <Link
            href="/sales-workflow"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-kria-800 hover:bg-kria-700 text-slate-200 border border-kria-border transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-electric-light" />
            Sales Workflow
          </Link>

          <Link
            href="/leads"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-kria-800 hover:bg-kria-700 text-slate-200 border border-kria-border transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-electric-light" />
            Add Lead
          </Link>

          <Link
            href="/products"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-kria-800 hover:bg-kria-700 text-slate-200 border border-kria-border transition-colors"
          >
            <Plus className="h-3.5 w-3.5 text-electric-light" />
            Add Product
          </Link>

          <Link
            href="/content"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-electric hover:bg-electric-dark text-white transition-colors shadow-glow"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Generate
          </Link>
        </div>

        {/* User Session & Role Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-kria-border">
          <div className="h-8 w-8 rounded-full bg-kria-800 border border-kria-border flex items-center justify-center text-slate-300">
            {currentUser.role === 'owner' ? (
              <Shield className="h-4 w-4 text-electric-light" />
            ) : (
              <UserCheck className="h-4 w-4 text-amber-400" />
            )}
          </div>
          <div className="hidden lg:block text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-200">
                {currentUser.role === 'owner' ? 'Owner Workspace' : 'Staff Workspace'}
              </span>
              <span
                className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                  currentUser.role === 'owner'
                    ? 'bg-electric/20 text-electric-light border border-electric/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {currentUser.role}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">{currentUser.email}</p>
          </div>

          <button
            onClick={handleSignOut}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-kria-800 rounded-lg transition-colors ml-1"
            aria-label="Sign Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
