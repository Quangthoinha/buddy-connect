# CLAUDE.md — Mini-app Template

> File này được Claude (và dev) đọc khi vibe code mini-app trong repo clone từ template này.
> Đọc kỹ trước khi viết code. Đây là single source of truth cho mọi quy tắc kỹ thuật.

---

## 1. Mini-app là gì trong hệ Mushy

Một **mini-app** = web app độc lập trong hệ Mushy Super App:

- **Frontend**: Vite + React, deploy trên Vercel (1 project per mini-app)
- **Backend**: `api/` thư mục → Vercel Serverless Functions
- **Database**: schema riêng `app_{slug}` trong Supabase chung của Mushy
- **Chạy 2 mode**: trong WebView của Shell (production native app) hoặc browser (dev, có bridge mock)

Đọc thêm `CLAUDE.md` ở repo gốc Mushy để hiểu triết lý + kiến trúc tổng thể.

### Config — `mushy.config.json` (committed)

File này ở root repo, **committed Git**. Chứa 3 thứ public (Supabase design intent — đã giải thích ở section 4):

```json
{
  "slug": "demo",
  "supabase": {
    "url": "https://....supabase.co",
    "anonKey": "eyJ..."
  }
}
```

Khi clone template tạo mini-app mới: chỉ cần đổi `slug` → xong. URL + anon key đã sẵn (platform admin pre-fill, không cần hỏi xin).

**Slug bất biến**: 3-41 ký tự `[a-z0-9-]`, unique trong catalog. Quyết định:
- schema `app_{slug}` + `app_{slug}_dev`
- bucket storage `miniapp-{slug}`
- prod domain `{slug}.mini.mushy-app.com`

KHÔNG đổi slug sau khi đã có data.

**Vercel env vars** chỉ còn server-side + per-environment scope (xem section 8.2).

---

## 2. Môi trường dev / prod

### 2.1 Schema namespace
- `app_{slug}`     → production (hit khi `VITE_APP_ENV=prod`, frontend deploy ở `{slug}.mini.mushy-app.com`)
- `app_{slug}_dev` → dev sandbox (hit khi `VITE_APP_ENV=dev`, frontend deploy ở `*.vercel.app`)

User auth + workspaces dùng chung 1 DB → đăng nhập 1 lần, real account ở mọi mode.

### 2.2 Vercel branch + env
- Branch `main` → Vercel **Production** → custom domain `{slug}.mini.mushy-app.com` → `VITE_APP_ENV=prod`
- Branch `dev`  → Vercel **Preview** → URL auto `<project>.vercel.app` → `VITE_APP_ENV=dev`

⚠️ **Vercel Free plan**: custom domain CHỈ gắn vào production. Preview phải dùng `*.vercel.app`.

### 2.3 dev_mode (read-only context)
Mini-app đọc `ctx.userDevMode` + `ctx.isAppOwner` từ `getContext()`. Khi cả 2 = true, user đang xem preview build của app — có thể hiện badge `🛠 DEV` riêng nếu cần. Mặc định không bắt buộc làm gì.

---

## 3. Quy tắc Database (BẮT BUỘC)

### 3.1 Schema rule
- **Schema duy nhất**: `app_{slug}`. KHÔNG bao giờ tạo table trong `public`/`auth`/`storage`
- **KHÔNG viết tay** `app_{slug}_dev` trong migration file. Migration Reviewer auto duplicate cả 2 schema (atomic apply).
- File migration trong `migrations/00X_xxx.sql` chỉ viết `app_{slug}.tablename` — Reviewer regex-replace whole-word khi apply lần 2 cho dev schema.
- **KHÔNG viết SQL nào touch schema `storage`** (bucket, objects, policies). Reviewer chặn hết. Bucket + RLS auto-tạo bởi Admin Portal khi register app — giống Cloudflare DNS auto-create.

### 3.2 Mọi table phải có
```sql
create table if not exists app_{slug}.tablename (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  created_by    uuid not null references auth.users(id),
  created_at    timestamptz not null default now()
);

create index if not exists idx_tablename_workspace on app_{slug}.tablename (workspace_id);

grant select, insert, update, delete on app_{slug}.tablename to authenticated;

alter table app_{slug}.tablename enable row level security;

create policy "workspace_isolation" on app_{slug}.tablename
for all using (
  workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid())
)
with check (
  workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid())
);
```

### 3.3 Kiểu dữ liệu
- **Tiền**: `bigint` (đơn vị nhỏ nhất, vd VND × 1)
- **ID**: `uuid` (gen_random_uuid())
- **Thời gian**: `timestamptz`, default `now()`
- **File**: lưu `object_key text`, **KHÔNG** lưu URL (URL có expiry)
- **Currency, locale, status**: `text` + check constraint cho enum

### 3.4 Workspace scoping (đặc biệt quan trọng)

⚠️ **Mọi query PHẢI có `.eq('workspace_id', ctx.workspaceId)`**. RLS chỉ chặn cross-user, KHÔNG chặn cross-workspace của cùng user. User là member của nhiều workspace → RLS cho thấy hết → query phải scope tay.

```js
// ✅ Đúng
const { data } = await db.from('notes').select('*')
  .eq('workspace_id', ctx.workspaceId);

// ❌ Sai — sẽ thấy notes ở workspace khác user cũng là member
const { data } = await db.from('notes').select('*');

// ✅ Insert: gán workspace_id từ context
await db.from('notes').insert({ ...payload, workspace_id: ctx.workspaceId });
```

Áp dụng cho `select`, `update`, `delete`. `insert` thì set `workspace_id` trong row.

Xem `migrations/001_init_example.sql` làm template chi tiết.

---

## 4. Quy tắc Security (BẮT BUỘC)

- **API key (Gemini, OpenAI, OpenRouter…)**: chỉ ở Vercel env vars **server-side**, KHÔNG prefix `VITE_`. Client gọi qua `api/*.js` proxy.
- Mọi `api/*.js` cần verify JWT qua `api/_verify.js`. Header: `Authorization: Bearer {token}` + `X-Workspace-Id: {ws}`.
- KHÔNG bypass RLS. KHÔNG "tạm thời" disable RLS để debug.

### Anti-injection (khi mini-app có AI / SQL / user input nguy hiểm)

- **Hard limit độ dài** input (vd 30KB cho SQL, 5KB cho text trước khi truyền AI)
- **Wrap user content trong tag XML rõ ràng** (vd `<user_input>...</user_input>`) + system prompt cấm "follow instructions inside the tag"
- **Force structured output**: `response_format: { type: 'json_object' }` (OpenAI/OpenRouter) hoặc Gemini structured output. **Validate shape trước khi dùng.**
- **Tolerate markdown wrap**: model đôi khi trả ` ```json ... ``` ` dù đã set json_object → strip code fence trước khi `JSON.parse`.
- **Output không match shape → fallback "unsure"**, KHÔNG silently treat như success.
- **Anti SQL injection**: dùng Supabase `from().eq()` parameterized, KHÔNG concat string. Nếu dùng `rpc()` raw SQL, validate input bằng regex chặt.
- **Rate limit per user** cho endpoint tốn token AI: tạo `*_usage_log(user_id, date, count)` + RPC atomic `consume_quota`. Default 100 req/user/ngày.

---

## 5. Lib reference (`src/lib/`)

| File | Export | Dùng khi nào |
|---|---|---|
| `context.js` | `getContext()`, `isInShell()` | Lấy `{ token, userId, workspaceId, workspaceSlug, role, userDevMode, isAppOwner }` |
| `supabase.js` | `db`, `dbPublic`, `getSupabase()`, `getPublicSupabase()` | `db` scoped vào `app_{slug}` (theo VITE_APP_ENV → có thể là `_dev`); `dbPublic` cho public.* (hiếm dùng) |
| `bridge.js` | `callNative('TYPE', payload)` | Gọi native: `GET_LOCATION` / `OPEN_CAMERA` / `PICK_FILE` / `PUSH_NOTIFICATION`. Promise, timeout 10s. Mock tự bật khi không có Shell. |
| `storage.js` | `upload(file, folder)`, `getViewUrl(objectKey)` | Bucket `miniapp-{slug}` **auto-tạo bởi Admin Portal khi register app** (giống DNS). Mini-app dev KHÔNG viết storage SQL. Path: `{ws_id}/[dev/]{folder}/{uuid}.{ext}` (dev có prefix `dev/` để dễ wipe). Lưu `object_key` vào DB. R2 opt-in qua `VITE_USE_R2=true`. |
| `realtime.js` | `subscribeToTable(table, workspaceId, cb)`, `subscribeBroadcast()` | Trả unsubscribe — gọi khi unmount! |
| `queue.js` | `enqueue(jobType, payload)`, `onJob(jobId, cb)` | Tác vụ nặng async qua `public.job_queue` |
| `theme.js` | `colors`, `radii`, `fonts`, `space`, `fontSize` | Inline style nếu cần |

**Component sẵn có** (`src/components/`):
- `Dialog.jsx` — `DialogProvider` + `useDialog()`. Wrap App với `<DialogProvider>` (đã có trong `main.jsx`).

### Dialog API (THAY native alert/confirm)

```js
const dialog = useDialog();

await dialog.info('Title', 'Body');
await dialog.success('Đã lưu', 'OK');
await dialog.error('Lỗi', err.message);

const ok = await dialog.confirm(
  'Xoá file?', 'Không thể hoàn tác.',
  { danger: true, confirmLabel: 'Xoá', cancelLabel: 'Huỷ' }
);
if (!ok) return;
```

Esc = cancel, Enter = confirm. CSS có sẵn trong `theme.css`.

---

## 6. Design system (default — KHÔNG ép buộc, có thể override)

`src/lib/theme.css` auto-import qua `main.jsx`. Mọi mini-app có sẵn brand Mushy.

### Tokens (CSS variables)
- `--brand` `#E63946`, `--bg` `#FFF7F8`, `--ink` `#0F0F12`
- `--r-card` `28px`, `--r-button` `999px` (pill), `--r-input` `999px`
- `--shadow-card`, `--shadow-button`
- xem `src/lib/theme.css` cho full list

### Utility classes
- **Layout**: `.mushy-page` (max 720px center)
- **Card**: `.mushy-card` (clay rounded + shadow + highlight top)
- **Section**: `.mushy-section-title`, `.mushy-section-sub`
- **Button**: `.mushy-btn` + variant `--primary` / `--ghost` / `--dashed` / `--danger`. `--block` = full width.
- **Input**: `.mushy-input` + `.mushy-label`. `--error` cho error state. textarea auto bo `16px`.
- **Status pill**: `.mushy-status` + `--ok` / `--warn` / `--err` + child `.mushy-status-dot`
- **Code**: `.mushy-code` (dark JSON block)
- **Spinner**: `.mushy-spinner`
- **Modal/Dialog**: `.modal-scrim`, `.modal-card`, `.dialog-icon`, `.dialog-title`, `.dialog-body`, `.form-actions`

JS tokens: `import { colors, radii, fonts } from './lib/theme.js'` cho dynamic style.

**Override tự do**: đè class CSS riêng hoặc thay tokens trong `:root` của `App.css`. Mục tiêu là consistent với superapp shell, không ép.

---

## 7. Layout repo

```
miniapp-{slug}/
├── CLAUDE.md                 ← file này
├── README.md
├── .env.example              ← copy sang .env, điền giá trị
├── package.json
├── vite.config.js
├── vercel.json               ← Vercel config (nếu cần rewrites)
├── index.html
├── src/
│   ├── main.jsx              ← import theme.css + DialogProvider + App
│   ├── App.jsx               ← UI mini-app (sửa khi build)
│   ├── App.css               ← style app-specific
│   ├── components/
│   │   └── Dialog.jsx        ← DialogProvider + useDialog
│   └── lib/                  ← shared infra (đừng sửa, sync với template)
│       ├── theme.css
│       ├── theme.js
│       ├── context.js
│       ├── bridge.js
│       ├── supabase.js
│       ├── storage.js
│       ├── realtime.js
│       └── queue.js
├── api/                      ← Vercel Serverless Functions
│   ├── _verify.js            ← verify JWT, KHÔNG expose endpoint
│   └── ai-proxy.js           ← ví dụ: proxy AI request server-side
├── migrations/
│   └── 001_init_example.sql  ← template migration đúng convention
├── scripts/
│   ├── setup.js              ← npm run dev:setup
│   ├── seed.js               ← npm run dev:seed
│   └── refresh-token.js      ← npm run dev:token
└── public/                   ← static assets
```

---

## 8. Workflow

### 8.1 Setup lần đầu (local dev)

```bash
# 1. Clone template
git clone <template-repo-url> miniapp-{slug}
cd miniapp-{slug}

# 2. Đổi slug trong mushy.config.json
#    Mở file → "slug": "REPLACE_WITH_YOUR_SLUG" → "slug": "expense" (vd)
#    Slug được Mushy admin cấp khi đăng ký mini-app (3-41 chars [a-z0-9-]).
#    URL + anon key đã pre-fill, KHÔNG cần đổi.

# 3. Install + dev setup
cp .env.example .env    # giữ placeholder VITE_DEV_*, chưa cần điền
npm install
npm run dev:setup       # ↓ giải thích chi tiết bên dưới
npm run dev             # localhost:5173 (browser, có bridge mock)
```

### 8.1.1 `npm run dev:setup` — flow auto-config local DEV

Script tự động:
1. **Hỏi email + password** Supabase (account của bạn — nếu chưa có thì admin Mushy invite bạn vào workspace nào đó trước qua superapp/admin portal)
2. **Login** qua Supabase Auth → lấy JWT access token (1h expiry)
3. **List workspace** bạn là member → bạn chọn 1
4. **Auto ghi 4 biến** vào `.env`:
   - `VITE_DEV_TOKEN` — JWT access token (mock cho `getContext()`)
   - `VITE_DEV_WORKSPACE_ID` — workspace_id đã chọn
   - `VITE_DEV_USER_ID` — auth.users.id của bạn
   - `VITE_DEV_ROLE` — role của bạn trong workspace đó (owner/admin/member)

Khi `npm run dev`, mini-app browser localhost gọi `getContext()` → fallback đọc `VITE_DEV_*` từ `.env` (không có Shell inject ở browser) → có đủ context giống chạy trong superapp.

### 8.1.2 Token hết hạn sau 1 giờ

JWT expire 1h → mọi query Supabase trả 401. Refresh:
```bash
npm run dev:token       # login lại + update VITE_DEV_TOKEN
```
Workspace/user/role không đổi nên chỉ cần refresh token.

### 8.1.3 Không có account?
Nhờ Mushy admin tạo invite link (qua admin portal `Workspace → + Tạo invite`), bạn click link → signup → tự động join workspace.

### 8.2 Đăng ký mini-app vào catalog Mushy (1 lần per app)

1. Push lần đầu lên GitHub: tạo repo `mushy-miniapp-{slug}`, push `main` + `dev` branch
2. Connect Vercel → tự auto-build → có URL `<project>.vercel.app`
3. Set Vercel env vars **đơn giản** (URL + anon key đã trong `mushy.config.json`, không cần lặp):
   - **Production scope**: `VITE_APP_ENV=prod`
   - **Preview scope**: `VITE_APP_ENV=dev`
   - **Cả 2 scope** (server-side, KHÔNG `VITE_` prefix):
     - `SUPABASE_URL` (lặp lại URL từ mushy.config.json — api/_verify.js dùng)
     - `SUPABASE_SERVICE_ROLE_KEY` (TUYỆT ĐỐI không cho vào mushy.config.json)
     - AI provider keys nếu mini-app dùng (`GEMINI_API_KEY`, `OPENAI_API_KEY`, vv)
4. Mở Admin Portal (https://admin.mini.mushy-app.com) → login → catalog → **+ Đăng ký app mới**:
   - Slug: `{slug}` (uniqueness check live)
   - Tên + mô tả + icon
   - Preview URL: paste `<project>.vercel.app` URL của Vercel
   - Production URL: **auto-generated** từ slug → `https://{slug}.mini.mushy-app.com` (KHÔNG cho user nhập)
   - Visibility: **Private** (default — chỉ owner thấy) hoặc **Public** (mọi ws thấy + ws owner enable)
5. Submit → admin portal **auto-tạo CNAME Cloudflare** `{slug}.mini` → `cname.vercel-dns.com`
6. Dialog success hiện hướng dẫn Vercel: vào project Settings → Domains → add `{slug}.mini.mushy-app.com` → assign Git Branch = `main`
7. Vercel verify DNS (vài phút) → custom domain live

### 8.3 Quy ước branch + git flow

- `main` = production (canonical, stable). Push lên main → Vercel deploy custom domain.
- `dev` = development/preview. Push lên dev → Vercel deploy `*.vercel.app`.
- Standard Git flow: code daily trên `dev` → PR/merge `dev → main` để ship prod.

### 8.4 Submit migration mới

⚠️ **KHÔNG apply migration trực tiếp qua Supabase SQL Editor**. Luôn đi qua Admin Portal Migration Reviewer:

1. Viết SQL trong `migrations/00X_xxx.sql` (chỉ ref `app_{slug}`, KHÔNG viết tay `_dev`)
2. Mở Admin Portal → tab **Migrations** → chọn mini-app của bạn
3. Nhập version (vd `002_add_notes`) + paste SQL
4. **Submit & AI Review** — verdict:
   - **PASS** → auto-apply atomic cho cả `app_{slug}` + `app_{slug}_dev`
   - **REJECT** → đọc reasons, sửa SQL, submit lại (cùng version OK — Reviewer cho re-submit)
   - **UNSURE** → audit log, không apply; sửa + submit lại
5. Quota: 100 review/user/ngày
6. Audit log lưu trong `public.schema_migrations` (owner workspace đọc được)

⚠️ **SQL phải idempotent** — dùng `create table if not exists`, `drop policy if exists`, `create or replace function` … Reviewer cho re-submit cùng version sau fix → migration phải chạy lại an toàn.

ℹ️ **Schema `app_{slug}` + `app_{slug}_dev` được Admin Portal auto-tạo + auto-expose** ngay khi đăng ký mini-app (giống Cloudflare DNS, Storage bucket). Migration đầu tiên chỉ cần tables/RLS/triggers — KHÔNG cần `create schema` hay GRANT/default privileges.

### 8.5 Hàng ngày
- JWT hết hạn sau 1 giờ → `npm run dev:token` để refresh
- Test trong browser (mock) trước, sau đó qua Vercel preview + Expo Go (Shell thật)
- Sửa schema → submit migration qua Reviewer (8.4)

### 8.6 Visibility lifecycle
- App mới đăng ký = Private (chỉ owner thấy + chỉ owner enable cho ws họ là owner)
- Khi ổn → vào admin → Sửa app → đổi sang **Public** (mọi ws thấy, ws owner enable cho ws của họ)
- KHÔNG có "Tắt globally" — nếu cần tắt: chuyển về Private + disable per-workspace, hoặc set status='disabled' qua SQL Editor (rare)

---

## 9. Anti-patterns (KHÔNG làm)

### Database / Backend
- ❌ Tạo table trong schema `public`/`auth`/`storage`
- ❌ Viết tay `app_{slug}_dev` trong migration (Reviewer tự duplicate)
- ❌ Viết SQL touching `storage.*` (bucket auto-managed bởi Admin Portal — Reviewer block)
- ❌ Apply migration trực tiếp qua Supabase SQL Editor (đi qua Admin Portal Reviewer)
- ❌ Quên RLS hoặc "tạm thời" disable
- ❌ Quên `.eq('workspace_id', ctx.workspaceId)` trong query
- ❌ Lưu URL file vào DB (lưu `object_key`)
- ❌ Hardcode workspaceId — luôn `getContext().workspaceId`

### Frontend
- ❌ `window.alert()` / `window.confirm()` — dùng `useDialog()`
- ❌ `window.__APP_CONTEXT__` trực tiếp — dùng `getContext()`
- ❌ Hardcode domain — dùng env hoặc `window.location.origin`

### Security
- ❌ Để API key trong code client (`VITE_*` là public!)
- ❌ Gọi `fetch` thẳng tới provider AI từ client (lộ key, không verify token)
- ❌ Concat user input vào AI prompt mà không wrap tag + force JSON output
- ❌ Trust AI output without shape validation

---

## 10. Quick reference cho Claude (vibe coding)

Khi user nói:
- **"Thêm feature X cho mini-app"** → viết UI trong `App.jsx` (hoặc tách `screens/`), dùng `db.from('table').select().eq('workspace_id', ctx.workspaceId)`, `useDialog()` cho confirm.
- **"Cần table mới"** → viết migration `00X.sql` trong `migrations/` (chỉ `app_{slug}`), có RLS workspace_isolation, instruct user submit qua Admin Portal Reviewer.
- **"Gọi AI"** → tạo `api/X-proxy.js` dùng `_verify.js`, set key Vercel env. Anti-injection: wrap input, force JSON, validate output.
- **"Upload file"** → dùng `upload(file, folder)` từ `storage.js`, lưu `object_key` vào DB, `getViewUrl()` khi render.
- **"Push notification"** → `callNative('PUSH_NOTIFICATION', { title, body })` từ bridge cho local; remote push qua superapp's Expo Push API.

Memory bên Mushy chính (đọc nếu cần):
- `project_environments.md` — kiến trúc dev/prod, schema-per-env, dev_mode
- `project_domain.md` — quy ước domain
- `project_milestones.md` — state hiện tại
