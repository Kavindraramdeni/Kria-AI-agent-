import { createHmac, timingSafeEqual } from 'crypto';

export interface WebhookVerificationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validates HMAC SHA-256 signatures for n8n and third-party webhooks.
 * Includes timestamp tolerance check to prevent replay attacks.
 */
export function verifyWebhookSignature(
  rawPayload: string,
  signatureHeader: string | null,
  secretKey: string = process.env.N8N_API_KEY || 'kria-webhook-secret-key-2026',
  timestampHeader?: string | null,
  maxToleranceSeconds: number = 300 // 5 minutes
): WebhookVerificationResult {
  if (!signatureHeader) {
    return { valid: false, reason: 'Missing X-KRIA-Signature or signature header' };
  }

  // Verify timestamp freshness if provided
  if (timestampHeader) {
    const timestampMs = parseInt(timestampHeader, 10);
    const now = Date.now();
    if (isNaN(timestampMs) || Math.abs(now - timestampMs) > maxToleranceSeconds * 1000) {
      return { valid: false, reason: 'Webhook signature timestamp expired or invalid' };
    }
  }

  try {
    const computedSignature = createHmac('sha256', secretKey)
      .update(rawPayload)
      .digest('hex');

    const expectedBuffer = Buffer.from(computedSignature, 'utf8');
    const actualBuffer = Buffer.from(signatureHeader.replace(/^sha256=/, ''), 'utf8');

    if (expectedBuffer.length !== actualBuffer.length) {
      return { valid: false, reason: 'Signature buffer length mismatch' };
    }

    const isMatch = timingSafeEqual(expectedBuffer, actualBuffer);
    if (!isMatch) {
      return { valid: false, reason: 'Invalid cryptographic signature' };
    }

    return { valid: true };
  } catch (err: any) {
    return { valid: false, reason: `Verification error: ${err.message}` };
  }
}
