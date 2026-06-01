#!/usr/bin/env bash
# Railway-only: login, link backend, set RAILWAY_TOKEN + RAILWAY_SERVICE_ID on GitHub.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GH="${GH_BIN:-gh}"
command -v "$GH" >/dev/null || GH="$REPO_ROOT/.tools/gh_2.93.0_macOS_arm64/bin/gh"

echo "==> Railway login (complete in browser if it opens)..."
railway whoami >/dev/null 2>&1 || railway login

echo "==> Link this repo backend to your Railway project..."
cd "$REPO_ROOT/backend"
railway link

echo "==> Reading service id from railway status..."
SVC_ID="$(railway status --json 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
# service id from status json
for k in ('serviceId','service','id'):
    if isinstance(d.get(k), str) and len(d[k])>30:
        print(d[k]); break
else:
    s=d.get('services',{})
    if isinstance(s, dict) and s:
        print(list(s.keys())[0])
    elif isinstance(s, list) and s:
        print(s[0].get('id',''))
" 2>/dev/null || true)"

if [ -z "${SVC_ID:-}" ]; then
  echo "Paste RAILWAY_SERVICE_ID (Railway → backend service → Settings):"
  read -r SVC_ID
else
  echo "Service ID: $SVC_ID"
fi

echo ""
echo "Paste Railway PROJECT token (Project → Settings → Tokens → Create):"
read -rs RAILWAY_TOKEN
echo ""

printf '%s' "$RAILWAY_TOKEN" | "$GH" secret set RAILWAY_TOKEN
printf '%s' "$SVC_ID" | "$GH" secret set RAILWAY_SERVICE_ID

echo "Done. Railway secrets:"
"$GH" secret list | grep RAILWAY || true
