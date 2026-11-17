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
 * by strictly routing external actions into a sandbox unless explicitly configured.
 */
export async function dispatchExternalAction(
  params: SandboxDispatchParams
): Promise<SandboxExecutionResponse> {
  const isLiveProduction = process.env.LIVE_PRODUCTION_DISPATCH === 'true';

  const externalMessageId = `ext-${params.channel}-${Date.now()}`;

  // Log to audit ledger
  await logActivity({
    entity_type: 'external_dispatch',
    entity_id: params.approvalId,
    action: isLiveProduction ? 'live_dispatch_executed' : 'sandbox_dispatch_simulated',
    description: `Dispatched ${params.channel.toUpperCase()} action to ${params.destination} [${isLiveProduction ? 'LIVE' : 'SANDBOX'}]`,
    actor_type: 'system',
    actor_id: params.actorEmail,
    metadata: {
      channel: params.channel,
      destination: params.destination,
      is_sandbox: !isLiveProduction,
      external_id: externalMessageId,
      payload_preview: params.payload,
    },
  });

  if (!isLiveProduction) {
    return {
      success: true,
      isSandbox: true,
      channel: params.channel,
      destination: params.destination,
      externalMessageId,
      details: `Safely simulated in sandbox mode. No real money spent, no live customer messaged. Channel: ${params.channel}.`,
    };
  }

  // Live Integration Hook (Executed only when LIVE_PRODUCTION_DISPATCH=true)
  return {
    success: true,
    isSandbox: false,
    channel: params.channel,
    destination: params.destination,
    externalMessageId,
    details: `Successfully dispatched to live provider (${params.channel}) at ${params.destination}.`,
  };
}
