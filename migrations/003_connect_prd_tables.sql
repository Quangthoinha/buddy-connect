-- =====================================================================
-- Migration 003: Connect Mini-App Final Production Schema
-- Slug = "buddy-connect" → schema = `app_buddy_connect`
-- =====================================================================

-- 1. Bảng danh mục Thẻ (tags)
create table if not exists app_buddy_connect.tags (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  parent_code   text not null,
  child_code    text not null,
  name          text not null,
  parent_name   text not null,
  created_at    timestamptz not null default now(),
  constraint uq_workspace_child unique (workspace_id, child_code)
);

create index if not exists idx_tags_workspace on app_buddy_connect.tags (workspace_id);
grant select, insert, update, delete on app_buddy_connect.tags to authenticated;
alter table app_buddy_connect.tags enable row level security;

create policy "tags_select" on app_buddy_connect.tags for select using (public.can_access_app_data(workspace_id, 'buddy-connect'));
create policy "tags_insert" on app_buddy_connect.tags for insert with check (public.can_access_app_data(workspace_id, 'buddy-connect'));
create policy "tags_update" on app_buddy_connect.tags for update using (public.can_access_app_data(workspace_id, 'buddy-connect')) with check (public.can_access_app_data(workspace_id, 'buddy-connect'));
create policy "tags_delete" on app_buddy_connect.tags for delete using (public.is_owner_workspace_member(workspace_id));


-- 2. Bảng Hồ sơ nhân viên (user_profiles)
create table if not exists app_buddy_connect.user_profiles (
  user_id         uuid not null references auth.users(id) on delete cascade,
  workspace_id    uuid not null references public.workspaces(id) on delete cascade,
  department      text not null check (char_length(department) between 1 and 100),
  facility        text not null check (char_length(facility) between 1 and 100),
  available_times text[] not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index if not exists idx_profiles_workspace on app_buddy_connect.user_profiles (workspace_id);
grant select, insert, update, delete on app_buddy_connect.user_profiles to authenticated;
alter table app_buddy_connect.user_profiles enable row level security;

create policy "profiles_select" on app_buddy_connect.user_profiles for select using (public.can_access_app_data(workspace_id, 'buddy-connect'));
create policy "profiles_insert" on app_buddy_connect.user_profiles for insert with check (auth.uid() = user_id and public.can_access_app_data(workspace_id, 'buddy-connect'));
create policy "profiles_update" on app_buddy_connect.user_profiles for update using (auth.uid() = user_id and public.can_access_app_data(workspace_id, 'buddy-connect')) with check (auth.uid() = user_id and public.can_access_app_data(workspace_id, 'buddy-connect'));
create policy "profiles_delete" on app_buddy_connect.user_profiles for delete using (public.is_owner_workspace_member(workspace_id));


-- 3. Bảng liên kết sở thích (user_tags)
create table if not exists app_buddy_connect.user_tags (
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  child_code    text not null,
  created_at    timestamptz not null default now(),
  primary key (workspace_id, user_id, child_code),
  foreign key (workspace_id, child_code) references app_buddy_connect.tags(workspace_id, child_code) on delete cascade
);

create index if not exists idx_user_tags_lookup on app_buddy_connect.user_tags (workspace_id, child_code);
grant select, insert, update, delete on app_buddy_connect.user_tags to authenticated;
alter table app_buddy_connect.user_tags enable row level security;

create policy "user_tags_select" on app_buddy_connect.user_tags for select using (public.can_access_app_data(workspace_id, 'buddy-connect'));
create policy "user_tags_insert" on app_buddy_connect.user_tags for insert with check (auth.uid() = user_id and public.can_access_app_data(workspace_id, 'buddy-connect'));
create policy "user_tags_delete" on app_buddy_connect.user_tags for delete using (auth.uid() = user_id or public.is_owner_workspace_member(workspace_id));


-- 4. Bảng Quản lý Phòng hẹn (rooms)
-- @realtime
create table if not exists app_buddy_connect.rooms (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces(id) on delete cascade,
  host_id          uuid not null references auth.users(id) on delete cascade,
  child_code       text not null,
  location         text not null check (char_length(location) between 1 and 200),
  scheduled_at     timestamptz not null,
  max_participants integer not null default 2 check (max_participants >= 2),
  status           text not null default 'open' check (status in ('open', 'filling', 'matched', 'cancelled', 'expired')),
  chat_group_id    text,
  cancel_reason    text,
  version          integer not null default 1,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_rooms_workspace_status on app_buddy_connect.rooms (workspace_id, status);
create index if not exists idx_rooms_scheduled on app_buddy_connect.rooms (workspace_id, scheduled_at desc);
grant select, insert, update, delete on app_buddy_connect.rooms to authenticated;
alter table app_buddy_connect.rooms enable row level security;

create policy "rooms_select" on app_buddy_connect.rooms for select using (public.can_access_app_data(workspace_id, 'buddy-connect'));
create policy "rooms_insert" on app_buddy_connect.rooms for insert with check (public.can_access_app_data(workspace_id, 'buddy-connect'));
create policy "rooms_update" on app_buddy_connect.rooms for update using (public.can_access_app_data(workspace_id, 'buddy-connect')) with check (public.can_access_app_data(workspace_id, 'buddy-connect'));
create policy "rooms_delete" on app_buddy_connect.rooms for delete using (public.is_owner_workspace_member(workspace_id));


-- 5. Bảng Theo dõi lời mời (invitations)
-- @realtime
create table if not exists app_buddy_connect.invitations (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  room_id       uuid not null references app_buddy_connect.rooms(id) on delete cascade,
  receiver_id   uuid not null references auth.users(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_invitations_receiver on app_buddy_connect.invitations (workspace_id, receiver_id);
create index if not exists idx_invitations_room on app_buddy_connect.invitations (workspace_id, room_id);
grant select, insert, update, delete on app_buddy_connect.invitations to authenticated;
alter table app_buddy_connect.invitations enable row level security;

create policy "invitations_select" on app_buddy_connect.invitations for select using (public.can_access_app_data(workspace_id, 'buddy-connect'));
create policy "invitations_insert" on app_buddy_connect.invitations for insert with check (public.can_access_app_data(workspace_id, 'buddy-connect'));
create policy "invitations_update" on app_buddy_connect.invitations for update using (public.can_access_app_data(workspace_id, 'buddy-connect')) with check (public.can_access_app_data(workspace_id, 'buddy-connect'));
create policy "invitations_delete" on app_buddy_connect.invitations for delete using (public.is_owner_workspace_member(workspace_id));


-- 6. Bảng Lịch sử tương tác chéo (interaction_history)
create table if not exists app_buddy_connect.interaction_history (
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  user_id_1     uuid not null references auth.users(id) on delete cascade,
  user_id_2     uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  constraint chk_symmetric check (user_id_1 < user_id_2),
  primary key (workspace_id, user_id_1, user_id_2)
);

create index if not exists idx_history_lookup on app_buddy_connect.interaction_history (workspace_id, user_id_1, user_id_2);
grant select, insert, update, delete on app_buddy_connect.interaction_history to authenticated;
alter table app_buddy_connect.interaction_history enable row level security;

create policy "history_select" on app_buddy_connect.interaction_history for select using (public.can_access_app_data(workspace_id, 'buddy-connect'));
create policy "history_insert" on app_buddy_connect.interaction_history for insert with check (public.can_access_app_data(workspace_id, 'buddy-connect'));
create policy "history_delete" on app_buddy_connect.interaction_history for delete using (public.is_owner_workspace_member(workspace_id));


-- 7. Trigger updated_at
create or replace function app_buddy_connect.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated_at on app_buddy_connect.user_profiles;
create trigger trg_profiles_updated_at before update on app_buddy_connect.user_profiles for each row execute function app_buddy_connect.set_updated_at();

drop trigger if exists trg_rooms_updated_at on app_buddy_connect.rooms;
create trigger trg_rooms_updated_at before update on app_buddy_connect.rooms for each row execute function app_buddy_connect.set_updated_at();

drop trigger if exists trg_invitations_updated_at on app_buddy_connect.invitations;
create trigger trg_invitations_updated_at before update on app_buddy_connect.invitations for each row execute function app_buddy_connect.set_updated_at();
