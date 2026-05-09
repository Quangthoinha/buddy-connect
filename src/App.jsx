import React, { useEffect, useMemo, useState } from 'react';
import { getContext, isInShell } from './lib/context.js';
import { callNative } from './lib/bridge.js';
import './App.css';

// Định nghĩa 4 nút bridge — icon emoji là OK ở đây (nội dung minh hoạ),
// production app nên dùng SVG icon set thống nhất.
const BRIDGE_TESTS = [
  { type: 'GET_LOCATION',     label: 'Vị trí',       icon: '📍' },
  { type: 'OPEN_CAMERA',      label: 'Camera',       icon: '📷', payload: { quality: 0.8 } },
  { type: 'PICK_FILE',        label: 'Chọn file',    icon: '📎' },
  { type: 'PUSH_NOTIFICATION', label: 'Thông báo',   icon: '🔔', payload: { title: 'Mushy', body: 'Xin chào từ mini-app 🍄' } },
];

export default function App() {
  const [ctx, setCtx] = useState(null);
  const [ctxError, setCtxError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [pending, setPending] = useState(null);

  useEffect(() => {
    try { setCtx(getContext()); }
    catch (e) { setCtxError(e.message); }
  }, []);

  const inShell = useMemo(() => isInShell(), []);

  const log = (label, data, ok = true) =>
    setLogs((l) => [{ t: nowHHmmss(), label, data, ok }, ...l].slice(0, 20));

  const test = (type, payload) => async () => {
    if (pending) return;
    setPending(type);
    try {
      const data = await callNative(type, payload);
      log(type, data, true);
    } catch (e) {
      log(type, e.message || String(e), false);
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="page">
      <header className="hero">
        <img src="/mushy.png" alt="Mushy mascot" className="hero-mascot" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 className="hero-title">Mushy Demo</h1>
          <p className="hero-sub">Trang thử nghiệm bridge & ngữ cảnh</p>
        </div>
        <span className={`status ${inShell ? 'ok' : 'mock'}`}>
          <span className="status-dot" />
          {inShell ? 'Trong Shell' : 'Trình duyệt (mock)'}
        </span>
      </header>

      <section className="card">
        <h2 className="card-title">🧪 Thử nghiệm Bridge</h2>
        <p className="card-sub">
          Bấm để gọi native API qua <code>callNative</code>. Trong Shell sẽ chạy thật, ngoài browser dùng mock.
        </p>
        <div className="btn-grid">
          {BRIDGE_TESTS.map((b) => (
            <button
              key={b.type}
              className="btn-tile"
              disabled={!!pending}
              onClick={test(b.type, b.payload)}
            >
              {pending === b.type ? (
                <span className="btn-tile-spinner" />
              ) : (
                <span className="btn-tile-icon">{b.icon}</span>
              )}
              <span>{b.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="card-title">📋 Nhật ký</h2>
        {logs.length === 0 ? (
          <p className="log-empty">Chưa có log. Bấm thử 1 nút ở trên nhé!</p>
        ) : (
          <div>
            {logs.map((l, i) => (
              <div key={i} className="log-item">
                <span className="log-time">{l.t}</span>
                <div className="log-body">
                  <div className={`log-label ${l.ok ? 'ok' : 'err'}`}>
                    <span className="dot" />
                    {l.label} {l.ok ? '· OK' : '· Lỗi'}
                  </div>
                  <pre className="log-data">
                    {typeof l.data === 'string' ? l.data : JSON.stringify(l.data, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">🔑 Ngữ cảnh ứng dụng</h2>
        {ctxError && <p className="log-empty" style={{ color: 'var(--danger)' }}>{ctxError}</p>}
        {ctx && <pre className="code">{JSON.stringify(ctx, null, 2)}</pre>}
      </section>

      <footer className="footer">
        Mushy mini-app demo · Made with <span className="heart">♥</span>
      </footer>
    </div>
  );
}

function nowHHmmss() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
