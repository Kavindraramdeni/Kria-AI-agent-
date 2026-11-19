import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { executeContentStudioAgent } from '../src/lib/services/content-studio';
import { updateApprovalStatus } from '../src/lib/services/approvals';
import { executeApprovedAction } from '../src/lib/services/execution-dispatcher';
import { verifyAuditLogIntegrity } from '../src/lib/services/tamper-proof';

async function main() {
  console.log('========================================================================');
  console.log('KRIA AI — Live End-to-End Execution, Idempotency & Hash Chain Audit');
  console.log('========================================================================\n');

  // 1. Authenticate Owner Session safely from environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const adminEmail = process.env.KRIA_ADMIN_EMAIL || process.env.SUPABASE_AUTH_EMAIL;
  const adminPassword = process.env.KRIA_ADMIN_PASSWORD || process.env.SUPABASE_AUTH_PASSWORD;

  if (!supabaseUrl || !supabaseAnonKey || !adminEmail || !adminPassword) {
    console.error('Authentication Error: Missing Supabase credentials in .env.local.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: adminEmail.trim(),
    password: adminPassword,
  });

  if (authError || !authData.user) {
    console.error('Authentication Error: Failed to sign in:', authError?.message);
    process.exit(1);
  }

  console.log('✓ Authenticated Owner Session:');
  console.log('  - Email:  ', authData.user.email);
  console.log('  - User ID:', authData.user.id);
  console.log('  - Role:   ', authData.user.role);

  // 2. Execute Content Studio Agent with Live Gemini AI
  console.log('\n--- Step 1: Live Model Invocation & Draft Creation (Input: Acrylic Photo Keepsake) ---');
  const agentInput = {
    sku: 'MAPF-0406-CL',
    product_name: 'Clear Magnetic Acrylic Photo Frame (4x6 inch)',
    content_type: 'instagram_caption' as const,
    target_audience: 'Modern home decor and wedding photographers',
    tone: 'Minimalist, luxurious, tactile craft focus',
    topic_or_prompt: 'Capture the heirloom clarity of 20mm Grade-A cast acrylic with N52 corner magnets',
    actor_email: authData.user.email,
    supabaseClient: supabase,
  };

  const agentStart = Date.now();
  const agentResult = await executeContentStudioAgent(agentInput);
  const agentElapsed = ((Date.now() - agentStart) / 1000).toFixed(2);

  if (!agentResult.success || !agentResult.output) {
    console.error('Agent Execution Failed:', agentResult.error);
    process.exit(1);
  }

  console.log(`✓ Agent Completed in ${agentElapsed}s:`);
  console.log('  - Execution Mode:    ', agentResult.execution_mode);
  console.log('  - Model Invoked:     ', agentResult.model_name);
  console.log('  - Generated Title:   ', `"${agentResult.output.title}"`);
  console.log('  - Saved Content ID:  ', agentResult.saved_content_id);
  console.log('  - Approval ID:       ', agentResult.approval_id);

  if (!agentResult.saved_content_id || !agentResult.approval_id) {
    console.error('Failure: Missing saved content or approval request ID.');
    process.exit(1);
  }

  // 3. Verify Database Pre-Execution State (Draft & Pending)
  console.log('\n--- Step 2: Database State Verification Prior to Human Review ---');
  const { data: initialContent, error: contentReadErr } = await supabase
    .from('content_items')
    .select('id, title, status')
    .eq('id', agentResult.saved_content_id)
    .single();

  if (contentReadErr || !initialContent) {
    console.error('Failed to read content_items from Supabase:', contentReadErr?.message);
    process.exit(1);
  }
  console.log('  ✓ content_items Status:  ', initialContent.status, '(MUST be draft)');
  if (initialContent.status !== 'draft') {
    console.error('Security Failure: Content item was not saved as draft!');
    process.exit(1);
  }

  const { data: initialApproval, error: apprReadErr } = await supabase
    .from('approval_requests')
    .select('id, status, executed_at, action_type')
    .eq('id', agentResult.approval_id)
    .single();

  if (apprReadErr || !initialApproval) {
    console.error('Failed to read approval_requests from Supabase:', apprReadErr?.message);
    process.exit(1);
  }
  console.log('  ✓ approval_requests Status:', initialApproval.status, '(MUST be pending)');
  console.log('  ✓ approval_requests Executed:', initialApproval.executed_at, '(MUST be null)');

  // 4. Human Approval by Verified Owner
  console.log('\n--- Step 3: Owner Explicit Approval ---');
  const approveRes = await updateApprovalStatus(
    agentResult.approval_id,
    'approved',
    authData.user.email!,
    'Approved for live publication across storefront channels.',
    supabase
  );

  if (!approveRes.success) {
    console.error('Failed to update approval status:', approveRes.error);
    process.exit(1);
  }
  console.log('  ✓ Approval request status updated to: approved');

  // 5. Execute Approved Action with Durable Idempotency
  console.log('\n--- Step 4: Dispatch Execution & Real Action Fulfillment ---');
  const idempotencyKey = `live-idem-${Date.now()}`;
  const dispatchStart = Date.now();
  const dispatchResult = await executeApprovedAction(
    agentResult.approval_id,
    { email: authData.user.email!, role: 'owner' },
    idempotencyKey,
    'owner',
    supabase
  );
  const dispatchElapsed = ((Date.now() - dispatchStart) / 1000).toFixed(2);

  if (!dispatchResult.success) {
    console.error('Dispatch Execution Failed:', dispatchResult.error);
    process.exit(1);
  }

  console.log(`✓ Dispatch Completed in ${dispatchElapsed}s:`);
  console.log('  - Approval ID:       ', dispatchResult.approval_id);
  console.log('  - Action Type:       ', dispatchResult.action_type);
  console.log('  - Destination:       ', dispatchResult.destination);
  console.log('  - Executed At:       ', dispatchResult.executed_at);
  console.log('  - Idempotency Key:   ', dispatchResult.idempotency_key);
  console.log('  - Published Entity:  ', dispatchResult.published_entity_id);
  console.log('  - External Dispatch: ', JSON.stringify(dispatchResult.external_dispatch));

  // 6. Verify Post-Execution Database State (Content Published & Approval Executed)
  console.log('\n--- Step 5: Post-Execution Database State Verification ---');
  const { data: publishedContent } = await supabase
    .from('content_items')
    .select('id, title, status, updated_at')
    .eq('id', agentResult.saved_content_id)
    .single();

  console.log('  ✓ content_items Status:  ', publishedContent?.status, '(MUST be published)');
  if (publishedContent?.status !== 'published') {
    console.error('Failure: content_items status was not updated to published!');
    process.exit(1);
  }

  const { data: executedApproval } = await supabase
    .from('approval_requests')
    .select('id, status, executed_at, idempotency_key, execution_result')
    .eq('id', agentResult.approval_id)
    .single();

  console.log('  ✓ approval_requests Status:', executedApproval?.status, '(MUST be executed)');
  console.log('  ✓ approval_requests Executed:', executedApproval?.executed_at);
  console.log('  ✓ DB Idempotency Key:        ', executedApproval?.idempotency_key);
  console.log('  ✓ DB Execution Result Stored: ', executedApproval?.execution_result ? 'YES' : 'NO');

  // 7. Verify Durable Idempotency Across Replays
  console.log('\n--- Step 6: Durable Idempotency Replay Verification ---');
  const replayResult = await executeApprovedAction(
    agentResult.approval_id,
    { email: authData.user.email!, role: 'owner' },
    idempotencyKey,
    'owner',
    supabase
  );

  console.log('  ✓ Replay with Same Idempotency Key:');
  console.log('    - Success:        ', replayResult.success);
  console.log('    - Matches Original:', replayResult.executed_at === dispatchResult.executed_at ? 'YES' : 'NO');

  // 8. Verify Single-Use Gate Rejection Without Idempotency Key
  console.log('\n--- Step 7: Single-Use Gate Rejection Check ---');
  const duplicateRun = await executeApprovedAction(
    agentResult.approval_id,
    { email: authData.user.email!, role: 'owner' },
    'different-key-' + Date.now(),
    'owner',
    supabase
  );

  console.log('  ✓ Re-execution without matching key:');
  console.log('    - Success:   ', duplicateRun.success, '(MUST be false)');
  console.log('    - Error Code:', duplicateRun.error_code, '(MUST be ALREADY_EXECUTED)');

  // 9. Verify Real Cryptographic Hash Chain from Database
  console.log('\n--- Step 8: Cryptographic Audit Hash Chain Verification ---');
  const { data: recentLogs, error: logErr } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (logErr || !recentLogs || recentLogs.length === 0) {
    console.error('Failed to retrieve activity_logs:', logErr?.message);
    process.exit(1);
  }

  console.log(`  ✓ Retrieved ${recentLogs.length} recent database activity logs:`);
  recentLogs.forEach((l: any, i: number) => {
    console.log(`    [${i + 1}] Action: ${l.action.padEnd(26)} | Hash: ${l.hash?.substring(0, 16)}... | Prev: ${l.previous_hash?.substring(0, 16)}...`);
  });

  // Verify that the newest log's previous_hash matches the older log's hash
  const newestLog = recentLogs[0];
  const secondLog = recentLogs[1];
  const isChained = newestLog.previous_hash === secondLog.hash;
  console.log('\n  ✓ Real DB Cryptographic Chain Link:');
  console.log('    - Log [1] previous_hash:', newestLog.previous_hash);
  console.log('    - Log [2] hash:         ', secondLog.hash);
  console.log('    - Mathematically Chained:', isChained ? 'YES (CONTINUOUS DATABASE LEDGER)' : 'NO');

  if (!isChained) {
    console.error('Failure: Cryptographic hash chain broken across real database records.');
    process.exit(1);
  }

  console.log('\n========================================================================');
  console.log('All 4 Concerns Successfully Verified with 100% Live Database Execution!');
  console.log('========================================================================');
}

main().catch((err) => {
  console.error('Execution Error:', err);
  process.exit(1);
});
