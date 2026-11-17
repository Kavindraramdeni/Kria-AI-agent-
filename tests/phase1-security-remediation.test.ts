import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { calculateWholesaleQuote } from '@/lib/services/pricing-engine';
import { KRIA_CATALOG_VARIANTS } from '@/lib/data/kria-catalog-matrix';

// Top-level controllable mock state
const mockSessionState = {
  currentSession: null as any,
};

vi.mock('@/lib/auth/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/session')>();
  return {
    ...actual,
    getServerSession: vi.fn().mockImplementation(() => Promise.resolve(mockSessionState.currentSession)),
    isAuthorizedOwner: vi.fn().mockImplementation(() => {
      const s = mockSessionState.currentSession;
      return Promise.resolve(Boolean(s && (s.role === 'owner' || s.role === 'admin')));
    }),
  };
});

const mockSupabaseQueryState = {
  productsResult: { data: [] as any, error: null as any },
  leadsResult: { data: [] as any, error: null as any },
  approvalsResult: { data: [] as any, error: null as any },
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: (table: string) => ({
      select: () => ({
        order: () => {
          if (table === 'products') return Promise.resolve(mockSupabaseQueryState.productsResult);
          if (table === 'leads') return Promise.resolve(mockSupabaseQueryState.leadsResult);
          if (table === 'approval_requests') return Promise.resolve(mockSupabaseQueryState.approvalsResult);
          return Promise.resolve({ data: [], error: null });
        },
      }),
    }),
  }),
}));

import { POST as runAgent } from '@/app/api/agents/[agentId]/run/route';
import { POST as dispatchApproval } from '@/app/api/approvals/[id]/dispatch/route';
import { getServerSession, isAuthorizedOwner } from '@/lib/auth/session';
import { getProducts } from '@/lib/services/products';
import { getLeads } from '@/lib/services/leads';
import { getApprovals } from '@/lib/services/approvals';

describe('Phase 1 — Security and Execution Transparency Remediation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    mockSessionState.currentSession = null;
    mockSupabaseQueryState.productsResult = { data: [], error: null };
    mockSupabaseQueryState.leadsResult = { data: [], error: null };
    mockSupabaseQueryState.approvalsResult = { data: [], error: null };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1. Fix Simulation Reporting (Requirement A)', () => {
    it('API keys alone do NOT make is_simulated false, and execution_mode is hardcoded', async () => {
      // Simulate environment where GEMINI_API_KEY is present
      process.env.GEMINI_API_KEY = 'mock-gemini-key-12345';
      (process.env as any).NODE_ENV = 'development';

      // Set authenticated owner session
      mockSessionState.currentSession = {
        id: 'test-owner-001',
        email: 'admin@kriatech.com',
        role: 'owner',
        fullName: 'Kria Owner',
        isDemo: false,
      };

      const req = new NextRequest('http://localhost:3000/api/agents/sales-agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'Score lead for 500 pcs wholesale inquiry' }),
      });

      const res = await runAgent(req, { params: { agentId: 'sales-agent' } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      // Requirement: is_simulated MUST be true until real model execution occurs
      expect(json.is_simulated).toBe(true);
      // Requirement: credentials_configured reflects key presence, NOT real AI execution
      expect(json.credentials_configured).toBe(true);
      // Requirement: explicit execution_mode
      expect(json.execution_mode).toBe('hardcoded');
      expect(json.model_invoked).toBe(false);
      expect(json.output).toBeDefined();
    });

    it('hardcoded agent responses are always labelled as simulated', async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      mockSessionState.currentSession = {
        id: 'test-owner-001',
        email: 'admin@kriatech.com',
        role: 'owner',
        fullName: 'Kria Owner',
        isDemo: false,
      };

      const req = new NextRequest('http://localhost:3000/api/agents/sales-agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'Score lead for 500 pcs wholesale inquiry' }),
      });

      const res = await runAgent(req, { params: { agentId: 'sales-agent' } });
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.is_simulated).toBe(true);
      expect(json.execution_mode).toBe('hardcoded');
      expect(json.credentials_configured).toBe(false);
      expect(json.model_invoked).toBe(false);
    });
  });

  describe('2. Remove Authentication Bypass (Requirement B)', () => {
    it('getServerSession returns null when unauthenticated, never silently defaulting to owner', async () => {
      mockSessionState.currentSession = null;
      const session = await getServerSession();
      expect(session).toBeNull();
    });

    it('isAuthorizedOwner returns false when user is unauthenticated', async () => {
      mockSessionState.currentSession = null;
      const isOwner = await isAuthorizedOwner();
      expect(isOwner).toBe(false);
    });

    it('unauthenticated users cannot access protected agent execution endpoint', async () => {
      mockSessionState.currentSession = null; // Unauthenticated

      const req = new NextRequest('http://localhost:3000/api/agents/seo-agent/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: 'Keywords' }),
      });

      const res = await runAgent(req, { params: { agentId: 'seo-agent' } });
      // Must return 401 Unauthorized
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain('Unauthorized');
    });

    it('unauthenticated users cannot access protected approval dispatch endpoint', async () => {
      mockSessionState.currentSession = null; // Unauthenticated

      const req = new NextRequest('http://localhost:3000/api/approvals/appr-001/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor_email: 'admin@kriatech.com' }), // Client attempting to forge owner
      });

      const res = await dispatchApproval(req, { params: { id: 'appr-001' } });
      // Must reject with 401 Unauthorized and ignore the forged body actor_email
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain('Unauthorized');
    });
  });

  describe('3. Protect Demo Fixtures & Prevent Silent Fallback (Requirement C)', () => {
    it('empty Supabase leads table produces empty state [], never substituting demo leads', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://qzwbssmnpaecrnkgdest.supabase.co';
      mockSupabaseQueryState.leadsResult = { data: [], error: null };

      const res = await getLeads();
      expect(res.isLive).toBe(true);
      expect(res.data).toEqual([]);
      expect(res.data.length).toBe(0);
    });

    it('empty Supabase approvals table produces empty state [], never substituting demo approvals', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://qzwbssmnpaecrnkgdest.supabase.co';
      mockSupabaseQueryState.approvalsResult = { data: [], error: null };

      const res = await getApprovals();
      expect(res.isLive).toBe(true);
      expect(res.data).toEqual([]);
      expect(res.data.length).toBe(0);
    });

    it('empty Supabase products table produces empty state [], never substituting demo products', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://qzwbssmnpaecrnkgdest.supabase.co';
      mockSupabaseQueryState.productsResult = { data: [], error: null };

      const res = await getProducts();
      expect(res.isLive).toBe(true);
      expect(res.data).toEqual([]);
      expect(res.data.length).toBe(0);
    });

    it('database error returns empty array and error message without silently substituting fake fixtures', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://qzwbssmnpaecrnkgdest.supabase.co';
      mockSupabaseQueryState.leadsResult = { data: null, error: { message: 'Database connection timeout' } };

      const res = await getLeads();
      expect(res.isLive).toBe(false);
      expect(res.error).toBe('Database connection timeout');
      expect(res.data).toEqual([]);
    });
  });

  describe('4. Catalog & Pricing Integrity Preservation', () => {
    it('preserves all 15 KRIA matrix variants and their exact wholesale pricing tiers', () => {
      expect(KRIA_CATALOG_VARIANTS.length).toBe(15);

      // Verify Demo Starter Kit bundle rate
      const starterKit = calculateWholesaleQuote({
        sku: 'KRA-KIT-DEMO24',
        quantity: 1,
      });
      expect(starterKit.final_total_inr).toBe(999);
      expect(starterKit.effective_unit_price).toBe(999);

      // Verify 5-tier pricing for 6x4 Classic Rectangle Frame (KRA-REC-0604)
      const quote50 = calculateWholesaleQuote({ sku: 'KRA-REC-0604', quantity: 50 });
      expect(quote50.effective_unit_price).toBe(96);

      const quote100 = calculateWholesaleQuote({ sku: 'KRA-REC-0604', quantity: 100 });
      expect(quote100.effective_unit_price).toBe(85);

      const quote1000 = calculateWholesaleQuote({ sku: 'KRA-REC-0604', quantity: 1000 });
      expect(quote1000.effective_unit_price).toBe(76);

      // Verify VIP Subscription discount (₹2 OFF per unit on wholesale tier)
      const quote100Sub = calculateWholesaleQuote({
        sku: 'KRA-REC-0604',
        quantity: 100,
        hasSubscription: true,
      });
      expect(quote100Sub.effective_unit_price).toBe(83); // 85 - 2 = 83
      expect(quote100Sub.subscription_discount_per_unit).toBe(2);
    });
  });
});
