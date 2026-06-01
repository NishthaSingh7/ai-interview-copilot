#!/usr/bin/env bash
# Paste Railway secrets into GitHub — NO Railway CLI (avoids wrong project / new projects).
#
# ONLY project: soothing-creativity
# ONLY service: ai-interview-copilot
# NEVER run: railway init, railway new, railway link, railway up
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GH="${GH_BIN:-gh}"
command -v "$GH" >/dev/null || GH="$REPO_ROOT/.tools/gh_2.93.0_macOS_arm64/bin/gh"

echo "==> GitHub CLI..."
"$GH" auth status >/dev/null || { echo "Run: gh auth login"; exit 1; }

echo ""
echo "Railway project: soothing-creativity"
echo "Service: ai-interview-copilot (root directory: backend)"
echo ""
echo "Paste Railway PROJECT token (soothing-creativity → Settings → Tokens):"
read -rs RAILWAY_TOKEN
echo ""

echo "Paste RAILWAY_SERVICE_ID (ai-interview-copilot → Settings → Service ID):"
read -r RAILWAY_SERVICE_ID

printf '%s' "$RAILWAY_TOKEN" | "$GH" secret set RAILWAY_TOKEN
printf '%s' "$RAILWAY_SERVICE_ID" | "$GH" secret set RAILWAY_SERVICE_ID

echo "Done."
"$GH" secret list | grep RAILWAY || true
