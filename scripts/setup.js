#!/usr/bin/env node
/**
 * Một lần setup môi trường dev cho mini-app:
 *   1. Login Mushy account (email + password đã đăng ký trên Mushy app)
 *   2. Chọn workspace (đã tạo trên Mushy app — auto-tạo "Dev Workspace" nếu chưa có)
 *   3. List migrations (apply qua Admin Portal Reviewer, KHÔNG SQL Editor)
 *   4. Ghi VITE_DEV_TOKEN, VITE_DEV_WORKSPACE_ID, VITE_DEV_USER_ID, VITE_DEV_ROLE vào .env
 */

import './_node-shim.js';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
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
const SLUG = config.slug;

if (!SUPABASE_URL || !ANON_KEY || !SLUG) {
  console.error('❌ mushy.config.json thiếu slug / supabase.url / supabase.anonKey.');
  process.exit(1);
}
if (SLUG.includes('REPLACE_WITH')) {
  console.error('❌ mushy.config.json còn placeholder slug "%s".', SLUG);
  console.error('   Đổi sang slug được Mushy admin cấp (vd "expense", "crm"...) trước khi setup.');
  process.exit(1);
}
if (!/^[a-z0-9][a-z0-9_-]{2,40}$/.test(SLUG)) {
  console.error('❌ Slug "%s" không hợp lệ. Phải lowercase 3-41 ký tự [a-z0-9_-].', SLUG);
  process.exit(1);
}
if (ANON_KEY.includes('REPLACE_WITH')) {
  console.error('❌ mushy.config.json còn placeholder anon key. Đặt giá trị thật của Mushy Supabase.');
  process.exit(1);
}
console.log(`Slug: ${SLUG}`);
console.log(`Supabase: ${SUPABASE_URL}\n`);

function makeClient(token) {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : {},
  });
}

let sb = makeClient();
const rl = readline.createInterface({ input, output });

async function main() {
  console.log('— Mini-app dev setup —\n');

  // 1. Login
  const email = await rl.question('Email: ');
  const password = await rl.question('Password: ');
  const { data: auth, error: authErr } = await sb.auth.signInWithPassword({ email, password });
  if (authErr) { console.error('❌ Login failed:', authErr.message); process.exit(1); }
  console.log('✓ Logged in as', auth.user.email);

  // Re-create client với token explicit để đảm bảo PostgREST nhận JWT
  sb = makeClient(auth.session.access_token);

  // 2. Workspace
  const { data: ws, error: wsErr } = await sb
    .from('workspace_members')
    .select('workspace_id, role, workspaces(name, slug)')
    .eq('user_id', auth.user.id);
  if (wsErr) { console.error('❌ List workspaces failed:', wsErr.message); process.exit(1); }

  let workspaceId, role;
  if (!ws || ws.length === 0) {
    console.log('Bạn chưa có workspace nào. Tạo demo workspace...');
    const { data: newId, error: cErr } = await sb.rpc('create_workspace', {
      p_name: 'Dev Workspace',
      p_slug: `dev-${Date.now()}`,
    });
    if (cErr) { console.error('❌ Create workspace:', cErr.message); process.exit(1); }
    workspaceId = newId;
    role = 'owner';
  } else {
    ws.forEach((w, i) => console.log(`  ${i + 1}. ${w.workspaces?.name} (${w.role})`));
    const idx = parseInt(await rl.question('Chọn workspace # (default 1): ') || '1', 10) - 1;
    workspaceId = ws[idx].workspace_id;
    role = ws[idx].role;
  }
  console.log('✓ Workspace:', workspaceId, '—', role);

  // 3. Migrations — chỉ list, áp tay (cần service_role; chuyển sang Admin Portal sau)
  const migDir = join(root, 'migrations');
  if (existsSync(migDir)) {
    const files = readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort();
    if (files.length) {
      console.log('\nMigrations tìm thấy (apply qua Admin Portal Reviewer):');
      files.forEach((f) => console.log('  -', f));
    }
  }

  // 4. Ghi .env
  const lines = existsSync(envPath) ? readFileSync(envPath, 'utf8').split('\n') : [];
  const merge = { ...Object.fromEntries(
    lines.filter(Boolean).filter((l) => !l.startsWith('#')).map((l) => l.split('=', 2))
  ),
    VITE_DEV_TOKEN: auth.session.access_token,
    VITE_DEV_WORKSPACE_ID: workspaceId,
    VITE_DEV_USER_ID: auth.user.id,
    VITE_DEV_ROLE: role,
  };
  // Giữ comment + key chưa đụng tới
  const out = [];
  const seen = new Set();
  for (const line of lines) {
    if (!line || line.startsWith('#')) { out.push(line); continue; }
    const k = line.split('=', 1)[0];
    if (k in merge) { out.push(`${k}=${merge[k]}`); seen.add(k); }
    else out.push(line);
  }
  for (const k of Object.keys(merge)) {
    if (!seen.has(k)) out.push(`${k}=${merge[k]}`);
  }
  writeFileSync(envPath, out.join('\n'));
  console.log('\n✓ Đã ghi VITE_DEV_* vào .env');
  console.log('\nXong! Chạy `npm run dev` để start.\n');
  rl.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
