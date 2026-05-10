// JS Bridge: Mini-app ↔ Shell native.
// Khi không có Shell (DEV trong browser), tự động dùng mock.
//
// Sử dụng:
//   const loc = await callNative('GET_LOCATION');
//   const photo = await callNative('OPEN_CAMERA', { quality: 0.8 });

import { isInShell } from './context.js';

// Timeout mặc định: 10s cho op nhanh, 5 phút cho op tương tác (camera, file picker)
// vì user có thể loay hoay tay rất lâu. Override qua opts.timeout nếu cần.
const DEFAULT_TIMEOUT_MS = 10_000;
const INTERACTIVE_TIMEOUT_MS = 5 * 60_000;
const INTERACTIVE_TYPES = new Set(['OPEN_CAMERA', 'PICK_FILE']);
const pending = new Map();
let nextId = 1;

// Shell sẽ gọi `window.__bridgeResolve(id, result, error)` khi xong
if (typeof window !== 'undefined') {
  window.__bridgeResolve = (id, result, error) => {
    const p = pending.get(id);
    if (!p) return;
    pending.delete(id);
    clearTimeout(p.timer);
    error ? p.reject(new Error(error)) : p.resolve(result);
  };
}

export function callNative(type, payload = {}, opts = {}) {
  if (!isInShell()) return mock(type, payload);

  const timeoutMs =
    opts.timeout ?? (INTERACTIVE_TYPES.has(type) ? INTERACTIVE_TIMEOUT_MS : DEFAULT_TIMEOUT_MS);

  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Bridge timeout: ${type}`));
    }, timeoutMs);
    pending.set(id, { resolve, reject, timer });
    window.ReactNativeWebView.postMessage(JSON.stringify({ id, type, payload }));
  });
}

// ---------- Mocks (DEV only) ----------
async function mock(type, payload) {
  console.log('[bridge:mock]', type, payload);
  await sleep(200);
  switch (type) {
    case 'GET_LOCATION':
      return { lat: 10.7769, lng: 106.7009, accuracy: 12 };
    case 'OPEN_CAMERA':
      return { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=', width: 1, height: 1 };
    case 'PICK_FILE':
      return { name: 'mock.txt', size: 12, mimeType: 'text/plain', uri: 'mock://file' };
    case 'PUSH_NOTIFICATION':
      console.log('[mock push]', payload.title, '—', payload.body);
      return { scheduled: true };
    case 'REFRESH_TOKEN':
      // Mock không thật được — chỉ trả error, dev local browser dùng VITE_DEV_TOKEN
      // refresh qua npm run dev:token thay vì bridge.
      throw new Error('REFRESH_TOKEN bridge chỉ chạy trong Shell. Dev local: npm run dev:token.');
    default:
      throw new Error(`Bridge mock chưa hỗ trợ type: ${type}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
