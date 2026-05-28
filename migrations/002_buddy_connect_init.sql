-- =====================================================================
-- Migration cho AI Buddy Connect mini-app.
-- Slug = "buddy-connect" → schema PROD = `app_buddy_connect`
-- =====================================================================

-- ---------- 1. Bảng buddy_profiles ----------
create table if not exists app_buddy_connect.buddy_profiles (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  interests       text[] not null default '{}',
  skills          text[] not null default '{}',
  career_goals    text[] not null default '{}',
  sports          text[] not null default '{}',
  available_times text[] not null default '{}',
  status_text     text check (char_length(status_text) <= 150),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_buddy_profiles_workspace on app_buddy_connect.buddy_profiles (workspace_id);

grant select, insert, update, delete on app_buddy_connect.buddy_profiles to authenticated;

alter table app_buddy_connect.buddy_profiles enable row level security;

drop policy if exists "buddy_profiles_select" on app_buddy_connect.buddy_profiles;
create policy "buddy_profiles_select" on app_buddy_connect.buddy_profiles
for select using (
  public.can_access_app_data(workspace_id, 'buddy-connect')
);

drop policy if exists "buddy_profiles_insert" on app_buddy_connect.buddy_profiles;
create policy "buddy_profiles_insert" on app_buddy_connect.buddy_profiles
for insert with check (
  auth.uid() = user_id and public.can_access_app_data(workspace_id, 'buddy-connect')
);

drop policy if exists "buddy_profiles_update" on app_buddy_connect.buddy_profiles;
create policy "buddy_profiles_update" on app_buddy_connect.buddy_profiles
for update using (
  auth.uid() = user_id and public.can_access_app_data(workspace_id, 'buddy-connect')
) with check (
  auth.uid() = user_id and public.can_access_app_data(workspace_id, 'buddy-connect')
);

drop policy if exists "buddy_profiles_delete" on app_buddy_connect.buddy_profiles;
create policy "buddy_profiles_delete" on app_buddy_connect.buddy_profiles
for delete using (
  public.is_owner_workspace_member(workspace_id)
);


-- ---------- 2. Bảng activities ----------
-- @realtime
create table if not exists app_buddy_connect.activities (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  created_by       uuid not null references auth.users(id),
  title            text not null check (char_length(title) between 1 and 150),
  description      text check (char_length(description) <= 500),
  activity_type    text not null check (activity_type in ('lunch', 'chat', 'learn', 'sports')),
  sports_type      text,
  status           text not null default 'open' check (status in ('open', 'matched', 'completed', 'cancelled')),
  scheduled_at     timestamptz not null,
  max_participants integer not null default 2 check (max_participants >= 2),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_activities_workspace on app_buddy_connect.activities (workspace_id);
create index if not exists idx_activities_time on app_buddy_connect.activities (workspace_id, scheduled_at desc);

grant select, insert, update, delete on app_buddy_connect.activities to authenticated;

alter table app_buddy_connect.activities enable row level security;

drop policy if exists "activities_select" on app_buddy_connect.activities;
create policy "activities_select" on app_buddy_connect.activities
for select using (
  public.can_access_app_data(workspace_id, 'buddy-connect')
);

drop policy if exists "activities_insert" on app_buddy_connect.activities;
create policy "activities_insert" on app_buddy_connect.activities
for insert with check (
  public.can_access_app_data(workspace_id, 'buddy-connect')
);

drop policy if exists "activities_update" on app_buddy_connect.activities;
create policy "activities_update" on app_buddy_connect.activities
for update using (
  public.can_access_app_data(workspace_id, 'buddy-connect')
) with check (
  public.can_access_app_data(workspace_id, 'buddy-connect')
);

drop policy if exists "activities_delete" on app_buddy_connect.activities;
create policy "activities_delete" on app_buddy_connect.activities
for delete using (
  public.is_owner_workspace_member(workspace_id)
);


-- ---------- 3. Bảng activity_participants ----------
-- @realtime
create table if not exists app_buddy_connect.activity_participants (
  activity_id   uuid not null references app_buddy_connect.activities(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (activity_id, user_id)
);

create index if not exists idx_participants_workspace on app_buddy_connect.activity_participants (workspace_id);

grant select, insert, update, delete on app_buddy_connect.activity_participants to authenticated;

alter table app_buddy_connect.activity_participants enable row level security;

drop policy if exists "participants_select" on app_buddy_connect.activity_participants;
create policy "participants_select" on app_buddy_connect.activity_participants
for select using (
  public.can_access_app_data(workspace_id, 'buddy-connect')
);

drop policy if exists "participants_insert" on app_buddy_connect.activity_participants;
create policy "participants_insert" on app_buddy_connect.activity_participants
for insert with check (
  auth.uid() = user_id and public.can_access_app_data(workspace_id, 'buddy-connect')
);

drop policy if exists "participants_delete" on app_buddy_connect.activity_participants;
create policy "participants_delete" on app_buddy_connect.activity_participants
for delete using (
  auth.uid() = user_id or public.is_owner_workspace_member(workspace_id)
);


-- ---------- Trigger updated_at for buddy_profiles & activities ----------
create or replace function app_buddy_connect.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on app_buddy_connect.buddy_profiles;
create trigger trg_profiles_updated_at
  before update on app_buddy_connect.buddy_profiles
  for each row execute function app_buddy_connect.set_updated_at();

drop trigger if exists trg_activities_updated_at on app_buddy_connect.activities;
create trigger trg_activities_updated_at
  before update on app_buddy_connect.activities
  for each row execute function app_buddy_connect.set_updated_at();
