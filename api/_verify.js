// Helper dùng chung cho các Vercel Function:
// verify JWT từ Authorization header, trả về { userId, workspaceId, role }.
//
// Dùng:
//   import { verifyRequest } from './_verify.js';
//   export default async function handler(req, res) {
//     const ctx = await verifyRequest(req);
//     if (!ctx) return res.status(401).json({ error: 'unauthorized' });
//     ...
//   }

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function verifyRequest(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const workspaceId = req.headers['x-workspace-id'];
  if (!token || !workspaceId) return null;
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    throw new Error('SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY chưa set ở Vercel env');
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;

  const { data: member } = await admin
    .from('workspace_members')
    .select('role')
    .eq('user_id', data.user.id)
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  if (!member) return null;

  return { userId: data.user.id, workspaceId, role: member.role };
}
