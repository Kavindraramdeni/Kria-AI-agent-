import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '../src/lib/supabase/client';
import { executeSalesLeadAgent } from '../src/lib/services/sales-lead-agent';

async function main() {
  console.log('========================================================');
  console.log('KRIA AI Phase 2C — Live Sales & CRM Lead Agent Verification');
  console.log('========================================================');

  // Authenticate session if possible
  const supabase = createClient();
  const adminEmail = process.env.KRIA_ADMIN_EMAIL || 'sales@kriatech.in';
  const { data: authData } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password: process.env.KRIA_ADMIN_PASSWORD || 'kria-demo-pass-2026',
  });
  if (authData?.user) {
    console.log('Authenticated session established for:', authData.user.email);
  }

  console.log('Invoking Google GenAI with Gemini 3.5 Flash Lite for Sales Lead Scoring...\n');

  const start = Date.now();
  const result = await executeSalesLeadAgent({
    lead_name: 'Vikram Mehta',
    business_name: 'Mehta Corporate Gifting Mumbai',
    sku: 'KRA-REC-0604',
    quantity: 500,
    has_subscription: false,
    budget: 45000,
    location: 'Mumbai, Maharashtra',
    topic_or_prompt: 'Urgent inquiry for 500 pieces of 6x4 photo magnets for annual tech conference return gifts next month. Need sample first.',
  });
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);

  console.log(`Execution completed in ${elapsed}s`);
  console.log('Success:', result.success);
  console.log('Execution Mode:', result.execution_mode);
  console.log('Model Invoked:', result.model_invoked);
  console.log('Is Simulated:', result.is_simulated);
  console.log('Model Name:', result.model_name);
  console.log('Saved Lead ID (Supabase):', result.saved_lead_id);
  console.log('Approval Request ID:', result.approval_id);
  console.log('Conflicts Detected:', result.conflicts_detected);

  console.log('\n--- Pricing Engine Calculation ---');
  console.log('SKU:', result.quote?.sku);
  console.log('Product:', result.quote?.product_name);
  console.log('Quantity:', result.quote?.quantity);
  console.log('Tier Applied:', result.quote?.tier_applied);
  console.log('Effective Unit Price: ₹', result.quote?.effective_unit_price);
  console.log('Final Total Amount: ₹', result.quote?.final_total_inr);
  console.log('Below Bulk MOQ:', result.quote?.is_below_moq);

  console.log('\n--- Model Output (Gemini 3.5 Flash Lite) ---');
  console.log('Intent Score:', result.output?.score, '/ 100');
  console.log('Priority:', result.output?.priority);
  console.log('Intent Tier:', result.output?.intent_tier);
  console.log('Suggested Follow-up:', result.output?.suggested_follow_up_hours, 'hours');
  console.log('Suggested Action:', result.output?.suggested_action);
  console.log('Reasoning Summary:', result.output?.reasoning_summary);
  console.log('\nRecommended Quote Reported by AI:');
  console.log(result.output?.recommended_quote);
  console.log('\nDraft Response Message (WhatsApp / Email):');
  console.log(result.output?.draft_response_message);
  console.log('\nVerified Facts Referenced:');
  result.output?.verified_facts?.forEach((fact) => {
    console.log(`  * ${fact}`);
  });
  console.log('========================================================');
}

main().catch((err) => {
  console.error('Live Verification Failed:', err);
  process.exit(1);
});
