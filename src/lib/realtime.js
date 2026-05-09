// Supabase Realtime (Postgres Changes + Broadcast).
//
// subscribeToTable('tasks', workspaceId, (payload) => { ... })
//   → trả về hàm unsubscribe. NHỚ gọi khi unmount component.
//
// subscribeBroadcast('job_completed', workspaceId, handler)
//   → cho queue/job pattern.

import { getSupabase } from './supabase.js';

const slug = import.meta.env.VITE_APP_SLUG || 'demo';
const schema = `app_${slug}`;

export function subscribeToTable(table, workspaceId, callback) {
  const channel = getSupabase()
    .channel(`db:${schema}.${table}:${workspaceId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema,
        table,
        filter: `workspace_id=eq.${workspaceId}`,
      },
      callback
    )
    .subscribe();

  return () => getSupabase().removeChannel(channel);
}

export function subscribeBroadcast(event, workspaceId, callback) {
  const channel = getSupabase()
    .channel(`bc:${schema}:${workspaceId}`)
    .on('broadcast', { event }, ({ payload }) => callback(payload))
    .subscribe();

  return () => getSupabase().removeChannel(channel);
}
