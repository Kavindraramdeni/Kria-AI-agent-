import { createHmac } from 'crypto';

/**
 * Storefront CMS / Webhook Integration Adapter
 * Sends signed webhook dispatches to KRIA TECH storefront (kriatech.in)
 * Keeps customer database completely isolated by using HMAC-signed HTTP webhooks.
 * Requires:
 *   - STOREFRONT_WEBHOOK_URL (e.g. 'https://kriatech.in/api/webhooks/kria-ai')
 *   - STOREFRONT_WEBHOOK_SECRET (Shared secret for HMAC-SHA256 signature)
 */

export interface StorefrontDispatchParams {
  action: 'publish_content' | 'update_seo' | 'sync_product';
  entityId?: string;
  payload: Record<string, any>;
}

export interface StorefrontDispatchResponse {
  success: boolean;
  provider: 'storefront_webhook';
  externalDeliveryId?: string;
  targetUrl: string;
  rawResponse?: any;
  error?: string;
}

export async function dispatchToStorefront(
  params: StorefrontDispatchParams
): Promise<StorefrontDispatchResponse> {
  const webhookUrl = process.env.STOREFRONT_WEBHOOK_URL;
  const secret = process.env.STOREFRONT_WEBHOOK_SECRET;

  if (!webhookUrl || !secret) {
    throw new Error(
      'STOREFRONT_CONFIG_MISSING: STOREFRONT_WEBHOOK_URL or STOREFRONT_WEBHOOK_SECRET is not configured.'
    );
  }

  const timestamp = Date.now().toString();
  const bodyString = JSON.stringify({
    action: params.action,
    entityId: params.entityId,
    payload: params.payload,
    timestamp,
  });

  // Cryptographic HMAC SHA-256 signature to guarantee authenticity
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.${bodyString}`)
    .digest('hex');

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Kria-Signature': signature,
      'X-Kria-Timestamp': timestamp,
    },
    body: bodyString,
  });

  const responseJson = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorDetails = responseJson.error || response.statusText;
    throw new Error(`STOREFRONT_WEBHOOK_ERROR (${response.status}): ${errorDetails}`);
  }

  const externalDeliveryId = responseJson.delivery_id || `deliv-${Date.now()}`;

  return {
    success: true,
    provider: 'storefront_webhook',
    externalDeliveryId,
    targetUrl: webhookUrl,
    rawResponse: responseJson,
  };
}
