#!/usr/bin/env node
/**
 * Insert sample data vào schema app_{slug} bằng JWT của user đang dev.
 * Đổi nội dung phù hợp với mini-app của bạn.
 */
import './_node-shim.js';
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const URL = process.env.VITE_SUPABASE_URL;
const ANON = process.env.VITE_SUPABASE_ANON_KEY;
const TOKEN = process.env.VITE_DEV_TOKEN;
const WS = process.env.VITE_DEV_WORKSPACE_ID;
const UID = process.env.VITE_DEV_USER_ID;
const SLUG = process.env.VITE_APP_SLUG || 'demo';

if (!URL || !ANON || !TOKEN || !WS || !UID) {
  console.error('Thiếu env. Chạy `npm run dev:setup` trước.');
  process.exit(1);
}

const sb = createClient(URL, ANON, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { Authorization: `Bearer ${TOKEN}` } },
  db: { schema: `app_${SLUG}` },
});

const samples = [
  { title: 'Đọc CLAUDE.md', done: true,  workspace_id: WS, created_by: UID },
  { title: 'Chạy npm run dev', done: false, workspace_id: WS, created_by: UID },
  { title: 'Build mini-app đầu tiên', done: false, workspace_id: WS, created_by: UID },
];

const { data, error } = await sb.from('tasks').insert(samples).select();
if (error) { console.error('❌', error.message); process.exit(1); }
console.log(`✓ Inserted ${data.length} sample tasks vào app_${SLUG}.tasks`);
