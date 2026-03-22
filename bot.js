/**
 * bot.js — Demo transaction simulator for Landly
 *
 * Reads Supabase credentials from .env.local and records
 * fake buy-transactions through a transactional RPC so the
 * frontend realtime activity feed stays consistent.
 *
 * Usage:  node bot.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ── Load .env.local ──────────────────────────────────────
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌  .env.local not found. Create it with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    process.env[key] = value;
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'placeholder-url') {
  console.error('❌  Set real Supabase credentials in .env.local first, including SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ── Fake display names ───────────────────────────────────
const NAMES = [
  'Arjun M.', 'Priya S.', 'Rahul K.', 'Sneha R.', 'Vikram P.',
  'Anjali D.', 'Karthik N.', 'Meera T.', 'Arun V.', 'Divya L.',
  'Nikhil B.', 'Pooja G.', 'Suresh J.', 'Lakshmi H.', 'Ravi C.',
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Main loop ────────────────────────────────────────────
async function run() {
  // Fetch all live properties
  const { data: properties, error } = await supabase
    .from('properties')
    .select('id, share_price, shares_available, title')
    .eq('status', 'live')
    .gt('shares_available', 0);

  if (error) {
    console.error('❌  Failed to fetch properties:', error.message);
    process.exit(1);
  }

  if (!properties || properties.length === 0) {
    console.log('⚠️  No live properties with available shares found. Add some first.');
    process.exit(0);
  }

  console.log(`🤖  Bot started — found ${properties.length} live properties.`);
  console.log('    Press Ctrl+C to stop.\n');

  async function tick() {
    const prop = randomItem(properties);
    const shares = randomInt(1, Math.min(3, prop.shares_available));
    const userName = randomItem(NAMES);

    const { data, error: tradeError } = await supabase.rpc('record_demo_trade', {
      target_property_id: prop.id,
      requested_shares: shares,
      demo_buyer_name: userName,
    });

    if (tradeError) {
      console.error(`   ✗ Demo trade failed: ${tradeError.message}`);
    } else {
      const result = Array.isArray(data) ? data[0] : data;
      prop.shares_available = Math.max(Number(result?.sharesRemaining ?? prop.shares_available), 0);
      console.log(`   ✓ ${result?.buyerName || userName} bought ${shares} share(s) of "${result?.propertyTitle || prop.title}" (₹${result?.totalAmount ?? shares * prop.share_price})`);
    }

    // Schedule next tick between 3–8 seconds
    const delay = randomInt(3000, 8000);
    setTimeout(tick, delay);
  }

  tick();
}

run();
