/**
 * Transactional Email Provider Adapter (Resend API)
 * Sends live transactional emails with delivery tracking.
 * Requires:
 *   - RESEND_API_KEY
 *   - RESEND_FROM_EMAIL (e.g., 'orders@kriatech.in' or 'notifications@kriatech.in')
 */

export interface EmailDispatchParams {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export interface EmailDispatchResponse {
  success: boolean;
  provider: 'resend';
  externalMessageId?: string;
  recipient: string;
  rawResponse?: any;
  error?: string;
}

export async function sendTransactionalEmail(
  params: EmailDispatchParams
): Promise<EmailDispatchResponse> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'KRIA TECH <orders@kriatech.in>';

  if (!apiKey) {
    throw new Error('EMAIL_CONFIG_MISSING: RESEND_API_KEY is not configured.');
  }

  const endpoint = 'https://api.resend.com/emails';

  const payload = {
    from: fromEmail,
    to: [params.to],
    subject: params.subject,
    html: params.htmlContent,
    text: params.textContent || params.htmlContent.replace(/<[^>]*>/g, ''),
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseJson = await response.json().catch(() => ({}));

  if (!response.ok || !responseJson.id) {
    const errorDetails = responseJson.message || responseJson.error || response.statusText;
    throw new Error(`EMAIL_API_ERROR (${response.status}): ${errorDetails}`);
  }

  // Verified actual email message ID from Resend (re_...)
  const externalMessageId = responseJson.id;

  return {
    success: true,
    provider: 'resend',
    externalMessageId,
    recipient: params.to,
    rawResponse: responseJson,
  };
}
