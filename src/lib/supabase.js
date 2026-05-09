// Supabase client cho mini-app.
// - Token lấy từ APP_CONTEXT (do Shell inject hoặc VITE_DEV_TOKEN).
// - Schema: app_{slug} — không bao giờ dùng `public`.
// - Truy cập table:  db.from('tasks')   (đã scope sẵn schema)

import { createClient } from '@supabase/supabase-js';
import { getContext } from './context.js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const slug = import.meta.env.VITE_APP_SLUG || 'demo';
const schema = `app_${slug}`;

if (!url || !anonKey) {
  console.warn('[supabase] thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY trong .env');
}

let _client = null;

export function getSupabase() {
  if (_client) return _client;
  const ctx = getContext();
  _client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: ctx.token ? { Authorization: `Bearer ${ctx.token}` } : {},
    },
    db: { schema },
  });
  return _client;
}

// Shortcut: db.from('tasks').select(...)
export const db = new Proxy({}, {
  get(_, prop) {
    const c = getSupabase();
    return typeof c[prop] === 'function' ? c[prop].bind(c) : c[prop];
  },
});
