import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import http from 'http';
import { URL } from 'url';
import {
  resolveTrustedRole,
  isValidUserRole,
  getServerSession,
  isAuthorizedOwner,
} from '../src/lib/auth/session';
import {
  resolveAndValidateDestinationIp,
  executeSingleSafeHop,
  performComprehensiveSeoScan,
  isPrivateOrRestrictedIp,
  isRestrictedHostname,
} from '../src/lib/services/seo-scanner';
import {
  createApprovalRequest,
  updateApprovalStatus,
} from '../src/lib/services/approvals';
import { executeApprovedAction } from '../src/lib/services/execution-dispatcher';

describe('Phase 3.2 — Final Security & Persistence Gate Test Suite', () => {
  // =========================================================================
  // 1. TRUSTED ROLE AUTHORIZATION (P0)
  // =========================================================================
  describe('1. Trusted Role Authorization & Metadata Spoofing Defense', () => {
    it('validates user roles strictly against the permitted set', () => {
      expect(isValidUserRole('owner')).toBe(true);
      expect(isValidUserRole('admin')).toBe(true);
      expect(isValidUserRole('staff')).toBe(true);
      expect(isValidUserRole('superuser')).toBe(false);
      expect(isValidUserRole('root')).toBe(false);
      expect(isValidUserRole(null)).toBe(false);
      expect(isValidUserRole(undefined)).toBe(false);
      expect(isValidUserRole(123)).toBe(false);
    });

    it('denies privileged access when profile is missing or lookup fails', () => {
      // Missing profile
      expect(resolveTrustedRole(null)).toBe('staff');
      expect(resolveTrustedRole(undefined)).toBe('staff');

      // Database query error
      const dbError = new Error('PGRST116: JSON object requested, multiple (or no) rows returned');
      expect(resolveTrustedRole({ role: 'owner' }, dbError)).toBe('staff');
    });

    it('denies privileged access when role in database profile is invalid', () => {
      expect(resolveTrustedRole({ role: 'superuser' })).toBe('staff');
      expect(resolveTrustedRole({ role: 'administrator' })).toBe('staff');
      expect(resolveTrustedRole({ role: null })).toBe('staff');
      expect(resolveTrustedRole({ role: '' })).toBe('staff');
    });

    it('grants privileged access only to verified owner or admin profiles', () => {
      expect(resolveTrustedRole({ role: 'owner' })).toBe('owner');
      expect(resolveTrustedRole({ role: 'admin' })).toBe('admin');
      expect(resolveTrustedRole({ role: 'staff' })).toBe('staff');
    });

    it('completely ignores manipulated user_metadata.role and enforces profile role in getServerSession', async () => {
      // Mock Supabase client where attacker manipulated user_metadata to say "owner",
      // but their trusted profiles record has role "staff"
      const spoofingUserClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'attacker-uuid-001',
                email: 'attacker@kriatech.com',
                user_metadata: { role: 'owner', full_name: 'Attacker' },
                raw_user_meta_data: { role: 'owner' },
              },
            },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { role: 'staff', full_name: 'Legit Staff Name' },
                error: null,
              }),
            }),
          }),
        }),
      };

      const session = await getServerSession(spoofingUserClient);
      expect(session).not.toBeNull();
      // Crucial: Must be 'staff', NEVER 'owner'
      expect(session?.role).toBe('staff');
    });

    it('denies privileged access if user metadata claims owner but profile lookup fails', async () => {
      const missingProfileClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: {
              user: {
                id: 'newbie-uuid-002',
                email: 'newbie@kriatech.com',
                user_metadata: { role: 'owner' },
              },
            },
            error: null,
          }),
        },
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Profile row not found'),
              }),
            }),
          }),
        }),
      };

      const session = await getServerSession(missingProfileClient);
      expect(session).not.toBeNull();
      expect(session?.role).toBe('staff');
    });

    it('ensures only verified owner or admin can dispatch critical actions', async () => {
      // Create test approval request
      const createRes = await createApprovalRequest({
        action_type: 'campaign_launch',
        title: 'Launch Enterprise Ad Campaign',
        proposed_content: { budget_cap: 50000 },
        risk_level: 'critical',
        status: 'pending',
      });
      expect(createRes.success).toBe(true);
      const approvalId = createRes.data!.id;

      // Approve it
      await updateApprovalStatus(approvalId, 'approved', 'admin@kriatech.com');

      // Attempt dispatch as staff actor -> MUST BE REJECTED
      const staffDispatch = await executeApprovedAction(approvalId, {
        email: 'staff@kriatech.com',
        role: 'staff',
      });
      expect(staffDispatch.success).toBe(false);
      expect(staffDispatch.error_code).toBe('CRITICAL_ACTION_RESTRICTED');

      // Attempt dispatch as verified owner actor -> SUCCEEDS
      const ownerDispatch = await executeApprovedAction(approvalId, {
        email: 'admin@kriatech.com',
        role: 'owner',
      });
      expect(ownerDispatch.success).toBe(true);
    });
  });

  // =========================================================================
  // 2. SSRF, DNS REBINDING & RESPONSE SIZE PROTECTION (P0)
  // =========================================================================
  describe('2. SSRF, DNS Rebinding & Response Size Protection', () => {
    let mockChunkServer: http.Server;
    let mockServerPort: number;

    beforeAll(async () => {
      // Start a local HTTP server that streams chunked data
      mockChunkServer = http.createServer((req, res) => {
        const url = new URL(req.url || '/', `http://127.0.0.1:${mockServerPort}`);
        if (url.pathname === '/oversized-chunks') {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          // Send 6 MB in 512 KB chunks without Content-Length
          let sent = 0;
          const interval = setInterval(() => {
            res.write('X'.repeat(512 * 1024));
            sent += 512 * 1024;
            if (sent >= 6 * 1024 * 1024) {
              clearInterval(interval);
              res.end();
            }
          }, 5);
        } else if (url.pathname === '/slow-stream') {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          // Hangs without sending enough data within timeout
          setTimeout(() => {
            res.end('done');
          }, 2000);
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><head><title>Test Safe</title></head><body><h1>OK</h1></body></html>');
        }
      });

      await new Promise<void>((resolve) => {
        mockChunkServer.listen(0, '127.0.0.1', () => {
          const addr = mockChunkServer.address() as any;
          mockServerPort = addr.port;
          resolve();
        });
      });
    });

    afterAll(async () => {
      await new Promise<void>((resolve) => {
        mockChunkServer.close(() => resolve());
      });
    });

    it('prevents DNS rebinding: resolveAndValidateDestinationIp checks all records and pins IP', async () => {
      // Directly check resolveAndValidateDestinationIp against a public target
      const dest = await resolveAndValidateDestinationIp(new URL('https://example.com/'));
      expect(dest.safeIp).toBeDefined();
      expect(isPrivateOrRestrictedIp(dest.safeIp)).toBe(false);
      expect(dest.port).toBe(443);
    });

    it('blocks DNS resolution to private and restricted subnets', async () => {
      expect(isPrivateOrRestrictedIp('127.0.0.1')).toBe(true);
      expect(isPrivateOrRestrictedIp('10.0.0.5')).toBe(true);
      expect(isPrivateOrRestrictedIp('172.16.0.1')).toBe(true);
      expect(isPrivateOrRestrictedIp('192.168.1.100')).toBe(true);
      expect(isPrivateOrRestrictedIp('169.254.169.254')).toBe(true);
      expect(isPrivateOrRestrictedIp('::1')).toBe(true);
      expect(isPrivateOrRestrictedIp('fe80::1')).toBe(true);

      // Blocked hostnames
      expect(isRestrictedHostname('localhost')).toBe(true);
      expect(isRestrictedHostname('sub.localhost')).toBe(true);
      expect(isRestrictedHostname('internal.local')).toBe(true);
      expect(isRestrictedHostname('metadata.google.internal')).toBe(true);
    });

    it('enforces streaming 5 MB limit on chunked responses before full buffering', async () => {
      // Connect to the local oversized chunk server directly via executeSingleSafeHop
      const testUrl = new URL(`http://127.0.0.1:${mockServerPort}/oversized-chunks`);

      await expect(
        executeSingleSafeHop(
          testUrl,
          { safeIp: '127.0.0.1', port: mockServerPort },
          5000
        )
      ).rejects.toThrow(/Response Size Exceeded: Raw response stream exceeded maximum 5 MB limit/);
    });

    it('enforces total timeout covering request, connection and body stream', async () => {
      const testUrl = new URL(`http://127.0.0.1:${mockServerPort}/slow-stream`);

      // 100ms timeout on a 2000ms response
      await expect(
        executeSingleSafeHop(
          testUrl,
          { safeIp: '127.0.0.1', port: mockServerPort },
          100
        )
      ).rejects.toThrow(/Network Scan Timeout/);
    });
  });

  // =========================================================================
  // 3. CORRECT NETWORK METRIC NAMING (P1)
  // =========================================================================
  describe('3. Accurate Network Metric Naming & Core Web Vitals Transparency', () => {
    it('accurately exposes requestResponseStartMs and avoids claiming uninstrumented browser CWV', async () => {
      const sampleHtml = `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <title>KRIA Acrylic Photo Frames | Hyderabad</title>
            <meta name="description" content="Wholesale crystal clear acrylic magnetic frames made in Hyderabad.">
          </head>
          <body>
            <h1>Precision Acrylic Displays</h1>
            <img src="/photo.jpg" width="600" height="400" alt="Frame Photo">
          </body>
        </html>
      `;

      const scan = await performComprehensiveSeoScan({
        url: 'https://example.com/products/frames',
        mockHtml: sampleHtml,
      });

      // 1. Accurate network metric naming
      expect(scan.network.requestResponseStartMs).toBe(42);
      expect(scan.coreWebVitals.requestResponseStartMs).toBe(42);
      expect(scan.coreWebVitals.requestResponseRating).toBe('good');

      // 2. Backward compatibility aliases
      expect(scan.network.ttfbMs).toBe(42);
      expect(scan.coreWebVitals.measuredTtfbMs).toBe(42);
      expect(scan.coreWebVitals.ttfbRating).toBe('good');

      // 3. Clear heuristics transparency: INP requires RUM / field instrumentation
      expect(scan.coreWebVitals.inpStatus).toBe('requires_field_data_or_rum');
      expect(scan.coreWebVitals.methodology).toBe('server_side_static_heuristic');
    });
  });
});
