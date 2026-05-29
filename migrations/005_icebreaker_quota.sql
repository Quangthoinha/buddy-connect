-- Migration 005: Thêm quota cho icebreaker API
CREATE TABLE IF NOT EXISTS app_buddy_connect.icebreaker_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  used_count INT DEFAULT 0,
  max_count INT DEFAULT 10,
  last_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, workspace_id)
);
