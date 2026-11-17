'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, Lock, Mail, ArrowRight, UserCheck, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@kriatech.com');
  const [password, setPassword] = useState('kria-demo-pass-2026');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedRole, setSelectedRole] = useState<'owner' | 'staff'>('owner');

  const supabase = createClient();
  const isLiveSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
  );

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      if (isLiveSupabase) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setErrorMessage(error.message);
          setLoading(false);
          return;
        }
      }

      // Set cookie for session persistence (both for live and demo fallback)
      document.cookie = `kria_demo_user=${email}; path=/; max-age=604800; SameSite=Lax`;

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  function handleQuickDemoSelect(role: 'owner' | 'staff') {
    setSelectedRole(role);
    if (role === 'owner') {
      setEmail('admin@kriatech.com');
      setPassword('kria-owner-key-2026');
    } else {
      setEmail('staff@kriatech.com');
      setPassword('kria-staff-key-2026');
    }
  }

  return (
    <div className="min-h-screen bg-kria-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-electric/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-tr from-electric-dark to-electric text-white font-black text-xl shadow-glow mb-2">
            K
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-wider flex items-center justify-center gap-2">
            KRIA AI
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-electric/20 text-electric-light border border-electric/30 uppercase tracking-widest">
              Ops Command
            </span>
          </h1>
          <p className="text-xs text-slate-400">
            Sign in to access KRIA TECH manufacturing, CRM & AI center
          </p>
        </div>

        {/* Login Card */}
        <div className="p-6 rounded-2xl bg-kria-card border border-kria-border shadow-card space-y-5">
          {/* Quick Role Preset Picker */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Quick Role Preset
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoSelect('owner')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedRole === 'owner'
                    ? 'bg-electric/20 border-electric text-white shadow-glow'
                    : 'bg-kria-850 border-kria-border text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <UserCheck className="h-3.5 w-3.5 text-electric-light" />
                  Owner Role
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Full approval & financial control</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemoSelect('staff')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  selectedRole === 'staff'
                    ? 'bg-electric/20 border-electric text-white shadow-glow'
                    : 'bg-kria-850 border-kria-border text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <UserCheck className="h-3.5 w-3.5 text-amber-400" />
                  Staff Role
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Catalog & CRM (Gate restricted)</p>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 pl-9 rounded-lg bg-kria-850 border border-kria-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-electric"
                  placeholder="name@kriatech.com"
                />
                <Mail className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2 pl-9 rounded-lg bg-kria-850 border border-kria-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-electric"
                  placeholder="••••••••••••"
                />
                <Lock className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-xs font-bold bg-electric hover:bg-electric-dark text-white flex items-center justify-center gap-2 transition-colors shadow-glow disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" />
              {loading ? 'Authenticating...' : `Sign In as ${selectedRole.toUpperCase()}`}
            </button>
          </form>

          {/* Security Notice */}
          <div className="pt-3 border-t border-kria-border/70 flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="h-4 w-4 text-electric-light flex-shrink-0" />
            <span>Encrypted credentials. Row-Level Security enforced at database level.</span>
          </div>
        </div>

        {/* Mode Info */}
        <p className="text-center text-[11px] text-slate-500">
          {isLiveSupabase ? '🟢 Connected to Live Cloud Supabase' : '🟡 Offline Development Mode Active'}
        </p>
      </div>
    </div>
  );
}
