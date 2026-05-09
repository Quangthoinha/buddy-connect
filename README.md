# Mini-app Template

Template repo để build mini-app trong hệ Mushy Super App.

## Quick start

```bash
cp .env.example .env
# điền VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_APP_SLUG

npm install
npm run dev:setup       # login + chọn workspace + ghi token vào .env
npm run dev             # localhost:5173
```

## Scripts

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Vite dev server, port 5173 |
| `npm run dev:setup` | Một lần: login Supabase, chọn/tạo workspace, ghi `VITE_DEV_*` |
| `npm run dev:token` | Refresh JWT (hết hạn sau 1 giờ) |
| `npm run dev:seed` | Insert sample data |
| `npm run build` | Build production |
| `npm run preview` | Preview build local |

## Layout & quy tắc

Đọc `CLAUDE.md` — đó là tài liệu chính cho mini-app này.

## Test trong Shell thật

1. `git push` branch → Vercel tạo Preview URL
2. Admin Portal: set `preview_url` cho app
3. Mở Expo Go → workspace → mini-app → load Preview URL
