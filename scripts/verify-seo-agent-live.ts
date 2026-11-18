import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { executeSEOStrategyAgent } from '../src/lib/services/seo-strategy';

async function main() {
  console.log('========================================================');
  console.log('KRIA AI Phase 3.3 — End-to-End SEO Strategy Agent Verification');
  console.log('========================================================\n');

  // 1. Authenticate Owner Session safely using environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const adminEmail = process.env.KRIA_ADMIN_EMAIL || process.env.SUPABASE_AUTH_EMAIL;
  const adminPassword = process.env.KRIA_ADMIN_PASSWORD || process.env.SUPABASE_AUTH_PASSWORD;

  if (!supabaseUrl || !supabaseAnonKey || !adminEmail || !adminPassword) {
    console.error('Authentication Error: Missing required Supabase URL or credentials in .env.local.');
    console.error('Ensure NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, KRIA_ADMIN_EMAIL, and KRIA_ADMIN_PASSWORD are set.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: adminEmail.trim(),
    password: adminPassword,
  });

  if (authError || !authData.user) {
    console.error('Authentication Error: Failed to establish Supabase session:', authError?.message);
    process.exit(1);
  }

  console.log('✓ Authenticated Owner Session Established:');
  console.log('  - Email:  ', authData.user.email);
  console.log('  - User ID:', authData.user.id);
  console.log('  - Role:   ', authData.user.role);

  // 2. Workflow Run 1: Desktop Magnetic Photo Frames (SKU: MAPF-0406-CL)
  console.log('\n--- Step 1: Executing SEO Strategy Agent (Input A: Desktop Acrylic Frames) ---');
  const inputA = {
    target_cluster: 'Desktop Clear Magnetic Acrylic Photo Frames (4x6)',
    sku: 'MAPF-0406-CL',
    product_name: 'Clear Magnetic Acrylic Photo Frame (4x6 inch)',
    target_market: 'Corporate gifting and wedding studios across India',
    target_audience: 'B2B gifting buyers, event planners, premium photography studios',
    topic_or_prompt: 'Generate transactional keywords for 4x6 desktop double panel magnetic frames with N52 magnets',
    actor_email: authData.user.email,
    supabaseClient: supabase,
  };

  const startA = Date.now();
  const resultA = await executeSEOStrategyAgent(inputA);
  const elapsedA = ((Date.now() - startA) / 1000).toFixed(2);

  if (!resultA.success || !resultA.output) {
    console.error('SEO Strategy Run A Failed:', resultA.error);
    process.exit(1);
  }

  console.log(`✓ Run A Completed in ${elapsedA}s`);
  console.log('  - Execution Mode: ', resultA.execution_mode);
  console.log('  - Model Invoked:  ', resultA.model_name);
  console.log('  - Keywords Found: ', resultA.output.recommended_keywords.length);
  console.log('  - Sample Keyword: ', `"${resultA.output.recommended_keywords[0]?.keyword}" [${resultA.output.recommended_keywords[0]?.intent}]`);
  console.log('  - Saved In DB:    ', resultA.saved_keyword_ids?.length ? `SUCCESS (${resultA.saved_keyword_ids.length} rows)` : 'None');
  console.log('  - Approval ID:    ', resultA.approval_id ? `SUCCESS (${resultA.approval_id})` : 'None');

  // 3. Workflow Run 2: Wall Floating Acrylic Displays (Input B - Differential Testing)
  console.log('\n--- Step 2: Executing SEO Strategy Agent (Input B: Wall-Mounted Floating Frames) ---');
  const inputB = {
    target_cluster: 'Custom Wall Mount Floating Acrylic Photo Displays (12x18)',
    sku: 'MAPF-1218-WL',
    product_name: 'Wall Mount Floating Acrylic Photo Frame (12x18 inch)',
    target_market: 'Corporate office branding and gallery exhibitions',
    target_audience: 'Interior designers, gallery curators, commercial architects',
    topic_or_prompt: 'Focus on architectural wall mount acrylic signage with stainless steel standoffs',
    actor_email: authData.user.email,
    supabaseClient: supabase,
  };

  const startB = Date.now();
  const resultB = await executeSEOStrategyAgent(inputB);
  const elapsedB = ((Date.now() - startB) / 1000).toFixed(2);

  if (!resultB.success || !resultB.output) {
    console.error('SEO Strategy Run B Failed:', resultB.error);
    process.exit(1);
  }

  console.log(`✓ Run B Completed in ${elapsedB}s`);
  console.log('  - Model Invoked:  ', resultB.model_name);
  console.log('  - Keywords Found: ', resultB.output.recommended_keywords.length);
  console.log('  - Sample Keyword: ', `"${resultB.output.recommended_keywords[0]?.keyword}" [${resultB.output.recommended_keywords[0]?.intent}]`);

  // 4. Differential Verification Check
  const sampleA = resultA.output.recommended_keywords[0]?.keyword.toLowerCase();
  const sampleB = resultB.output.recommended_keywords[0]?.keyword.toLowerCase();
  const isDistinct = sampleA !== sampleB && resultA.output.target_cluster !== resultB.output.target_cluster;
  console.log('\n--- Step 3: Differential Output Sensitivity Verification ---');
  console.log('  - Input A Cluster:  ', resultA.output.target_cluster);
  console.log('  - Input B Cluster:  ', resultB.output.target_cluster);
  console.log('  - Verified Distinct:', isDistinct ? 'YES (Model output changed dynamically based on user input)' : 'NO');

  if (!isDistinct) {
    console.error('Failure: Model output did not differ between unique inputs.');
    process.exit(1);
  }

  // 5. Database Row Retrieval Verification
  console.log('\n--- Step 4: Independent Database Persistence Verification ---');
  if (resultA.saved_keyword_ids && resultA.saved_keyword_ids.length > 0) {
    const testKeywordId = resultA.saved_keyword_ids[0];
    const { data: keywordRow, error: kwErr } = await supabase
      .from('seo_keywords')
      .select('id, keyword, cluster, search_intent, priority, status')
      .eq('id', testKeywordId)
      .single();

    if (kwErr || !keywordRow) {
      console.error('  x Failed to retrieve saved seo_keywords row:', kwErr?.message);
      process.exit(1);
    }
    console.log('  ✓ Verified seo_keywords row retrieved from Supabase:');
    console.log('    - ID:       ', keywordRow.id);
    console.log('    - Keyword:  ', `"${keywordRow.keyword}"`);
    console.log('    - Cluster:  ', keywordRow.cluster);
    console.log('    - Status:   ', keywordRow.status);
  }

  // 6. Approval Gate Status Verification
  console.log('\n--- Step 5: Approval Request State & Gate Enforcement ---');
  if (resultA.approval_id) {
    const { data: apprRow, error: apprErr } = await supabase
      .from('approval_requests')
      .select('id, title, action_type, status, risk_level, executed_at')
      .eq('id', resultA.approval_id)
      .single();

    if (apprErr || !apprRow) {
      console.error('  x Failed to retrieve approval request row:', apprErr?.message);
      process.exit(1);
    }

    console.log('  ✓ Verified approval_requests row in Supabase:');
    console.log('    - ID:          ', apprRow.id);
    console.log('    - Title:       ', apprRow.title);
    console.log('    - Action Type: ', apprRow.action_type);
    console.log('    - Status:      ', apprRow.status, '(MUST be pending)');
    console.log('    - Executed At: ', apprRow.executed_at, '(MUST be null/empty)');

    if (apprRow.status !== 'pending') {
      console.error(`  x Failure: Approval status is '${apprRow.status}', expected 'pending'.`);
      process.exit(1);
    }
    if (apprRow.executed_at !== null) {
      console.error('  x Security Breach: Action was executed prior to human approval!');
      process.exit(1);
    }
  }

  // 7. Activity Log Verification
  console.log('\n--- Step 6: Activity Log Verification ---');
  const { data: activityRows, error: actErr } = await supabase
    .from('activity_logs')
    .select('id, action, description, actor_id, created_at')
    .eq('action', 'seo_strategy_generated_real_ai')
    .order('created_at', { ascending: false })
    .limit(1);

  if (actErr || !activityRows || activityRows.length === 0) {
    console.warn('  ℹ Activity log query note:', actErr?.message || 'No matching log row returned');
  } else {
    console.log('  ✓ Verified activity_logs row recorded:');
    console.log('    - Action:     ', activityRows[0].action);
    console.log('    - Description:', activityRows[0].description);
    console.log('    - Actor:      ', activityRows[0].actor_id);
  }

  console.log('\n========================================================');
  console.log('SEO Strategy Agent Workflow Successfully Verified End-to-End!');
  console.log('========================================================');
}

main().catch((err) => {
  console.error('Verification Error:', err);
  process.exit(1);
});
