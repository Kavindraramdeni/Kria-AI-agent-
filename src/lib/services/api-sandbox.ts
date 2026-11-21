import { logActivity } from './activity-logs';

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
  details: string;
}

/**
 * External Integration Sandbox Adapter
 * Critical Financial & Operational Guardrail:
 * Prevents accidental ad spends, live website modifications, or customer messages
 * by strictly routing external actions into a sandbox.
 *
 * PRODUCTION BLOCKER INVARIANT:
 * Setting LIVE_PRODUCTION_DISPATCH=true does NOT make integrations live.
 * Real provider adapters (WhatsApp Business Cloud API, Meta Marketing API, SMTP/Resend)
 * do not exist in this codebase yet. To prevent false claims of live execution or
 * unverified external calls, setting LIVE_PRODUCTION_DISPATCH=true is explicitly blocked.
 * Keep LIVE_PRODUCTION_DISPATCH=false.
 */
export async function dispatchExternalAction(
  params: SandboxDispatchParams
): Promise<SandboxExecutionResponse> {
  const isLiveProduction = process.env.LIVE_PRODUCTION_DISPATCH === 'true';

  if (isLiveProduction) {
    const blockReason =
      `LIVE_DISPATCH_BLOCKED: Live external dispatch for channel '${params.channel}' is not implemented. ` +
      `Real provider adapters (e.g. WhatsApp Business Cloud API, Meta Marketing API, SMTP/Resend) ` +
      `and verified credentials must be implemented and tested before enabling live dispatch. ` +
      `Keep LIVE_PRODUCTION_DISPATCH=false.`;

    await logActivity({
      entity_type: 'external_dispatch',
      entity_id: params.approvalId,
      action: 'live_dispatch_blocked',
      description: `Blocked attempted live ${params.channel.toUpperCase()} dispatch to ${params.destination} - provider adapter not implemented.`,
      actor_type: 'system',
      actor_id: params.actorEmail,
      metadata: {
        channel: params.channel,
        destination: params.destination,
        error_code: 'LIVE_DISPATCH_BLOCKED',
        reason: blockReason,
      },
    });

    throw new Error(blockReason);
  }

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
    details: `Safely simulated in sandbox mode. No real money spent, no live customer messaged. Channel: ${params.channel}. Real provider adapters are not configured; LIVE_PRODUCTION_DISPATCH remains false.`,
  };
}
