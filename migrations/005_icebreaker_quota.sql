-- Migration 005: Thêm quota cho icebreaker API
CREATE TABLE IF NOT EXISTS app_buddy_connect.icebreaker_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  used_count INT DEFAULT 0,
  max_count INT DEFAULT 10,
  last_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, workspace_id)
);

-- Grant privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON app_buddy_connect.icebreaker_quotas TO authenticated;

-- Enable RLS
ALTER TABLE app_buddy_connect.icebreaker_quotas ENABLE ROW LEVEL SECURITY;

-- Setup Workspace Isolation policies
DROP POLICY IF EXISTS "quotas_select" ON app_buddy_connect.icebreaker_quotas;
CREATE POLICY "quotas_select" ON app_buddy_connect.icebreaker_quotas FOR SELECT USING (
  public.can_access_app_data(workspace_id, 'buddy-connect')
);

DROP POLICY IF EXISTS "quotas_insert" ON app_buddy_connect.icebreaker_quotas;
CREATE POLICY "quotas_insert" ON app_buddy_connect.icebreaker_quotas FOR INSERT WITH CHECK (
  public.can_access_app_data(workspace_id, 'buddy-connect')
);

DROP POLICY IF EXISTS "quotas_update" ON app_buddy_connect.icebreaker_quotas;
CREATE POLICY "quotas_update" ON app_buddy_connect.icebreaker_quotas FOR UPDATE USING (
  public.can_access_app_data(workspace_id, 'buddy-connect')
) WITH CHECK (
  public.can_access_app_data(workspace_id, 'buddy-connect')
);

DROP POLICY IF EXISTS "quotas_delete" ON app_buddy_connect.icebreaker_quotas;
CREATE POLICY "quotas_delete" ON app_buddy_connect.icebreaker_quotas FOR DELETE USING (
  public.is_owner_workspace_member(workspace_id)
);
