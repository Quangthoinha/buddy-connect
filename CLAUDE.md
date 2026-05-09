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

---

## Layout

```
miniapp-template/
├── src/
│   ├── App.jsx               ← UI mini-app (sửa file này khi build)
│   ├── main.jsx
│   └── lib/
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
- `git push` branch → Vercel tự tạo Preview URL
- Set Vercel env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, AI key, R2 keys nếu cần
- Admin Portal: đăng ký app, set preview/prod URL, apply migration, enable cho workspace

---

## Anti-patterns (KHÔNG làm)

- ❌ Tạo table trong schema `public`
- ❌ Quên RLS hoặc tạm thời disable để debug
- ❌ Lưu URL file vào DB (URL có thời hạn)
- ❌ Để API key trong code client (`VITE_*` là public!)
- ❌ Dùng `window.__APP_CONTEXT__` trực tiếp (dùng `getContext()`)
- ❌ Gọi `fetch` thẳng tới provider AI từ client (lộ key, không verify token)
- ❌ Hardcode workspaceId — luôn lấy từ context
