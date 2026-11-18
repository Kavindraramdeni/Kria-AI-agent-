import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { executeContentStudioAgent } from '../src/lib/services/content-studio';

async function main() {
  console.log('========================================================');
  console.log('KRIA AI Phase 3.3 — End-to-End Content Studio Agent Verification');
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

  // 2. Workflow Run 1: Instagram Caption for Acrylic Fridge Magnet (SKU: KRA-SQU-0303)
  console.log('\n--- Step 1: Executing Content Studio Agent (Input A: Instagram Magnet Caption) ---');
  const inputA = {
    sku: 'KRA-SQU-0303',
    product_name: 'Square Acrylic Photo Fridge Magnet (3x3 inch)',
    content_type: 'instagram_caption' as const,
    target_audience: 'Modern interior decor lovers and wedding gift seekers',
    tone: 'Minimalist, elegant, celebrating tactile craftsmanship',
    topic_or_prompt: 'Highlight precision laser-cut edges and strong neodymium magnet backing for refrigerator memories',
    actor_email: authData.user.email,
    supabaseClient: supabase,
  };

  const startA = Date.now();
  const resultA = await executeContentStudioAgent(inputA);
  const elapsedA = ((Date.now() - startA) / 1000).toFixed(2);

  if (!resultA.success || !resultA.output) {
    console.error('Content Studio Run A Failed:', resultA.error);
    process.exit(1);
  }

  console.log(`✓ Run A Completed in ${elapsedA}s`);
  console.log('  - Execution Mode: ', resultA.execution_mode);
  console.log('  - Model Invoked:  ', resultA.model_name);
  console.log('  - Title:          ', `"${resultA.output.title}"`);
  console.log('  - Content Type:   ', resultA.output.content_type);
  console.log('  - Saved Content ID:', resultA.saved_content_id ? `SUCCESS (${resultA.saved_content_id})` : 'None');
  console.log('  - Approval ID:    ', resultA.approval_id ? `SUCCESS (${resultA.approval_id})` : 'None');

  // 3. Workflow Run 2: B2B Wholesale Product Description (SKU: MAPF-0810-CL) (Differential Testing)
  console.log('\n--- Step 2: Executing Content Studio Agent (Input B: Wholesale B2B Product Description) ---');
  const inputB = {
    sku: 'MAPF-0810-CL',
    product_name: 'Clear Magnetic Acrylic Photo Frame (8x10 inch)',
    content_type: 'product_description' as const,
    target_audience: 'Corporate procurement officers and art gallery gift shops',
    tone: 'Authoritative, technical, B2B wholesale focused',
    topic_or_prompt: 'Detailed B2B catalog copy focusing on 12mm+12mm Grade-A cast acrylic and N52 nickel magnets',
    actor_email: authData.user.email,
    supabaseClient: supabase,
  };

  const startB = Date.now();
  const resultB = await executeContentStudioAgent(inputB);
  const elapsedB = ((Date.now() - startB) / 1000).toFixed(2);

  if (!resultB.success || !resultB.output) {
    console.error('Content Studio Run B Failed:', resultB.error);
    process.exit(1);
  }

  console.log(`✓ Run B Completed in ${elapsedB}s`);
  console.log('  - Model Invoked:  ', resultB.model_name);
  console.log('  - Title:          ', `"${resultB.output.title}"`);
  console.log('  - Content Type:   ', resultB.output.content_type);

  // 4. Differential Verification Check
  const isDistinct =
    resultA.output.title !== resultB.output.title &&
    resultA.output.content_type !== resultB.output.content_type &&
    resultA.output.body !== resultB.output.body;

  console.log('\n--- Step 3: Differential Output Sensitivity Verification ---');
  console.log('  - Input A Format:   ', resultA.output.content_type, '->', resultA.output.title);
  console.log('  - Input B Format:   ', resultB.output.content_type, '->', resultB.output.title);
  console.log('  - Verified Distinct:', isDistinct ? 'YES (Model output changed dynamically based on user input)' : 'NO');

  if (!isDistinct) {
    console.error('Failure: Content output did not differ between unique inputs.');
    process.exit(1);
  }

  // 5. Database Row Retrieval Verification
  console.log('\n--- Step 4: Independent Database Persistence Verification ---');
  if (resultA.saved_content_id) {
    const { data: contentRow, error: contentErr } = await supabase
      .from('content_items')
      .select('id, title, content_type, status, body, keywords')
      .eq('id', resultA.saved_content_id)
      .single();

    if (contentErr || !contentRow) {
      console.error('  x Failed to retrieve saved content_items row:', contentErr?.message);
      process.exit(1);
    }
    console.log('  ✓ Verified content_items row retrieved from Supabase:');
    console.log('    - ID:          ', contentRow.id);
    console.log('    - Title:       ', `"${contentRow.title}"`);
    console.log('    - Content Type:', contentRow.content_type);
    console.log('    - Status:      ', contentRow.status, '(MUST be draft)');

    if (contentRow.status !== 'draft') {
      console.error(`  x Failure: Content status is '${contentRow.status}', expected 'draft'.`);
      process.exit(1);
    }
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
      console.error('  x Security Breach: Content was published prior to human approval!');
      process.exit(1);
    }
  }

  // 7. Activity Log Verification
  console.log('\n--- Step 6: Activity Log Verification ---');
  const { data: activityRows, error: actErr } = await supabase
    .from('activity_logs')
    .select('id, action, description, actor_id, created_at')
    .eq('action', 'content_generated_real_ai')
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
  console.log('Content Studio Agent Workflow Successfully Verified End-to-End!');
  console.log('========================================================');
}

main().catch((err) => {
  console.error('Verification Error:', err);
  process.exit(1);
});
