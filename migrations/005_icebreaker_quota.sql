-- Migration 005: Thêm quota cho icebreaker API

-- @realtime
create table if not exists app_buddy_connect.icebreaker_quotas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  workspace_id uuid not null,
  used_count int default 0,
  max_count int default 10,
  last_reset timestamptz default now(),
  unique (user_id, workspace_id)
);

-- Index bắt buộc trên cột workspace_id để tối ưu hóa truy vấn cô lập dữ liệu
create index if not exists idx_icebreaker_quotas_workspace on app_buddy_connect.icebreaker_quotas (workspace_id);

-- Grant privileges
grant select, insert, update, delete on app_buddy_connect.icebreaker_quotas to authenticated;

-- Enable RLS
alter table app_buddy_connect.icebreaker_quotas enable row level security;

-- Setup Workspace Isolation policies
drop policy if exists "quotas_select" on app_buddy_connect.icebreaker_quotas;
create policy "quotas_select" on app_buddy_connect.icebreaker_quotas for select using (
  public.can_access_app_data(workspace_id, 'buddy-connect')
);

drop policy if exists "quotas_insert" on app_buddy_connect.icebreaker_quotas;
create policy "quotas_insert" on app_buddy_connect.icebreaker_quotas for insert with check (
  public.can_access_app_data(workspace_id, 'buddy-connect')
);

drop policy if exists "quotas_update" on app_buddy_connect.icebreaker_quotas;
create policy "quotas_update" on app_buddy_connect.icebreaker_quotas for update using (
  public.can_access_app_data(workspace_id, 'buddy-connect')
) with check (
  public.can_access_app_data(workspace_id, 'buddy-connect')
);

drop policy if exists "quotas_delete" on app_buddy_connect.icebreaker_quotas;
create policy "quotas_delete" on app_buddy_connect.icebreaker_quotas for delete using (
  public.can_access_app_data(workspace_id, 'buddy-connect')
);
