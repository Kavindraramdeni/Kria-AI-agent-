'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, Lock, Mail, ArrowRight, UserCheck, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const supabase = createClient();
  const isLiveSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder')
  );

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    if (!email.trim() || !password) {
      setErrorMessage('Please enter your email and password.');
      setLoading(false);
      return;
    }

    try {
      if (!isLiveSupabase) {
        setErrorMessage('Database authentication service is not configured.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error || !data.user) {
        setErrorMessage(error?.message || 'Invalid email or password.');
        setLoading(false);
        return;
      }

      router.push(redirect);
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  }

  // Pre-fill email only (never pre-fills passwords)
  function handleSelectEmailPreset(presetEmail: string) {
    setEmail(presetEmail);
    setPassword('');
    setErrorMessage('');
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
            Sign in with verified Supabase credentials to access KRIA TECH operations
          </p>
        </div>

        {/* Login Card */}
        <div className="p-6 rounded-2xl bg-kria-card border border-kria-border shadow-card space-y-5">
          {/* Quick Account Selector (Email only) */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Select Account
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectEmailPreset('admin@kriatech.com')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  email === 'admin@kriatech.com'
                    ? 'bg-electric/20 border-electric text-white shadow-glow'
                    : 'bg-kria-850 border-kria-border text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <UserCheck className="h-3.5 w-3.5 text-electric-light" />
                  Owner Account
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">admin@kriatech.com</p>
              </button>

              <button
                type="button"
                onClick={() => handleSelectEmailPreset('staff@kriatech.com')}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  email === 'staff@kriatech.com'
                    ? 'bg-electric/20 border-electric text-white shadow-glow'
                    : 'bg-kria-850 border-kria-border text-slate-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <UserCheck className="h-3.5 w-3.5 text-amber-400" />
                  Staff Account
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">staff@kriatech.com</p>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@kriatech.com"
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-electric"
                />
                <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-300">Password</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-kria-850 border border-kria-border text-xs text-white placeholder-slate-500 focus:outline-none focus:border-electric"
                />
                <Lock className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-electric hover:bg-electric-dark text-white font-semibold text-xs shadow-glow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                'Authenticating with Supabase...'
              ) : (
                <>
                  Sign In with Verified Credentials
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-kria-border/70 text-center">
            <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Server-Verified Session & RBAC Enforcement
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
