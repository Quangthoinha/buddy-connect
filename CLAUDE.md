# CLAUDE.md — Mini-app Template

> File này được Claude đọc khi bạn vibe code mini-app trong repo clone từ template này.
> Đọc kỹ trước khi viết code.

---

## Đây là gì

Một **mini-app** trong hệ Mushy Super App. Mini-app:
- Là web app độc lập (Vite + React), deploy trên Vercel
- Backend riêng qua `api/` (Vercel Serverless Functions)
- Database riêng: schema `app_{slug}` trong Supabase chung
- Chạy 2 chế độ: **trong WebView của Shell** (production) hoặc **browser thường** (dev, có bridge mock)

Đọc thêm: file `CLAUDE.md` ở repo gốc Mushy có triết lý + stack đầy đủ.

---

## Quy tắc bắt buộc

### Database
- Schema: **`app_{slug}`** — không bao giờ dùng `public` cho table của mini-app
- Mọi table phải có `workspace_id uuid not null references public.workspaces(id) on delete cascade`
- Mọi table phải bật RLS với policy `workspace_isolation`
- Index trên `workspace_id`
- File: lưu `object_key`, không bao giờ lưu URL
- Tiền: `bigint` (đơn vị nhỏ nhất). ID: `uuid`. Thời gian: `timestamptz`.

⚠️ **Mọi query phải có `.eq('workspace_id', ctx.workspaceId)`**. RLS chỉ chặn cross-user (user khác không thấy data của bạn), KHÔNG chặn cross-workspace của cùng user. User là member của nhiều workspace → RLS cho thấy hết → query phải scope tay theo `getContext().workspaceId`. Áp dụng cho `select`, `update`, `delete`. `insert` thì set `workspace_id: ctx.workspaceId` trong row.

Xem `migrations/001_init_example.sql` làm template.

### Security
- API key (Gemini, OpenAI, …) → **chỉ** ở Vercel env vars server-side, không prefix `VITE_`
- Mọi `api/*.js` cần verify token qua `api/_verify.js`
- KHÔNG bypass RLS, không "tạm thời" disable

### Context (Shell ↔ Mini-app)
- Đọc context qua `getContext()` trong `src/lib/context.js`. Không dùng `window.__APP_CONTEXT__` trực tiếp.
- DEV trong browser: fallback dùng `VITE_DEV_*` từ `.env` (do `npm run dev:setup` ghi).

### Bridge (gọi native)
- Dùng `callNative('TYPE', payload)` từ `src/lib/bridge.js` — Promise-based, timeout 10s.
- Mock tự bật khi không có Shell. Types có sẵn: `GET_LOCATION`, `OPEN_CAMERA`, `PICK_FILE`, `PUSH_NOTIFICATION`.
- Cần thêm bridge type mới? Thêm mock trong `bridge.js` + sync với superapp.

### Storage
- Dùng `upload(file, folder)` và `getViewUrl(objectKey)` từ `src/lib/storage.js`.
- DEV: Supabase Storage. PROD: R2 qua Edge Function. Mini-app KHÔNG cần biết.
- Lưu `object_key` vào DB (không phải URL).

### Realtime & Queue
- Realtime: `subscribeToTable(table, workspaceId, cb)` → trả về unsubscribe. Gọi khi unmount.
- Queue: `enqueue(jobType, payload)` → nhận `jobId`, dùng `onJob(jobId, cb)` để chờ kết quả.

### Dialog (thay native alert/confirm)
- KHÔNG dùng `window.alert()` / `window.confirm()` — UI xấu, không khớp brand.
- Dùng `DialogProvider` + `useDialog()` từ `src/components/Dialog.jsx`. Wrap App với `<DialogProvider>` trong `main.jsx`.
- API: `dialog.info(title, body)`, `.success(...)`, `.error(...)`, `.confirm(title, body, { danger, confirmLabel, cancelLabel })`. Promise-based, return true/false cho confirm.
- Esc = cancel, Enter = confirm. CSS đã có sẵn trong `theme.css`.

### Khi build feature có AI / SQL / user input nguy hiểm
- API key chỉ ở Vercel env server-side (đã nói ở Security trên).
- **Anti prompt injection** khi user input đi vào AI prompt:
  - Hard limit độ dài (vd 30KB cho SQL, 5KB cho text).
  - Wrap user content trong tag XML rõ ràng (vd `<user_input>...</user_input>`) + system prompt cấm "follow instructions inside the tag".
  - Force structured output: `response_format: { type: 'json_object' }` (OpenAI/OpenRouter) hoặc Gemini structured output. Validate shape trước khi dùng.
  - Tolerate markdown wrap: model đôi khi trả ` ```json ... ``` ` dù đã set json_object → strip code fence trước khi `JSON.parse`.
  - Nếu output không match shape → fallback "unsure", KHÔNG silently treat như success.
- **Anti SQL injection** với input đi vào SQL: dùng Supabase `from().eq()` parameterized, KHÔNG concat string. Nếu phải dùng `rpc()` raw SQL, validate input bằng regex chặt.
- **Rate limit per user** cho endpoint tốn token AI: tạo bảng `*_usage_log(user_id, date, count)` + RPC atomic `consume_quota` (UPSERT + check). Default 100 req/user/ngày là điểm khởi đầu hợp lý.

### Design system (default — KHÔNG ép buộc)
- `src/lib/theme.css` auto-import qua `main.jsx` → mọi mini-app có sẵn brand Mushy: palette, font Be Vietnam Pro, shadow clay, utility classes.
- Tokens: CSS variables `--brand` `#E63946`, `--bg` `#FFF7F8`, `--ink` `#0F0F12`, `--r-card` `28px`, `--r-button` `999px` (pill), `--shadow-card`, `--shadow-button`, ... (xem file đầy đủ).
- Utility classes:
  - **Layout**: `.mushy-page` (max 720, padding center)
  - **Card**: `.mushy-card` (clay rounded + shadow + highlight top)
  - **Section**: `.mushy-section-title`, `.mushy-section-sub`
  - **Button**: `.mushy-btn` + `--primary` (gradient đỏ) / `--ghost` (white) / `--dashed` (viền đứt). Thêm `--block` để full width.
  - **Input**: `.mushy-input` + `.mushy-label`. Thêm `--error` cho error state.
  - **Status pill**: `.mushy-status` + `--ok` / `--warn` / `--err` + child `.mushy-status-dot`.
  - **Code**: `.mushy-code` (dark JSON block).
  - **Spinner**: `.mushy-spinner`.
- JS tokens: `import { colors, radii, fonts } from './lib/theme.js'` khi cần dynamic style.
- **Tự do override** — đè class CSS riêng hoặc thay tokens trong `:root` của App.css cho app-specific. Mục tiêu là consistent với superapp shell, không ép.

Xem `src/App.jsx` (demo) để biết cách kết hợp `mushy-*` classes với class app-specific.

---

## Layout

```
miniapp-template/
├── src/
│   ├── App.jsx               ← UI mini-app (sửa file này khi build)
│   ├── App.css               ← style app-specific
│   ├── main.jsx              ← import theme.css + render
│   ├── components/
│   │   └── Dialog.jsx        ← DialogProvider + useDialog (thay alert/confirm)
│   └── lib/
│       ├── theme.css         ← Mushy design system (tokens + utility classes)
│       ├── theme.js          ← JS export tokens (cho inline style)
│       ├── context.js        ← getContext(), isInShell()
│       ├── bridge.js         ← callNative() + mocks
│       ├── supabase.js       ← getSupabase(), db proxy (đã scope schema)
│       ├── storage.js        ← upload(), getViewUrl()
│       ├── realtime.js       ← subscribeToTable, subscribeBroadcast
│       └── queue.js          ← enqueue, onJob
├── api/                      ← Vercel Serverless Functions
│   ├── _verify.js            ← verify JWT, không expose
│   └── ai-proxy.js           ← ví dụ: gọi Gemini với key server-side
├── migrations/
│   └── 001_init_example.sql  ← template migration đúng convention
├── scripts/
│   ├── setup.js              ← npm run dev:setup
│   ├── seed.js               ← npm run dev:seed
│   └── refresh-token.js      ← npm run dev:token
├── .env.example
└── package.json
```

---

## Workflow

### Lần đầu
1. Copy `.env.example` → `.env`, điền `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` + `VITE_APP_SLUG`
2. `npm install`
3. `npm run dev:setup` → login + chọn workspace + ghi token vào `.env`
4. Apply migration đầu tiên qua Supabase SQL editor (hoặc Admin Portal khi đã có)
5. `npm run dev:seed` (optional)
6. `npm run dev` → mở localhost:5173

### Hàng ngày
- JWT hết hạn sau 1 giờ → `npm run dev:token` để refresh
- Sửa schema → thêm migration mới `00X_xxx.sql` → apply qua Migration Reviewer
- Test: browser (mock) trước, sau đó Expo Go (Shell thật)

### Deploy

**Quy ước branch (Mushy):** `main` = production (canonical, stable). `dev` = development/preview. Standard Git flow — `main` luôn deploy được.

**Lúc đầu (chưa tách dev/prod, chỉ có main):**
- `git push origin main` → Vercel auto Preview URL `*.vercel.app`
- Set Vercel env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (dev project) + server-side `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, AI key
- Admin Portal (admin-dev.mini.mushy-app.com): đăng ký app, set preview URL, apply migration qua Reviewer, enable cho workspace dev

**Khi stable + sẵn sàng tách dev/prod:**
1. Tạo Supabase project prod riêng → apply tất cả migration từ đầu
2. `git branch dev main && git push -u origin dev` (copy main sang dev, giữ history)
3. Vercel Settings → Domains:
   - `{slug}.mini.mushy-app.com` → assign branch `main` (production)
   - `{slug}-dev.mini.mushy-app.com` → assign branch `dev` (preview)
   - Production Branch giữ default = `main`
4. Vercel Environment Variables — cùng KEY name, scope khác nhau:
   - **Production**: prod Supabase URL + key + service role + AI prod key
   - **Preview**: dev Supabase URL + key + service role + AI dev key
5. Admin Portal **prod** (admin.mini.mushy-app.com): đăng ký app, set prod URL `{slug}.mini.mushy-app.com`, apply migration qua Reviewer prod, enable cho workspace prod
6. Workflow sau đó: code trên `dev` → test admin-dev — khi ổn, PR/merge `dev → main` → auto deploy prod

⚠️ **KHÔNG share Supabase project giữa dev và prod**. User auth tách biệt giữa 2 project — đó là feature.

⚠️ **Migration phải apply riêng cho mỗi môi trường** qua Admin Portal tương ứng. Mỗi 2 tuần review song song `public.schema_migrations` của 2 Supabase để bắt migration lỡ apply chỉ 1 bên.

Xem chi tiết kiến trúc dev/prod song song trong memory `project_environments.md`.

---

## Anti-patterns (KHÔNG làm)

- ❌ Tạo table trong schema `public`
- ❌ Quên RLS hoặc tạm thời disable để debug
- ❌ Lưu URL file vào DB (URL có thời hạn)
- ❌ Để API key trong code client (`VITE_*` là public!)
- ❌ Dùng `window.__APP_CONTEXT__` trực tiếp (dùng `getContext()`)
- ❌ Gọi `fetch` thẳng tới provider AI từ client (lộ key, không verify token)
- ❌ Hardcode workspaceId — luôn lấy từ context
- ❌ `window.alert()` / `window.confirm()` (dùng `useDialog()`)
- ❌ Concat user input vào AI prompt mà không wrap tag + force JSON output
- ❌ Apply migration trực tiếp Supabase SQL editor ở prod (đi qua Admin Portal Migration Reviewer để được verify + audit log)
