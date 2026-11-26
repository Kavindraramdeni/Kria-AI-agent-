import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET } from '@/app/api/cron/monitor/route';
import { NextRequest } from 'next/server';

// Mock SEO Scanner
vi.mock('@/lib/services/seo-scanner', () => ({
  performComprehensiveSeoScan: vi.fn().mockResolvedValue({
    scores: {
      overall: 92,
      seoHealth: 95,
      performance: 88,
      mobileUx: 96,
      structuredData: 90,
    },
    network: {
      requestResponseStartMs: 142,
    },
    issues: [
      {
        category: 'performance',
        severity: 'medium',
        issue: 'Render-blocking script in head',
        fix: 'Add defer attribute',
      },
    ],
    savedAuditId: 'mock-cron-audit-uuid',
    approvalId: 'mock-cron-approval-uuid',
  }),
}));

describe('Automated Monitoring Cron: GET /api/cron/monitor', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.CRON_SECRET;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('runs website audit scan and returns health metrics', async () => {
    const req = new NextRequest('http://localhost:3000/api/cron/monitor');
    const res = await GET(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.target_url).toBe('https://kriatech.in');
    expect(body.overall_score).toBe(92);
    expect(body.latency_ms).toBe(142);
    expect(body.issues_count).toBe(1);
    expect(body.audit_id).toBe('mock-cron-audit-uuid');
  });

  it('enforces authorization token when CRON_SECRET is configured', async () => {
    process.env.CRON_SECRET = 'secret-cron-key-999';

    // 1. Unauthorized call
    const unauthReq = new NextRequest('http://localhost:3000/api/cron/monitor');
    const unauthRes = await GET(unauthReq);
    expect(unauthRes.status).toBe(401);

    // 2. Authorized call
    const authReq = new NextRequest('http://localhost:3000/api/cron/monitor', {
      headers: {
        authorization: 'Bearer secret-cron-key-999',
      },
    });
    const authRes = await GET(authReq);
    expect(authRes.status).toBe(200);
    const body = await authRes.json();
    expect(body.success).toBe(true);
  });
});
