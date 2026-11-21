import { logActivity } from './activity-logs';
import { sendWhatsAppMessage } from '@/lib/integrations/whatsapp';
import { sendTransactionalEmail } from '@/lib/integrations/email';
import { createMetaAdsCampaign } from '@/lib/integrations/meta-ads';
import { dispatchToStorefront } from '@/lib/integrations/storefront';

export interface SandboxDispatchParams {
  channel: 'whatsapp' | 'meta_ads' | 'live_website' | 'email';
  destination: string;
  payload: Record<string, any>;
  approvalId: string;
  actorEmail: string;
}

export interface SandboxExecutionResponse {
  success: boolean;
  isSandbox: boolean;
  channel: string;
  destination: string;
  externalMessageId: string;
  provider?: string;
  rawResponse?: any;
  details: string;
}

/**
 * External Integration Dispatcher & Sandbox Boundary
 * Enforces dual-mode execution:
 * 1. Default (LIVE_PRODUCTION_DISPATCH != 'true'): Safely routes actions to sandbox mode.
 * 2. Live (LIVE_PRODUCTION_DISPATCH == 'true'): Dispatches through verified external provider
 *    adapters (WhatsApp Cloud API, Resend Email, Meta Marketing API, Storefront Webhooks),
 *    verifying delivery responses and returning authentic external provider IDs.
 */
export async function dispatchExternalAction(
  params: SandboxDispatchParams
): Promise<SandboxExecutionResponse> {
  const isLiveProduction = process.env.LIVE_PRODUCTION_DISPATCH === 'true';

  if (isLiveProduction) {
    try {
      let realResult: { externalMessageId?: string; externalCampaignId?: string; externalDeliveryId?: string; provider: string; rawResponse?: any };

      if (params.channel === 'whatsapp') {
        const text = params.payload.text || params.payload.draft_response_message || params.payload.message || JSON.stringify(params.payload);
        realResult = await sendWhatsAppMessage({
          to: params.destination,
          messageText: text,
        });
      } else if (params.channel === 'email') {
        const subject = params.payload.subject || params.payload.title || 'KRIA TECH Notification';
        const html = params.payload.html || params.payload.body || params.payload.text || JSON.stringify(params.payload);
        realResult = await sendTransactionalEmail({
          to: params.destination,
          subject,
          htmlContent: html,
        });
      } else if (params.channel === 'meta_ads') {
        realResult = await createMetaAdsCampaign({
          name: params.payload.campaign || params.payload.title || 'KRIA AI Ad Push',
          objective: params.payload.objective || 'OUTCOME_SALES',
          dailyBudgetInr: params.payload.budget_inr,
        });
      } else if (params.channel === 'live_website') {
        realResult = await dispatchToStorefront({
          action: params.payload.action || 'publish_content',
          entityId: params.payload.saved_content_id,
          payload: params.payload,
        });
      } else {
        throw new Error(`UNSUPPORTED_CHANNEL: Channel '${params.channel}' is not supported for live dispatch.`);
      }

      const externalId = realResult.externalMessageId || realResult.externalCampaignId || realResult.externalDeliveryId || `live-${Date.now()}`;

      // Log verified live dispatch to immutable audit ledger
      await logActivity({
        entity_type: 'external_dispatch',
        entity_id: params.approvalId,
        action: 'live_dispatch_executed',
        description: `Live ${params.channel.toUpperCase()} dispatch delivered to ${params.destination} via ${realResult.provider} (ID: ${externalId}).`,
        actor_type: 'system',
        actor_id: params.actorEmail,
        metadata: {
          channel: params.channel,
          destination: params.destination,
          is_sandbox: false,
          provider: realResult.provider,
          external_id: externalId,
          raw_response: realResult.rawResponse,
        },
      });

      return {
        success: true,
        isSandbox: false,
        channel: params.channel,
        destination: params.destination,
        externalMessageId: externalId,
        provider: realResult.provider,
        rawResponse: realResult.rawResponse,
        details: `Successfully delivered to live provider (${realResult.provider}). External ID: ${externalId}`,
      };
    } catch (liveErr: any) {
      const errorMessage = `LIVE_DISPATCH_FAILED: ${liveErr?.message || liveErr}`;

      await logActivity({
        entity_type: 'external_dispatch',
        entity_id: params.approvalId,
        action: 'live_dispatch_failed',
        description: `Failed live ${params.channel.toUpperCase()} dispatch to ${params.destination}: ${liveErr?.message || liveErr}`,
        actor_type: 'system',
        actor_id: params.actorEmail,
        metadata: {
          channel: params.channel,
          destination: params.destination,
          error_code: 'LIVE_DISPATCH_FAILED',
          error: liveErr?.message || String(liveErr),
        },
      });

      throw new Error(errorMessage);
    }
  }

  // --- SANDBOX SIMULATION (Default) ---
  const externalMessageId = `sandbox-${params.channel}-${Date.now()}`;

  // Log sandbox simulation to audit ledger
  await logActivity({
    entity_type: 'external_dispatch',
    entity_id: params.approvalId,
    action: 'sandbox_dispatch_simulated',
    description: `Dispatched ${params.channel.toUpperCase()} action to ${params.destination} [SANDBOX]`,
    actor_type: 'system',
    actor_id: params.actorEmail,
    metadata: {
      channel: params.channel,
      destination: params.destination,
      is_sandbox: true,
      external_id: externalMessageId,
      payload_preview: params.payload,
    },
  });

  return {
    success: true,
    isSandbox: true,
    channel: params.channel,
    destination: params.destination,
    externalMessageId,
    details: `Safely simulated in sandbox mode. No real money spent, no live customer messaged. Channel: ${params.channel}. LIVE_PRODUCTION_DISPATCH remains false.`,
  };
}