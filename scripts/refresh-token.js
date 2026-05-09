#!/usr/bin/env node
/**
 * JWT của Supabase hết hạn sau 1 giờ. Script này login lại và update
 * VITE_DEV_TOKEN trong .env.
 */
import './_node-shim.js';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error('Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong .env');
  process.exit(1);
}

const rl = readline.createInterface({ input, output });
const sb = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = await rl.question('Email: ');
const password = await rl.question('Password: ');
const { data, error } = await sb.auth.signInWithPassword({ email, password });
if (error) { console.error('❌', error.message); process.exit(1); }

const lines = existsSync(envPath) ? readFileSync(envPath, 'utf8').split('\n') : [];
const out = lines.map((l) =>
  l.startsWith('VITE_DEV_TOKEN=') ? `VITE_DEV_TOKEN=${data.session.access_token}` : l
);
if (!out.some((l) => l.startsWith('VITE_DEV_TOKEN='))) {
  out.push(`VITE_DEV_TOKEN=${data.session.access_token}`);
}
writeFileSync(envPath, out.join('\n'));
console.log('✓ Refreshed VITE_DEV_TOKEN');
rl.close();
