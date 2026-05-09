// File storage abstraction.
// DEV: Supabase Storage (bucket per workspace).
// PROD: Cloudflare R2 (private) — qua Edge Function presigned URL.
//
// Mini-app KHÔNG nên biết đang dùng cái nào. Lưu `object_key` vào DB,
// không bao giờ lưu URL trực tiếp (URL có thời hạn).

import { getContext } from './context.js';
import { getSupabase } from './supabase.js';

const isDev = import.meta.env.DEV;
const slug = import.meta.env.VITE_APP_SLUG || 'demo';
const BUCKET = 'miniapp-dev';

const urlCache = new Map(); // objectKey → { url, expiresAt }

export async function upload(file, folder = 'uploads') {
  const ctx = getContext();
  const ext = (file.name || 'bin').split('.').pop();
  const objectKey = `${ctx.workspaceId}/app_${slug}/${folder}/${cryptoUuid()}.${ext}`;

  if (isDev) {
    const { error } = await getSupabase().storage.from(BUCKET).upload(objectKey, file);
    if (error) throw error;
    return objectKey;
  }
  // PROD: gọi Edge Function `storage-upload` để lấy presigned PUT URL
  const sb = getSupabase();
  const { data, error } = await sb.functions.invoke('storage-upload', {
    body: { objectKey, contentType: file.type },
  });
  if (error) throw error;
  const putRes = await fetch(data.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!putRes.ok) throw new Error(`R2 upload failed: ${putRes.status}`);
  return objectKey;
}

export async function getViewUrl(objectKey) {
  const cached = urlCache.get(objectKey);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  let url;
  if (isDev) {
    const { data, error } = await getSupabase()
      .storage.from(BUCKET)
      .createSignedUrl(objectKey, 3600);
    if (error) throw error;
    url = data.signedUrl;
  } else {
    const { data, error } = await getSupabase().functions.invoke('storage-view', {
      body: { objectKey },
    });
    if (error) throw error;
    url = data.url;
  }
  urlCache.set(objectKey, { url, expiresAt: Date.now() + 3500 * 1000 });
  return url;
}

function cryptoUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
