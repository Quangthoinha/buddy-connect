// JS Bridge: Mini-app ↔ Shell native.
// Khi không có Shell (DEV trong browser), tự động dùng mock.
//
// Sử dụng:
//   const loc = await callNative('GET_LOCATION');
//   const photo = await callNative('OPEN_CAMERA', { quality: 0.8 });

import { isInShell } from './context.js';

const TIMEOUT_MS = 10_000;
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

export function callNative(type, payload = {}) {
  if (!isInShell()) return mock(type, payload);

  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Bridge timeout: ${type}`));
    }, TIMEOUT_MS);
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
    default:
      throw new Error(`Bridge mock chưa hỗ trợ type: ${type}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
