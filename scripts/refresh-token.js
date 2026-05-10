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
const root = join(__dirname, '..');
const envPath = join(root, '.env');
const configPath = join(root, 'mushy.config.json');

if (!existsSync(configPath)) {
  console.error('❌ Thiếu mushy.config.json ở root repo.');
  process.exit(1);
}
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const SUPABASE_URL = config.supabase?.url;
const ANON_KEY = config.supabase?.anonKey;

if (!SUPABASE_URL || !ANON_KEY || ANON_KEY.includes('REPLACE_WITH')) {
  console.error('❌ mushy.config.json thiếu/placeholder supabase URL hoặc anon key.');
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
