import React, { useEffect, useState } from 'react';
import { getContext, isInShell } from './lib/context.js';
import { callNative } from './lib/bridge.js';

const styles = {
  page: { fontFamily: 'system-ui, -apple-system, sans-serif', maxWidth: 720, margin: '0 auto', padding: 16, lineHeight: 1.5 },
  h1: { fontSize: 22, marginBottom: 4 },
  sub: { color: '#666', marginTop: 0 },
  card: { border: '1px solid #e5e5e5', borderRadius: 8, padding: 12, marginTop: 16, background: '#fafafa' },
  pre: { background: '#0e1116', color: '#e6edf3', padding: 12, borderRadius: 6, fontSize: 12, overflowX: 'auto' },
  row: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  btn: { padding: '8px 12px', border: '1px solid #ccc', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 14 },
  badge: (ok) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 12, background: ok ? '#dcfce7' : '#fef3c7', color: ok ? '#166534' : '#92400e' }),
};

export default function App() {
  const [ctx, setCtx] = useState(null);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    try { setCtx(getContext()); } catch (e) { setError(e.message); }
  }, []);

  const log = (label, data) =>
    setLogs((l) => [{ t: new Date().toLocaleTimeString(), label, data }, ...l].slice(0, 10));

  const test = (type, payload) => async () => {
    try { log(type, await callNative(type, payload)); }
    catch (e) { log(type + ' [error]', e.message); }
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>Mini-app Template</h1>
      <p style={styles.sub}>
        Hello world + bridge test page.{' '}
        <span style={styles.badge(isInShell())}>{isInShell() ? 'In Shell' : 'Browser (mock)'}</span>
      </p>

      <div style={styles.card}>
        <strong>App Context</strong>
        {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
        {ctx && <pre style={styles.pre}>{JSON.stringify(ctx, null, 2)}</pre>}
      </div>

      <div style={styles.card}>
        <strong>Bridge tests</strong>
        <div style={styles.row}>
          <button style={styles.btn} onClick={test('GET_LOCATION')}>GET_LOCATION</button>
          <button style={styles.btn} onClick={test('OPEN_CAMERA', { quality: 0.8 })}>OPEN_CAMERA</button>
          <button style={styles.btn} onClick={test('PICK_FILE')}>PICK_FILE</button>
          <button style={styles.btn} onClick={test('PUSH_NOTIFICATION', { title: 'Hi', body: 'từ mini-app' })}>PUSH_NOTIFICATION</button>
        </div>
      </div>

      <div style={styles.card}>
        <strong>Logs</strong>
        {logs.length === 0 && <p style={{ color: '#888' }}>Chưa có log nào.</p>}
        {logs.map((l, i) => (
          <div key={i} style={{ marginTop: 6 }}>
            <code style={{ color: '#666' }}>{l.t}</code> <strong>{l.label}</strong>
            <pre style={styles.pre}>{typeof l.data === 'string' ? l.data : JSON.stringify(l.data, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
