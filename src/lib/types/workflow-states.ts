/**
 * R4. Unified Task Lifecycle & Execution State Clarity
 * Six explicit execution states for KRIA AI actions and workflow runs.
 */

export type ExecutionState =
  | 'ai_generated'      // AI created a result/draft
  | 'awaiting_approval' // Owner must review before anything happens
  | 'simulated'         // Dispatched in sandbox (LIVE_PRODUCTION_DISPATCH=false)
  | 'sent_to_provider'  // Dispatched to real external provider
  | 'provider_accepted' // Provider returned success response (wamid, re_xxx etc)
  | 'customer_responded'; // Inbound reply received from customer

export const ExecutionStateLabels: Record<ExecutionState, string> = {
  ai_generated: 'AI Generated',
  awaiting_approval: 'Awaiting Approval',
  simulated: 'Simulated (Sandbox)',
  sent_to_provider: 'Sent to Provider',
  provider_accepted: 'Provider Accepted',
  customer_responded: 'Customer Responded',
};

export const ExecutionStateDescriptions: Record<ExecutionState, string> = {
  ai_generated:
    'The AI agent has produced a draft or result. No action has been taken externally.',
  awaiting_approval:
    'The owner must review and explicitly approve before this action is dispatched.',
  simulated:
    'The action was dispatched in sandbox mode (LIVE_PRODUCTION_DISPATCH=false). No real message was sent.',
  sent_to_provider:
    'The action payload was forwarded to the external service provider (WhatsApp Business API, email relay, etc.).',
  provider_accepted:
    'The provider confirmed receipt and assigned a message ID (e.g. wamid, email message-id).',
  customer_responded:
    'An inbound reply from the customer has been received and linked to this action.',
};
