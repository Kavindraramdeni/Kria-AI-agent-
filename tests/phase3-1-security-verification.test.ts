import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeApprovedAction } from '@/lib/services/execution-dispatcher';
import { createApprovalRequest, updateApprovalStatus } from '@/lib/services/approvals';
import { POST as dispatchRoute } from '@/app/api/approvals/[id]/dispatch/route';
import {
  isPrivateOrRestrictedIp,
  isRestrictedHostname,
  validateUrlForSsrf,
  performComprehensiveSeoScan,
} from '@/lib/services/seo-scanner';
import { NextRequest } from 'next/server';

// Mock session state
const mockSessionState = {
  currentSession: null as any,
};

vi.mock('@/lib/auth/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/session')>();
  return {
    ...actual,
    getServerSession: vi.fn().mockImplementation(() => Promise.resolve(mockSessionState.currentSession)),
  };
});

describe('Phase 3.1 — Security & Reality Verification Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Approval Dispatcher Role Enforcement (P0)', () => {
    it('strictly blocks staff role from executing critical actions', async () => {
      const createRes = await createApprovalRequest({
        action_type: 'campaign_launch',
        title: 'High-Budget Meta Ads Spend (₹2,00,000)',
        proposed_content: { budget_inr: 200000, channel: 'Meta Ads' },
        destination: 'Meta Ads API',
        risk_level: 'critical',
      });

      const id = createRes.data!.id;
      await updateApprovalStatus(id, 'approved', 'admin@kriatech.com');

      const result = await executeApprovedAction(
        id,
        { email: 'staff@kriatech.com', role: 'staff' }
      );

      expect(result.success).toBe(false);
      expect(result.error_code).toBe('CRITICAL_ACTION_RESTRICTED');
      expect(result.error).toContain("current role: 'staff'");
    });

    it('strictly blocks spoofed email substrings if verified role is staff', async () => {
      const createRes = await createApprovalRequest({
        action_type: 'campaign_launch',
        title: 'Critical Live Website Change Proposal',
        proposed_content: { action: 'deploy_patch' },
        destination: 'Production Server',
        risk_level: 'critical',
      });

      const id = createRes.data!.id;
      await updateApprovalStatus(id, 'approved', 'admin@kriatech.com');

      // An attacker with a staff role whose email contains 'admin' or 'owner'
      const result = await executeApprovedAction(
        id,
        { email: 'staff-admin-spoof@kriatech.com', role: 'staff' }
      );

      expect(result.success).toBe(false);
      expect(result.error_code).toBe('CRITICAL_ACTION_RESTRICTED');
      expect(result.error).toContain("current role: 'staff'");
    });

    it('allows verified owner and admin roles to execute critical actions', async () => {
      const createRes1 = await createApprovalRequest({
        action_type: 'website_change',
        title: 'Owner Authorized Production Update',
        proposed_content: { change: 'update_schema' },
        destination: 'Storefront Production',
        risk_level: 'critical',
      });
      const id1 = createRes1.data!.id;
      await updateApprovalStatus(id1, 'approved', 'admin@kriatech.com');

      const ownerResult = await executeApprovedAction(
        id1,
        { email: 'owner@kriatech.com', role: 'owner' }
      );

      expect(ownerResult.success).toBe(true);
      expect(ownerResult.executed_at).toBeDefined();

      const createRes2 = await createApprovalRequest({
        action_type: 'website_change',
        title: 'Admin Authorized Production Update',
        proposed_content: { change: 'update_schema_admin' },
        destination: 'Storefront Production',
        risk_level: 'critical',
      });
      const id2 = createRes2.data!.id;
      await updateApprovalStatus(id2, 'approved', 'admin@kriatech.com');

      const adminResult = await executeApprovedAction(
        id2,
        { email: 'admin@kriatech.com', role: 'admin' }
      );

      expect(adminResult.success).toBe(true);
      expect(adminResult.executed_at).toBeDefined();
    });

    it('API route /api/approvals/[id]/dispatch returns 403 Forbidden for staff role', async () => {
      mockSessionState.currentSession = {
        id: 'user-staff-001',
        email: 'staff@kriatech.com',
        role: 'staff',
        fullName: 'Shop Floor Staff',
        isDemo: false,
      };

      const req = new NextRequest('http://localhost:3000/api/approvals/appr-test-123/dispatch', {
        method: 'POST',
      });

      const res = await dispatchRoute(req, { params: { id: 'appr-test-123' } });
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error).toContain("Role 'staff' cannot dispatch approved actions");
    });
  });

  describe('2. SEO Scanner SSRF Protection (P0)', () => {
    it('correctly classifies private, loopback, and metadata IP addresses', () => {
      // Loopback
      expect(isPrivateOrRestrictedIp('127.0.0.1')).toBe(true);
      expect(isPrivateOrRestrictedIp('127.255.0.1')).toBe(true);
      expect(isPrivateOrRestrictedIp('::1')).toBe(true);

      // Private networks (RFC 1918)
      expect(isPrivateOrRestrictedIp('10.0.0.1')).toBe(true);
      expect(isPrivateOrRestrictedIp('10.255.255.255')).toBe(true);
      expect(isPrivateOrRestrictedIp('172.16.0.1')).toBe(true);
      expect(isPrivateOrRestrictedIp('172.31.255.255')).toBe(true);
      expect(isPrivateOrRestrictedIp('192.168.0.1')).toBe(true);
      expect(isPrivateOrRestrictedIp('192.168.1.100')).toBe(true);

      // Cloud metadata & Link-local
      expect(isPrivateOrRestrictedIp('169.254.169.254')).toBe(true);
      expect(isPrivateOrRestrictedIp('169.254.1.1')).toBe(true);

      // IPv6 private & link-local
      expect(isPrivateOrRestrictedIp('fc00::1')).toBe(true);
      expect(isPrivateOrRestrictedIp('fd12:3456::1')).toBe(true);
      expect(isPrivateOrRestrictedIp('fe80::1')).toBe(true);

      // Current network / broadcast
      expect(isPrivateOrRestrictedIp('0.0.0.0')).toBe(true);
      expect(isPrivateOrRestrictedIp('255.255.255.255')).toBe(true);

      // Public IP addresses must NOT be blocked
      expect(isPrivateOrRestrictedIp('93.184.216.34')).toBe(false); // example.com
      expect(isPrivateOrRestrictedIp('8.8.8.8')).toBe(false); // Google DNS
      expect(isPrivateOrRestrictedIp('1.1.1.1')).toBe(false); // Cloudflare DNS
    });

    it('correctly classifies restricted and metadata hostnames', () => {
      expect(isRestrictedHostname('localhost')).toBe(true);
      expect(isRestrictedHostname('api.localhost')).toBe(true);
      expect(isRestrictedHostname('service.internal')).toBe(true);
      expect(isRestrictedHostname('server.local')).toBe(true);
      expect(isRestrictedHostname('metadata.google.internal')).toBe(true);
      expect(isRestrictedHostname('instance-data')).toBe(true);

      // Public domains must NOT be restricted
      expect(isRestrictedHostname('kriatech.com')).toBe(false);
      expect(isRestrictedHostname('google.com')).toBe(false);
      expect(isRestrictedHostname('example.com')).toBe(false);
    });

    it('validateUrlForSsrf blocks private IP targets and restricted hostnames', async () => {
      await expect(
        validateUrlForSsrf('http://127.0.0.1/admin')
      ).rejects.toThrow(/SSRF Security Rejection/);

      await expect(
        validateUrlForSsrf('http://169.254.169.254/latest/meta-data/')
      ).rejects.toThrow(/SSRF Security Rejection/);

      await expect(
        validateUrlForSsrf('http://localhost:3000/api/secret')
      ).rejects.toThrow(/SSRF Security Rejection/);

      await expect(
        validateUrlForSsrf('http://metadata.google.internal/computeMetadata/v1/')
      ).rejects.toThrow(/SSRF Security Rejection/);

      await expect(
        validateUrlForSsrf('http://192.168.1.1/router')
      ).rejects.toThrow(/SSRF Security Rejection/);
    });

    it('strictly re-validates redirect targets and blocks redirects to private IPs', async () => {
      const originalFetch = global.fetch;

      // Mock a 302 redirect to http://127.0.0.1/internal-status
      global.fetch = vi.fn().mockResolvedValue({
        status: 302,
        headers: new Headers({ location: 'http://127.0.0.1/internal-status' }),
      } as any);

      try {
        await expect(
          performComprehensiveSeoScan({ url: 'https://kriatech.com/redirect-to-private' })
        ).rejects.toThrow(/SSRF Security Rejection/);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('strictly enforces response size limits (blocks responses > 5 MB)', async () => {
      const originalFetch = global.fetch;

      // Mock a response exceeding 5MB
      global.fetch = vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        headers: new Headers({
          'content-length': '6000000', // 6 MB
          'content-type': 'text/html',
        }),
      } as any);

      try {
        await expect(
          performComprehensiveSeoScan({ url: 'https://kriatech.com/huge-page' })
        ).rejects.toThrow(/Response Size Exceeded: Target page size exceeds 5 MB limit/);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe('3. Core Web Vitals Transparency & Heuristics Labeling (P1)', () => {
    it('accurately identifies measured TTFB vs static heuristic estimates', async () => {
      const sampleHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>KRIA Acrylic Frames</title>
  <meta name="description" content="Direct factory wholesale acrylic photo frames manufactured in Hyderabad.">
  <link rel="canonical" href="https://kriatech.com/products/frames">
  <script defer src="/app.js"></script>
</head>
<body>
  <h1>Magnetic Acrylic Frames</h1>
  <img src="/frame.webp" width="400" height="300" alt="Frame">
</body>
</html>
      `.trim();

      const scan = await performComprehensiveSeoScan({
        url: 'https://kriatech.com/products/frames',
        mockHtml: sampleHtml,
      });

      // Measured network metric
      expect(scan.coreWebVitals.measuredTtfbMs).toBe(42);
      expect(scan.coreWebVitals.ttfbRating).toBe('good');

      // Static predictive heuristics
      expect(scan.coreWebVitals.estimatedLcpHeuristicMs).toBeDefined();
      expect(scan.coreWebVitals.estimatedClsHazardScore).toBe(0);

      // Methodological transparency notices
      expect(scan.coreWebVitals.inpStatus).toBe('requires_field_data_or_rum');
      expect(scan.coreWebVitals.methodology).toBe('server_side_static_heuristic');
    });
  });
});
