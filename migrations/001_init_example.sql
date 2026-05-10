-- =====================================================================
-- Migration mẫu cho mini-app.
-- Đổi `demo` thành slug thật của bạn TRƯỚC KHI SUBMIT qua Migration Reviewer.
--
-- Migration Reviewer auto duplicate file này sang schema sandbox (suffix
-- _dev) khi apply atomic — chỉ viết cho schema chính, KHÔNG viết tay
-- schema sandbox (Reviewer regex check sẽ reject).
--
-- Checklist (Migration Reviewer sẽ verify):
--   [x] Schema riêng `app_{slug}`, không dùng `public`
--   [x] Mọi table có `workspace_id uuid not null`
--   [x] Foreign key `workspace_id` → `public.workspaces` ON DELETE CASCADE
--   [x] Index trên `workspace_id`
--   [x] RLS bật + policy `workspace_isolation`
--   [x] `created_at timestamptz default now()`
--   [x] `created_by uuid references auth.users(id)`
--   [x] Tiền: `bigint` (đơn vị nhỏ nhất); ID: `uuid`; thời gian: `timestamptz`
--   [x] File: lưu `object_key`, không lưu URL
--   [x] Trigger updated_at nếu có cột này
-- =====================================================================

create schema if not exists app_demo;

-- Cấp quyền cho role `authenticated` dùng schema + table mới sau này.
-- (Schema riêng không tự inherit từ public, phải GRANT tay.)
grant usage on schema app_demo to authenticated;
alter default privileges in schema app_demo
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema app_demo
  grant usage, select on sequences to authenticated;
alter default privileges in schema app_demo
  grant execute on functions to authenticated;

-- ---------- Bảng tasks (ví dụ) ----------
create table if not exists app_demo.tasks (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  created_by    uuid not null references auth.users(id),
  title         text not null check (char_length(title) between 1 and 200),
  done          boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_tasks_workspace      on app_demo.tasks (workspace_id);
create index if not exists idx_tasks_workspace_time on app_demo.tasks (workspace_id, created_at desc);

-- GRANT cho table đã tạo (default privileges chỉ áp dụng cho table TƯƠNG LAI)
grant select, insert, update, delete on app_demo.tasks to authenticated;

alter table app_demo.tasks enable row level security;

drop policy if exists "workspace_isolation" on app_demo.tasks;
create policy "workspace_isolation" on app_demo.tasks
for all using (
  workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  )
)
with check (
  workspace_id in (
    select workspace_id from public.workspace_members where user_id = auth.uid()
  )
);

-- ---------- Trigger updated_at ----------
create or replace function app_demo.set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trg_tasks_updated_at on app_demo.tasks;
create trigger trg_tasks_updated_at
  before update on app_demo.tasks
  for each row execute function app_demo.set_updated_at();
