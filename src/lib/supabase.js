// Supabase client cho mini-app.
// - URL + anon key đọc từ mushy.config.json (committed, public — đã design vậy).
// - Slug đọc từ mushy.config.json (đặt khi clone template).
// - Token lấy từ APP_CONTEXT (do Shell inject hoặc VITE_DEV_TOKEN).
// - Schema chọn theo VITE_APP_ENV (Vercel Production scope = 'prod', Preview = 'dev'):
//     prod (default) → app_{slug}        — production deploy
//     dev            → app_{slug}_dev    — preview deploy
//   Cùng 1 Supabase project, chỉ tách dữ liệu qua schema. Pattern Zalo-style.
// - 2 client / proxy:
//     `db`        → scoped vào schema mini-app (theo env)
//     `dbPublic`  → scoped vào `public` (cho workspaces, mini_apps, workspace_apps...)
//                   Hiếm khi cần — chỉ dùng nếu app cần đọc/ghi catalog hoặc
//                   workspace metadata (vd: Admin Portal).

import { createClient } from '@supabase/supabase-js';
import { getContext } from './context.js';
import config from '../../mushy.config.json';

const url = config.supabase.url;
const anonKey = config.supabase.anonKey;
const slug = config.slug;
const env = import.meta.env.VITE_APP_ENV || 'prod';   // 'prod' | 'dev'. Default prod cho safety.
const schema = env === 'dev' ? `app_${slug}_dev` : `app_${slug}`;

if (!url || !anonKey) {
  console.warn('[supabase] thiếu supabase.url hoặc supabase.anonKey trong mushy.config.json');
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
