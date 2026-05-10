-- =====================================================================
-- Migration mẫu cho mini-app.
-- Đổi `demo` thành slug thật của bạn TRƯỚC KHI SUBMIT qua Migration Reviewer.
--
-- Schema `app_{slug}` đã được Admin Portal auto-tạo khi register mini-app
-- (cùng grants + default privileges). Migration KHÔNG cần CREATE SCHEMA
-- hay GRANT — chỉ tập trung vào tables, indexes, RLS policies, triggers.
--
-- Migration Reviewer auto duplicate file này sang schema sandbox (suffix
-- _dev) khi apply atomic — chỉ viết cho schema chính.
--
-- Checklist (Migration Reviewer sẽ verify):
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

-- GRANT cho table cụ thể (default privileges chỉ áp dụng cho table TƯƠNG LAI
-- nếu chạy default privileges TRƯỚC khi tạo table — vì admin auto setup chạy
-- trước, default sẽ apply cho table này. Nhưng explicit grant cho an tâm.)
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
