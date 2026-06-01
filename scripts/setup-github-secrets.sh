#!/usr/bin/env bash
# One-time setup: push deploy secrets to GitHub Actions.
# Requires: gh (logged in), railway CLI (logged in), netlify CLI (logged in)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

GH="${GH_BIN:-gh}"
if ! command -v "$GH" >/dev/null 2>&1; then
  GH="$REPO_ROOT/.tools/gh_2.93.0_macOS_arm64/bin/gh"
fi

echo "==> Checking GitHub CLI..."
"$GH" auth status >/dev/null || { echo "Run: gh auth login"; exit 1; }

echo "==> Railway login (browser opens if needed)..."
railway whoami >/dev/null 2>&1 || railway login

echo "==> Netlify login (browser opens if needed)..."
netlify status >/dev/null 2>&1 || netlify login

echo ""
echo "Paste your Railway PROJECT token (Settings → Tokens → Create token):"
read -rs RAILWAY_TOKEN
echo ""

echo "Paste your Railway SERVICE ID (backend service → Settings, UUID):"
read -r RAILWAY_SERVICE_ID

NETLIFY_SITE_ID="$(netlify sites:list --json 2>/dev/null | python3 -c "
import json,sys
sites=json.load(sys.stdin)
if not sites:
    sys.exit(1)
# prefer site name containing interview
for s in sites:
    n=(s.get('name') or '').lower()
    if 'interview' in n or 'copilot' in n:
        print(s['id']); sys.exit(0)
print(sites[0]['id'])
" 2>/dev/null || true)"

if [ -z "${NETLIFY_SITE_ID:-}" ]; then
  echo "Could not detect Netlify site. Paste NETLIFY_SITE_ID (Site configuration → Site information):"
  read -r NETLIFY_SITE_ID
else
  echo "Detected Netlify site id: $NETLIFY_SITE_ID"
fi

echo "Creating Netlify deploy token..."
NETLIFY_AUTH_TOKEN="$(netlify api createAccessToken "{\"description\":\"github-actions-deploy\"}" 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || true)"

if [ -z "${NETLIFY_AUTH_TOKEN:-}" ]; then
  echo "Create a token at: Netlify → User settings → Applications → Personal access tokens"
  echo "Paste NETLIFY_AUTH_TOKEN:"
  read -rs NETLIFY_AUTH_TOKEN
  echo ""
fi

echo "==> Saving secrets to GitHub..."
printf '%s' "$RAILWAY_TOKEN" | "$GH" secret set RAILWAY_TOKEN
printf '%s' "$RAILWAY_SERVICE_ID" | "$GH" secret set RAILWAY_SERVICE_ID
printf '%s' "$NETLIFY_AUTH_TOKEN" | "$GH" secret set NETLIFY_AUTH_TOKEN
printf '%s' "$NETLIFY_SITE_ID" | "$GH" secret set NETLIFY_SITE_ID

echo ""
echo "Done. Secrets set:"
"$GH" secret list
echo ""
echo "Next: GitHub → Actions → Deploy Production → Run workflow"
