/**
 * bot.js — Demo transaction simulator for Landly
 *
 * Reads Supabase credentials from .env.local and inserts
 * fake buy-transactions at random intervals so the frontend
 * realtime activity feed has data to display.
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
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'placeholder-url') {
  console.error('❌  Set real Supabase credentials in .env.local first.');
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

    const { error: txErr } = await supabase
      .from('transactions')
      .insert({
        property_id: prop.id,
        user_name: userName,
        shares,
        price_per_share: prop.share_price,
        total_amount: shares * prop.share_price,
      });

    if (txErr) {
      console.error(`   ✗ Insert failed: ${txErr.message}`);
    } else {
      console.log(`   ✓ ${userName} bought ${shares} share(s) of "${prop.title}" (₹${shares * prop.share_price})`);
    }

    // Also update shares_available on the property
    const newAvailable = prop.shares_available - shares;
    prop.shares_available = Math.max(newAvailable, 0);

    if (prop.shares_available > 0) {
      await supabase
        .from('properties')
        .update({ shares_available: prop.shares_available })
        .eq('id', prop.id);
    }

    // Schedule next tick between 3–8 seconds
    const delay = randomInt(3000, 8000);
    setTimeout(tick, delay);
  }

  tick();
}

run();
