#!/bin/bash
# Copies the generated Growth OS Design System v2 files into the front (MIGRATION.md §2.1).
# Consume only: never edit packages/twenty-front/src/gos/* by hand; re-run this script instead.
set -euo pipefail
DS=${GOS_DS_DIR:-/workspace/projects/growth-os/design-system}
FRONT=$(cd "$(dirname "$0")/../packages/twenty-front" && pwd)
OUT=$FRONT/src/gos
mkdir -p "$OUT/generated" "$OUT/fonts"
for f in tokens.css crm-theme.mjs tokens.mjs tokens.email.json; do cp "$DS/generated/$f" "$OUT/generated/$f"; done
cp "$DS/fonts/Geist-Variable.woff2" "$DS/fonts/GeistMono-Variable.woff2" "$DS/fonts/LICENSE-Geist-OFL.txt" "$OUT/fonts/"
cp "$DS/icons/LICENSE-Lucide-ISC.txt" "$OUT/"
for f in favicon-512.png logo-light@2x.png logo-dark@2x.png; do cp "$DS/assets/$f" "$FRONT/public/images/growth-os/$f"; done
( cd "$DS" && git rev-parse --short HEAD 2>/dev/null || date +%F ) > "$OUT/DS-VERSION"
grep -o 'Design System v[0-9.]*' "$DS/generated/tokens.css" | head -1 >> "$OUT/DS-VERSION"
echo "synced DS into $OUT"
