# Mini-app Template — Mushy Super App

Template repo để build mini-app trong hệ Mushy. Clone repo này, đổi `VITE_APP_SLUG`, bắt đầu code.

> 📖 Đọc kỹ [CLAUDE.md](./CLAUDE.md) trước khi viết code — đó là single source of truth cho mọi quy tắc kỹ thuật (DB, RLS, security, kiến trúc dev/prod, anti-patterns).

## Quick start (local dev)

```bash
# 1. Đổi slug trong mushy.config.json (đã có sẵn URL + anon key Mushy)
#    "slug": "demo" → "slug": "ten-app-cua-ban"

# 2. Install + setup
cp .env.example .env    # giữ placeholder, không cần điền gì
npm install
npm run dev:setup       # Login Supabase + chọn workspace + tự ghi VITE_DEV_*
npm run dev             # localhost:5173
```

URL + anon key Mushy committed vào `mushy.config.json` (public theo design Supabase, đã giải thích trong CLAUDE.md). KHÔNG cần xin admin.

## Scripts

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Vite dev server, port 5173 (browser mode + bridge mock) |
| `npm run dev:setup` | 1 lần: login Supabase, chọn/tạo workspace, ghi `VITE_DEV_*` vào `.env` |
| `npm run dev:token` | Refresh JWT (hết hạn sau 1 giờ) |
| `npm run dev:seed` | Insert sample data theo schema mini-app |
| `npm run build` | Build production |
| `npm run preview` | Preview build local |

## Workflow tóm tắt

1. **Code local** → `npm run dev` test trong browser (bridge mock)
2. **Push lên GitHub** → Vercel auto build → `<project>.vercel.app`
3. **Đăng ký vào Mushy** qua Admin Portal (https://admin.mini.mushy-app.com):
   - Slug + Tên + Preview URL (Vercel)
   - Auto-tạo CNAME Cloudflare cho prod custom domain
   - Hướng dẫn add Vercel custom domain
4. **Submit migration** qua Admin Portal → Migration Reviewer (Gemini AI) → auto-apply cho cả `app_{slug}` + `app_{slug}_dev`
5. **Test trong superapp**: mở Expo Go → workspace → mini-app → load dev URL (preview) hoặc prod URL

## Branch convention

- `main` = production (custom domain `{slug}.mini.mushy-app.com`)
- `dev`  = preview (URL auto `*.vercel.app`)

Standard Git flow: code daily trên `dev`, PR/merge `dev → main` để ship prod.

## Stack cố định

- **Frontend**: Vite + React 18
- **Backend**: Vercel Serverless Functions (`api/`)
- **Database**: Supabase Postgres (1 project chung Mushy, schema riêng `app_{slug}`)
- **Auth**: Supabase Auth (token inject từ superapp shell)
- **Storage**: Supabase Storage bucket `miniapp-{slug}` (R2 opt-in qua `VITE_USE_R2`)
- **Realtime**: Supabase Postgres Changes + Broadcast
- **Bridge native**: postMessage protocol qua `react-native-webview` (superapp)

## Layout repo

```
mushy.config.json         ← slug + Supabase URL/anon key (committed, public)
src/
├── App.jsx               ← UI mini-app (sửa đây khi build feature)
├── App.css               ← style app-specific (override theme nếu cần)
├── main.jsx              ← entry, wrap DialogProvider
├── components/Dialog.jsx ← useDialog() thay alert/confirm native
└── lib/                  ← shared infra (theme, context, bridge, supabase, storage, realtime, queue)
api/                      ← Vercel Serverless Functions (server-side, có API keys)
migrations/               ← SQL migrations (submit qua Admin Portal Reviewer)
scripts/                  ← npm run dev:* scripts
```

Chi tiết từng file + quy ước: xem [CLAUDE.md](./CLAUDE.md).

## Quy tắc tối thượng (vi phạm = bug)

1. **Schema = `app_{slug}`** (KHÔNG bao giờ `public`)
2. **Mọi table có `workspace_id` + RLS workspace_isolation**
3. **Mọi query `.eq('workspace_id', ctx.workspaceId)`** (RLS không chặn cross-workspace cùng user)
4. **API key chỉ ở Vercel env server-side**, không `VITE_*` prefix
5. **Migration luôn qua Admin Portal Reviewer**, không SQL Editor trực tiếp
6. **Lưu `object_key`, không phải URL**
7. **`useDialog()` thay `window.alert/confirm`**

Đọc [CLAUDE.md](./CLAUDE.md) section 9 cho danh sách anti-patterns đầy đủ.
