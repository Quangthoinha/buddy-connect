// Supabase client cho mini-app.
// - Token lấy từ APP_CONTEXT (do Shell inject hoặc VITE_DEV_TOKEN).
// - Schema chọn theo VITE_APP_ENV:
//     prod (default) → app_{slug}        — production deploy
//     dev            → app_{slug}_dev    — preview deploy (Vercel Preview scope)
//   Cùng 1 Supabase project, chỉ tách dữ liệu qua schema. Pattern Zalo-style.
// - 2 client / proxy:
//     `db`        → scoped vào schema mini-app (theo env)
//     `dbPublic`  → scoped vào `public` (cho workspaces, mini_apps, workspace_apps...)
//                   Hiếm khi cần — chỉ dùng nếu app cần đọc/ghi catalog hoặc
//                   workspace metadata (vd: Admin Portal).

import { createClient } from '@supabase/supabase-js';
import { getContext } from './context.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const slug = import.meta.env.VITE_APP_SLUG || 'demo';
const env = import.meta.env.VITE_APP_ENV || 'prod';   // 'prod' | 'dev'. Default prod cho safety.
const schema = env === 'dev' ? `app_${slug}_dev` : `app_${slug}`;

if (!url || !anonKey) {
  console.warn('[supabase] thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong .env');
}

function makeClient(schemaName) {
  const ctx = getContext();
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: ctx.token ? { Authorization: `Bearer ${ctx.token}` } : {},
    },
    db: { schema: schemaName },
  });
}

let _appClient = null;
export function getSupabase() {
  if (!_appClient) _appClient = makeClient(schema);
  return _appClient;
}

let _publicClient = null;
export function getPublicSupabase() {
  if (!_publicClient) _publicClient = makeClient('public');
  return _publicClient;
}

// Shortcut: db.from('tasks').select(...)  → app_{slug}.tasks
export const db = new Proxy({}, {
  get(_, prop) {
    const c = getSupabase();
    return typeof c[prop] === 'function' ? c[prop].bind(c) : c[prop];
  },
});

// Shortcut: dbPublic.from('mini_apps').select(...)  → public.mini_apps
export const dbPublic = new Proxy({}, {
  get(_, prop) {
    const c = getPublicSupabase();
    return typeof c[prop] === 'function' ? c[prop].bind(c) : c[prop];
  },
});
