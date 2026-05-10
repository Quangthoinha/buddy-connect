// Supabase Realtime (Postgres Changes + Broadcast).
//
// subscribeToTable('tasks', workspaceId, (payload) => { ... })
//   → trả về hàm unsubscribe. NHỚ gọi khi unmount component.
//
// subscribeBroadcast('job_completed', workspaceId, handler)
//   → cho queue/job pattern.

import { getSupabase } from './supabase.js';
import config from '../../mushy.config.json';

const slug = config.slug;
const env = import.meta.env.VITE_APP_ENV || 'prod';
const schema = env === 'dev' ? `app_${slug}_dev` : `app_${slug}`;

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
