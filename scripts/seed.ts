import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local or .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.log('---------------------------------------------------------');
  console.log('KRIA AI - Seed Script Notice:');
  console.log('Supabase URL or SUPABASE_SERVICE_ROLE_KEY is not defined.');
  console.log('To apply migrations and seed to your Supabase project:');
  console.log('1. Copy .env.example to .env.local');
  console.log('2. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  console.log('3. Run: npm run seed');
  console.log('Or copy and execute the SQL files in /supabase/migrations/ in the Supabase SQL editor.');
  console.log('---------------------------------------------------------');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('Connecting to Supabase at:', supabaseUrl);
  // Verify connectivity
  const { data, error } = await supabase.from('products').select('count', { count: 'exact', head: true });
  if (error) {
    console.warn('Could not query products table. Ensure SQL migrations have been executed in Supabase SQL editor first.');
    console.error('Error detail:', error.message);
    process.exit(1);
  }
  console.log('Successfully connected to Supabase database. Current product count:', data);
}

main().catch(console.error);
