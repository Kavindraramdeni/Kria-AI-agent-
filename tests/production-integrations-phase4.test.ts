import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '@/lib/services/rate-limit';
import { verifyWebhookSignature } from '@/lib/services/webhook-verifier';
import { dispatchExternalAction } from '@/lib/services/api-sandbox';
import { createHmac } from 'crypto';

describe('Phase 4 — Production Integrations: Rate Limiting, Webhooks & Sandboxing', () => {
  describe('Rate Limiter', () => {
    it('allows requests within limit and throttles requests exceeding limit', () => {
      const testIp = 'ip-test-rate-' + Date.now();
      const limit = 3;

      // 1, 2, 3 should succeed
      expect(checkRateLimit(testIp, limit, 10).allowed).toBe(true);
      expect(checkRateLimit(testIp, limit, 10).allowed).toBe(true);
      expect(checkRateLimit(testIp, limit, 10).allowed).toBe(true);

      // 4th request must be blocked
      const blocked = checkRateLimit(testIp, limit, 10);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.resetSeconds).toBeGreaterThan(0);
    });
  });

  describe('Webhook HMAC Verification', () => {
    const testSecret = 'kria-secret-key-phase4';
    const testPayload = JSON.stringify({ event: 'lead.created', leadId: 'lead-123' });

    it('successfully validates a genuine HMAC SHA-256 webhook signature', () => {
      const signature = createHmac('sha256', testSecret).update(testPayload).digest('hex');

      const result = verifyWebhookSignature(testPayload, signature, testSecret);
      expect(result.valid).toBe(true);
    });

    it('rejects a forged or tampered webhook payload', () => {
      const signature = createHmac('sha256', testSecret).update(testPayload).digest('hex');
      const tamperedPayload = JSON.stringify({ event: 'lead.created', leadId: 'lead-TAMPERED' });

      const result = verifyWebhookSignature(tamperedPayload, signature, testSecret);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid cryptographic signature');
    });

    it('rejects a webhook with expired timestamp (replay attack defense)', () => {
      const signature = createHmac('sha256', testSecret).update(testPayload).digest('hex');
      const expiredTimestamp = String(Date.now() - 600 * 1000); // 10 minutes old

      const result = verifyWebhookSignature(testPayload, signature, testSecret, expiredTimestamp, 300);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('timestamp expired');
    });
  });

  describe('External API Sandbox Boundary', () => {
    it('safely routes WhatsApp quote dispatches into the sandbox preventing live customer messages', async () => {
      const result = await dispatchExternalAction({
        channel: 'whatsapp',
        destination: '+919876543210',
        payload: { text: 'Quotation for 100 units 4x6 acrylic frames: ₹32,000' },
        approvalId: 'app-test-01',
        actorEmail: 'admin@kriatech.com',
      });

      expect(result.success).toBe(true);
      expect(result.isSandbox).toBe(true);
      expect(result.channel).toBe('whatsapp');
      expect(result.details).toContain('Safely simulated in sandbox mode');
    });

    it('safely routes Meta ad spend launches into the sandbox preventing ad charges', async () => {
      const result = await dispatchExternalAction({
        channel: 'meta_ads',
        destination: 'Meta Ads Manager Account act_12345',
        payload: { campaign: 'Diwali Acrylic Gifting Push', budget_inr: 50000 },
        approvalId: 'app-test-02',
        actorEmail: 'admin@kriatech.com',
      });

      expect(result.success).toBe(true);
      expect(result.isSandbox).toBe(true);
      expect(result.details).toContain('No real money spent');
    });
  });
});
