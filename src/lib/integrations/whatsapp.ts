/**
 * WhatsApp Business Cloud API Adapter (Meta Graph API v21.0)
 * Sends live WhatsApp messages via official Meta Cloud API endpoint.
 * Requires:
 *   - WHATSAPP_ACCESS_TOKEN (Permanent System User Token)
 *   - WHATSAPP_PHONE_NUMBER_ID (Sender WABA phone number ID)
 */

export interface WhatsAppDispatchParams {
  to: string;
  messageText: string;
  templateName?: string;
  templateLanguage?: string;
}

export interface WhatsAppDispatchResponse {
  success: boolean;
  provider: 'whatsapp_cloud_api';
  externalMessageId?: string;
  recipient: string;
  rawResponse?: any;
  error?: string;
}

export async function sendWhatsAppMessage(
  params: WhatsAppDispatchParams
): Promise<WhatsAppDispatchResponse> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!token || !phoneNumberId) {
    throw new Error(
      'WHATSAPP_CONFIG_MISSING: WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is not configured.'
    );
  }

  // Normalize phone number (strip spaces, dashes, plus sign)
  const recipient = params.to.replace(/[^0-9]/g, '');
  if (!recipient || recipient.length < 10) {
    throw new Error(`INVALID_PHONE_NUMBER: Destination '${params.to}' is not a valid WhatsApp recipient.`);
  }

  const endpoint = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

  const payload: Record<string, any> = {
    messaging_product: 'whatsapp',
    to: recipient,
    type: params.templateName ? 'template' : 'text',
  };

  if (params.templateName) {
    payload.template = {
      name: params.templateName,
      language: { code: params.templateLanguage || 'en_US' },
    };
  } else {
    payload.text = { body: params.messageText };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseJson = await response.json().catch(() => ({}));

  if (!response.ok || !responseJson.messages?.[0]?.id) {
    const errorDetails = responseJson.error?.message || response.statusText;
    throw new Error(`WHATSAPP_API_ERROR (${response.status}): ${errorDetails}`);
  }

  // Verified delivery from Meta Cloud API
  const externalMessageId = responseJson.messages[0].id; // wamid.HBg...

  return {
    success: true,
    provider: 'whatsapp_cloud_api',
    externalMessageId,
    recipient,
    rawResponse: responseJson,
  };
}
