import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/webhooks/leads/route';
import { NextRequest } from 'next/server';

// Mock the Gemini client wrapper to return structured qualification without remote calls
vi.mock('@/lib/ai/gemini-client', () => ({
  getGeminiClient: vi.fn(),
  generateStructuredWithGemini: vi.fn().mockResolvedValue({
    data: {
      score: 92,
      priority: 'high',
      intent_tier: 'wholesale_reseller',
      suggested_action: 'Send factory wholesale quote and offer KRIA Demo Starter Kit for sample evaluation.',
      draft_response_message: 'Hi Priya, thank you for contacting KRIA Tech Hyderabad! For 100 pcs of Minimal Square (2x2"), your wholesale rate is ₹37/pc (₹3,700 total + GST). Production turnaround is 24-48 hours with express air dispatch.',
    },
    model: 'gemini-3.5-flash-lite',
    rawJson: '{}',
  }),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    from: (table: string) => ({
      insert: (rows: any[]) => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: `mock-${table}-uuid-123` }, error: null }),
        }),
      }),
      select: () => ({
        single: () => Promise.resolve({ data: { id: 'mock-record' }, error: null }),
      }),
    }),
  }),
}));

describe('Inbound Lead Webhook API: POST /api/webhooks/leads', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.KRIA_INBOUND_WEBHOOK_SECRET;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejects invalid or non-JSON payloads with 400 Bad Request', async () => {
    const req = new NextRequest('http://localhost:3000/api/webhooks/leads', {
      method: 'POST',
      body: 'invalid-string-not-json',
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Invalid payload');
  });

  it('validates that at least one contact field (name, phone, or email) is provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/webhooks/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: 100, sku: 'KRA-SQU-0202' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Validation failed');
  });

  it('enforces webhook secret authentication when KRIA_INBOUND_WEBHOOK_SECRET is set', async () => {
    process.env.KRIA_INBOUND_WEBHOOK_SECRET = 'super-secret-token-123';

    // 1. Missing secret
    const unauthReq = new NextRequest('http://localhost:3000/api/webhooks/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Rahul Sharma', phone: '+919876543210' }),
    });
    const unauthRes = await POST(unauthReq);
    expect(unauthRes.status).toBe(401);

    // 2. Correct secret
    const authReq = new NextRequest('http://localhost:3000/api/webhooks/leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-kria-webhook-secret': 'super-secret-token-123',
      },
      body: JSON.stringify({
        name: 'Rahul Sharma',
        business_name: 'Blissful Wedding Favors',
        phone: '+919876543210',
        sku: 'KRA-SQU-0202',
        quantity: 100,
      }),
    });
    const authRes = await POST(authReq);
    expect(authRes.status).toBe(201);
  });

  it('processes incoming inquiry, calculates exact wholesale tier rate, and creates approval ticket', async () => {
    const payload = {
      name: 'Ananya Verma',
      business_name: 'Hyderabad Souvenirs & Gifts',
      phone: '+91-9392576792',
      email: 'ananya@hyderabadsouvenirs.in',
      sku: 'KRA-SQU-0202', // Minimal Square 2x2"
      quantity: 100, // Tier 100 rate is ₹37/pc
      source: 'kriatech_storefront_whatsapp',
      message: 'Need 100 pieces of 2x2 square magnets for Charminar souvenir shop.',
    };

    const req = new NextRequest('http://localhost:3000/api/webhooks/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();

    // Verify mathematical pricing accuracy from KRIA Wholesale Matrix
    expect(body.data.quote).toBeDefined();
    expect(body.data.quote.sku).toBe('KRA-SQU-0202');
    expect(body.data.quote.quantity).toBe(100);
    expect(body.data.quote.effective_unit_price).toBe(37); // ₹37 at 100 pcs tier
    expect(body.data.quote.final_total_inr).toBe(3700); // 100 × 37

    // Verify intent scoring & status
    expect(body.data.status).toBe('approval_pending');
    expect(body.data.intent_tier).toBe('wholesale_reseller');
    expect(body.data.lead_score).toBe(92);
    expect(body.data.draft_response_message).toContain('₹37/pc');
  });

  it('correctly handles Demo Starter Kit inquiries with fixed sample pack rate ₹999', async () => {
    const payload = {
      name: 'Kavita Reddy',
      business_name: 'Reddy Photo Studio',
      phone: '+91-9848012345',
      sku: 'KRA-KIT-DEMO24',
      quantity: 1,
      source: 'kriatech_sample_order',
    };

    const req = new NextRequest('http://localhost:3000/api/webhooks/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.data.quote.sku).toBe('KRA-KIT-DEMO24');
    expect(body.data.quote.is_starter_kit).toBe(true);
    expect(body.data.quote.effective_unit_price).toBe(999);
    expect(body.data.quote.final_total_inr).toBe(999);
  });
});
