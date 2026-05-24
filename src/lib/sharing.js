// Cross-workspace data sharing — client API + active scope state.
//
// Model (superapp mig 049 / project_cross_ws_sharing memory):
// - Workspace owner A gen mã 6 ký tự → ws follower B redeem → row được tạo
//   trong public.app_share_grants. Sau đó member của B có thể đọc + ghi
//   trực tiếp vào data có workspace_id = A.id (RLS qua public.can_access_app_data).
// - Multi-target: A có thể grant cho nhiều ws (B, C, D...). Re-share KHÔNG cho
//   phép (chỉ A grant). Follower KHÔNG delete được data của A.
// - "Active scope" = workspace user đang thao tác. Có thể là ws họ là member
//   trực tiếp, hoặc ws khác được share tới ws của họ. Mọi query/insert dùng
//   activeScope.workspaceId thay vì ctx.workspaceId.
//
// Use:
//   import { listAccessibleScopes, useActiveScope, generateShareCode,
//            redeemShareCode, listShareGrants, revokeShareGrant } from './sharing.js';
//
//   const scope = useActiveScope();           // React hook
//   db.from('tasks').select().eq('workspace_id', scope.workspaceId);

import { getPublicSupabase } from './supabase.js';
import { getContext } from './context.js';
import config from '../../mushy.config.json';
import { useEffect, useState, useSyncExternalStore } from 'react';

const APP_SLUG = config.slug;
const STORAGE_KEY_PREFIX = 'mushy.activeScope.';

// ╔════════════════════════════════════════════════════════════════╗
// ║ Server-side RPC wrappers                                       ║
// ╚════════════════════════════════════════════════════════════════╝

/**
 * Liệt kê mọi workspace user có thể "switch" vào trong mini-app này.
 *   - scopeKind='owner_member': ws user là member trực tiếp (data riêng)
 *   - scopeKind='follower':     ws X share data cho 1 ws của user
 *
 * @returns {Promise<Array<{
 *   workspaceId: string, workspaceName: string, workspaceSlug: string,
 *   scopeKind: 'owner_member'|'follower',
 *   viaFollowerWorkspaceId?: string, viaFollowerWorkspaceName?: string
 * }>>}
 */
export async function listAccessibleScopes() {
  const client = getPublicSupabase();
  const { data, error } = await client.rpc('list_accessible_workspaces', {
    p_app_slug: APP_SLUG,
  });
  if (error) throw new Error('listAccessibleScopes: ' + error.message);
  return (data || []).map((r) => ({
    workspaceId: r.workspace_id,
    workspaceName: r.workspace_name,
    workspaceSlug: r.workspace_slug,
    scopeKind: r.scope_kind,
    viaFollowerWorkspaceId: r.via_follower_workspace_id || undefined,
    viaFollowerWorkspaceName: r.via_follower_workspace_name || undefined,
  }));
}

/**
 * Gen mã share cho 1 ws owner. Caller phải là owner/admin của ws đó.
 * Mã 6 ký tự A-Z/2-9 (bỏ I/O/0/1), unique trong các mã chưa used.
 *
 * @param {{ ownerWorkspaceId?: string, expiresHours?: number }} [opts]
 *   ownerWorkspaceId default = ctx.workspaceId. expiresHours default = 24,
 *   0 = không hết hạn.
 * @returns {Promise<{ id: string, code: string, expiresAt: string|null }>}
 */
export async function generateShareCode({ ownerWorkspaceId, expiresHours = 24 } = {}) {
  const ctx = getContext();
  const wsId = ownerWorkspaceId || ctx.workspaceId;
  const client = getPublicSupabase();
  const { data, error } = await client.rpc('generate_app_share_code', {
    p_app_slug: APP_SLUG,
    p_owner_workspace_id: wsId,
    p_expires_hours: expiresHours,
  });
  if (error) throw new Error('generateShareCode: ' + error.message);
  return {
    id: data.id,
    code: data.code,
    expiresAt: data.expires_at,
    ownerWorkspaceId: data.owner_workspace_id,
  };
}

/**
 * Redeem mã share — tạo grant cho follower ws. Caller phải là owner/admin
 * của followerWorkspaceId. Trả grant info.
 *
 * @param {{ code: string, followerWorkspaceId?: string }} args
 *   followerWorkspaceId default = ctx.workspaceId.
 * @returns {Promise<{ id: string, ownerWorkspaceId: string, followerWorkspaceId: string }>}
 */
export async function redeemShareCode({ code, followerWorkspaceId } = {}) {
  if (!code) throw new Error('redeemShareCode: code required');
  const ctx = getContext();
  const wsId = followerWorkspaceId || ctx.workspaceId;
  const client = getPublicSupabase();
  const { data, error } = await client.rpc('redeem_app_share_code', {
    p_code: code.trim().toUpperCase(),
    p_follower_workspace_id: wsId,
  });
  if (error) throw new Error('redeemShareCode: ' + error.message);
  return {
    id: data.id,
    ownerWorkspaceId: data.owner_workspace_id,
    followerWorkspaceId: data.follower_workspace_id,
    grantedAt: data.granted_at,
  };
}

/**
 * Liệt kê grants liên quan tới 1 ws ở app này (cả phía owner + follower).
 *
 * @param {{ workspaceId?: string }} [opts] — default ctx.workspaceId
 * @returns {Promise<Array<{
 *   grantId: string, direction: 'as_owner'|'as_follower',
 *   ownerWorkspaceId: string, ownerWorkspaceName: string,
 *   followerWorkspaceId: string, followerWorkspaceName: string,
 *   grantedBy: string, grantedAt: string
 * }>>}
 */
export async function listShareGrants({ workspaceId } = {}) {
  const ctx = getContext();
  const wsId = workspaceId || ctx.workspaceId;
  const client = getPublicSupabase();
  const { data, error } = await client.rpc('list_app_share_grants', {
    p_app_slug: APP_SLUG,
    p_workspace_id: wsId,
  });
  if (error) throw new Error('listShareGrants: ' + error.message);
  return (data || []).map((r) => ({
    grantId: r.grant_id,
    direction: r.direction,
    ownerWorkspaceId: r.owner_workspace_id,
    ownerWorkspaceName: r.owner_workspace_name,
    followerWorkspaceId: r.follower_workspace_id,
    followerWorkspaceName: r.follower_workspace_name,
    grantedBy: r.granted_by,
    grantedAt: r.granted_at,
  }));
}

/**
 * Revoke 1 grant. Cho phép owner/admin của 1 trong 2 phía (owner ws hoặc
 * follower ws). Follower mất quyền truy cập tức thì.
 *
 * @param {string} grantId
 */
export async function revokeShareGrant(grantId) {
  if (!grantId) throw new Error('revokeShareGrant: grantId required');
  const client = getPublicSupabase();
  const { data, error } = await client.rpc('revoke_app_share', { p_grant_id: grantId });
  if (error) throw new Error('revokeShareGrant: ' + error.message);
  return data === true;
}

// ╔════════════════════════════════════════════════════════════════╗
// ║ Active scope — state management (localStorage per app)         ║
// ╚════════════════════════════════════════════════════════════════╝
//
// Persistance key: mushy.activeScope.{appSlug}.{userId}
// Value: { workspaceId, scopeKind, label } (label cached cho UX, server vẫn là source of truth)
//
// Default scope = ctx.workspaceId (ws user đang ở trong superapp shell).
// Khi user switch qua scope khác qua ScopeSwitcher, lưu lại để giữ across reload.

function storageKey() {
  const ctx = getContext();
  return STORAGE_KEY_PREFIX + APP_SLUG + '.' + (ctx.userId || 'anon');
}

function readStored() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(storageKey()) : null;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStored(scope) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (scope == null) localStorage.removeItem(storageKey());
    else localStorage.setItem(storageKey(), JSON.stringify(scope));
  } catch { /* quota / private mode */ }
}

// Subscriber pattern cho useSyncExternalStore — đảm bảo mọi component dùng
// useActiveScope() re-render khi scope đổi.
const listeners = new Set();
function emitChange() { listeners.forEach((l) => l()); }
function subscribe(l) { listeners.add(l); return () => listeners.delete(l); }

let _cached = null; // { workspaceId, scopeKind, label }
function ensureCached() {
  if (_cached) return _cached;
  const stored = readStored();
  if (stored && stored.workspaceId) {
    _cached = stored;
    return _cached;
  }
  // Default: ctx.workspaceId (owner_member của chính user)
  const ctx = getContext();
  _cached = {
    workspaceId: ctx.workspaceId,
    scopeKind: 'owner_member',
    label: ctx.workspaceSlug || 'Riêng tôi',
  };
  return _cached;
}

/**
 * Đọc active scope hiện tại (không reactive). Dùng ngoài React component.
 * @returns {{ workspaceId: string, scopeKind: string, label: string }}
 */
export function getActiveScope() {
  return ensureCached();
}

/**
 * Set active scope. Persist + emit change.
 * @param {{ workspaceId: string, scopeKind: string, label: string }} scope
 */
export function setActiveScope(scope) {
  if (!scope || !scope.workspaceId) throw new Error('setActiveScope: workspaceId required');
  _cached = { ...scope };
  writeStored(_cached);
  emitChange();
}

/**
 * Reset về ctx.workspaceId (ws default trong superapp shell).
 */
export function resetActiveScope() {
  _cached = null;
  writeStored(null);
  emitChange();
}

/**
 * React hook: subscribe vào active scope. Re-render khi scope đổi.
 * @returns {{ workspaceId: string, scopeKind: string, label: string }}
 */
export function useActiveScope() {
  return useSyncExternalStore(subscribe, ensureCached, ensureCached);
}

/**
 * React hook: fetch + cache danh sách scopes available.
 * Refetch khi gọi refresh().
 *
 * @returns {{ scopes: Array, loading: boolean, error: Error|null, refresh: () => void }}
 */
export function useAccessibleScopes() {
  const [scopes, setScopes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listAccessibleScopes()
      .then((data) => { if (!cancelled) { setScopes(data); setError(null); } })
      .catch((e) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [version]);
  return {
    scopes, loading, error,
    refresh: () => setVersion((v) => v + 1),
  };
}
