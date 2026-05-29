import { createClient } from '@supabase/supabase-js';
import { verifyRequest } from './_verify.js';
import config from '../mushy.config.json' with { type: 'json' };

const SUPABASE_URL = config.supabase.url;
const ANON_KEY = config.supabase.anonKey;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ctx = await verifyRequest(req);
  if (!ctx) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { userId, workspaceId } = req.body;
    if (!userId || !workspaceId) {
      return res.status(400).json({ error: 'Missing userId or workspaceId' });
    }

    const client = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${ctx.token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Fetch current user profile
    const { data: currentUser, error: meErr } = await client
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('workspace_id', workspaceId)
      .single();

    if (meErr || !currentUser) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // 2. Fetch all other profiles in workspace
    const { data: others, error: othersErr } = await client
      .from('user_profiles')
      .select('*')
      .eq('workspace_id', workspaceId)
      .neq('user_id', userId);

    if (othersErr) {
      return res.status(500).json({ error: 'Failed to fetch profiles' });
    }

    // 3. Server-side ranking with 6 dimensions
    const matches = others.map(other => {
      let score = 0;
      const reasons = [];

      // D1: tags (Chung sở thích/đặc điểm chung)
      const myTags = currentUser.tags || [];
      const theirTags = other.tags || [];
      const commonTags = myTags.filter(t => theirTags.includes(t));
      if (commonTags.length > 0) {
        score += commonTags.length * 5;
        reasons.push(`Chung ${commonTags.length} điểm quan tâm`);
      }

      // D2: parent_group (Trùng bộ phận lớn/khối)
      if (currentUser.parent_group && currentUser.parent_group === other.parent_group) {
        score += 15;
        reasons.push('Cùng khối bộ phận');
      }

      // D3: facility (Cùng tòa nhà/địa điểm làm việc)
      if (currentUser.facility && currentUser.facility === other.facility) {
        score += 15;
        reasons.push('Cùng địa điểm làm việc');
      }

      // D4: skills (Kỹ năng chuyên môn)
      const mySkills = currentUser.skills || [];
      const theirSkills = other.skills || [];
      const commonSkills = mySkills.filter(s => theirSkills.includes(s));
      if (commonSkills.length > 0) {
        score += commonSkills.length * 10;
        reasons.push(`Chung ${commonSkills.length} kỹ năng`);
      }

      // D5: career_goals (Mục tiêu nghề nghiệp)
      const myGoals = currentUser.career_goals || [];
      const theirGoals = other.career_goals || [];
      const commonGoals = myGoals.filter(g => theirGoals.includes(g));
      if (commonGoals.length > 0) {
        score += commonGoals.length * 10;
        reasons.push(`Chung ${commonGoals.length} mục tiêu`);
      }

      // D6: department (Phòng ban trực tiếp)
      if (currentUser.department && currentUser.department === other.department) {
        score += 10;
        reasons.push('Cùng phòng ban');
      }

      return {
        ...other,
        score: Math.min(score, 100),
        match_reasons: reasons
      };
    });

    matches.sort((a, b) => b.score - a.score);

    return res.status(200).json(matches);
  } catch (err) {
    console.error('Match API Error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
