#!/usr/bin/env bash
# Sync shared infra (lib/components/api/scripts/env) từ canonical Mushy
# template về mini-app downstream. KHÔNG đụng vào App.jsx, App.css,
# migrations/, mushy.config.json, README.md của app.
#
# Usage:
#   1. Clone Mushy fresh về tạm:
#        git clone https://github.com/anhdqvn/mushy.git /tmp/mushy-latest
#   2. Trong project mini-app downstream, tạo branch:
#        git checkout -b sync-template-$(date +%Y%m%d)
#   3. Chạy:
#        bash scripts/sync-template.sh /tmp/mushy-latest/miniapp-template
#   4. Review:
#        git status; git diff
#   5. Test: npm install && npm run dev:setup && npm run dev
#   6. Push branch → PR vào dev → merge.

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <path-to-Mushy/miniapp-template>" >&2
  echo "Vd:   bash scripts/sync-template.sh /tmp/mushy-latest/miniapp-template" >&2
  exit 1
fi

TEMPLATE_DIR="$1"
if [ ! -f "$TEMPLATE_DIR/CLAUDE.md" ]; then
  echo "❌ $TEMPLATE_DIR không phải thư mục miniapp-template (thiếu CLAUDE.md)" >&2
  exit 1
fi

echo "→ Sync from $TEMPLATE_DIR"

# Shared infra paths — sync hoàn toàn (--delete trong rsync sẽ xoá file đã bỏ).
# Lưu ý: src/components KHÔNG sync toàn bộ, chỉ Dialog + Select (rest là app-specific).
declare -a FULL_DIRS=(
  "src/lib"
  "scripts"
)

declare -a SINGLE_FILES=(
  "src/components/Dialog.jsx"
  "src/components/Select.jsx"
  "api/_verify.js"
  ".env.example"
)

# Lib: sync toàn bộ (--delete để bỏ file template đã remove)
for d in "${FULL_DIRS[@]}"; do
  if [ -d "$TEMPLATE_DIR/$d" ]; then
    mkdir -p "$d"
    # KHÔNG sync sync-template.sh chính nó (vòng lặp tự sync mình)
    if [ "$d" = "scripts" ]; then
      rsync -av --exclude='sync-template.sh' "$TEMPLATE_DIR/$d/" "$d/"
    else
      rsync -av --delete "$TEMPLATE_DIR/$d/" "$d/"
    fi
    echo "  ✓ synced $d/"
  fi
done

# Single files
for f in "${SINGLE_FILES[@]}"; do
  if [ -f "$TEMPLATE_DIR/$f" ]; then
    mkdir -p "$(dirname "$f")"
    cp "$TEMPLATE_DIR/$f" "$f"
    echo "  ✓ synced $f"
  fi
done

# Special: CLAUDE.md — copy nhưng cảnh báo (downstream có thể đã custom)
if [ -f "$TEMPLATE_DIR/CLAUDE.md" ]; then
  if ! diff -q "$TEMPLATE_DIR/CLAUDE.md" CLAUDE.md > /dev/null 2>&1; then
    cp "$TEMPLATE_DIR/CLAUDE.md" CLAUDE.md
    echo "  ✓ updated CLAUDE.md (review diff if đã custom)"
  fi
fi

echo ""
echo "✓ Sync xong. Tiếp theo:"
echo "  git status"
echo "  git diff --stat"
echo "  npm install   # nếu package.json đổi (manual review trước!)"
echo "  npm run dev:setup && npm run dev"
echo ""
echo "⚠️  package.json + vite.config.js + vercel.json KHÔNG auto-sync."
echo "    Diff thủ công nếu nghe template có dep mới:"
echo "    diff $TEMPLATE_DIR/package.json package.json"
