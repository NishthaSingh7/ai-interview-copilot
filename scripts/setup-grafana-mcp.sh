#!/usr/bin/env bash
# Create a Grafana service account token and write .cursor/mcp.json for Cursor.
# Requires: local Grafana (observability stack), curl, python3, OrbStack/docker.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GRAFANA_URL="${GRAFANA_URL:-http://localhost:3000}"
DOCKER_GRAFANA_URL="${DOCKER_GRAFANA_URL:-http://host.docker.internal:3000}"
GRAFANA_USER="${GRAFANA_USER:-admin}"
GRAFANA_PASS="${GRAFANA_PASS:-admin}"
SA_NAME="${GRAFANA_MCP_SA_NAME:-cursor-mcp}"
TOKEN_NAME="${GRAFANA_MCP_TOKEN_NAME:-cursor-mcp-token}"

export PATH="${HOME}/.orbstack/bin:${PATH}"

if ! curl -fsS -u "${GRAFANA_USER}:${GRAFANA_PASS}" "${GRAFANA_URL}/api/health" >/dev/null; then
  echo "Grafana is not reachable at ${GRAFANA_URL}"
  echo "Start the stack first: cd observability && docker compose up -d"
  exit 1
fi

SA_ID="$(
  curl -fsS -u "${GRAFANA_USER}:${GRAFANA_PASS}" \
    "${GRAFANA_URL}/api/serviceaccounts/search?query=${SA_NAME}" \
    | python3 -c "
import sys, json
data = json.load(sys.stdin)
for sa in data.get('serviceAccounts', []):
    if sa.get('name') == '${SA_NAME}':
        print(sa['id'])
        break
"
)"

if [[ -z "${SA_ID}" ]]; then
  SA_ID="$(
    curl -fsS -u "${GRAFANA_USER}:${GRAFANA_PASS}" \
      -X POST "${GRAFANA_URL}/api/serviceaccounts" \
      -H "Content-Type: application/json" \
      -d "{\"name\":\"${SA_NAME}\",\"role\":\"Viewer\",\"isDisabled\":false}" \
      | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])"
  )"
  echo "Created service account '${SA_NAME}' (id=${SA_ID})"
else
  echo "Using existing service account '${SA_NAME}' (id=${SA_ID})"
fi

TOKEN_KEY="$(
  curl -fsS -u "${GRAFANA_USER}:${GRAFANA_PASS}" \
    -X POST "${GRAFANA_URL}/api/serviceaccounts/${SA_ID}/tokens" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${TOKEN_NAME}-$(date +%s)\"}" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['key'])"
)"

mkdir -p "${ROOT}/.cursor"
DOCKER_GRAFANA_URL="${DOCKER_GRAFANA_URL}"
python3 - "${ROOT}/.cursor/mcp.json" "${TOKEN_KEY}" "${DOCKER_GRAFANA_URL}" <<'PY'
import json, sys
out, token, docker_url = sys.argv[1], sys.argv[2], sys.argv[3]
config = {
    "mcpServers": {
        "grafana": {
            "command": "docker",
            "args": [
                "run", "--rm", "-i",
                "-e", "GRAFANA_URL",
                "-e", "GRAFANA_SERVICE_ACCOUNT_TOKEN",
                "grafana/mcp-grafana",
                "-t", "stdio",
            ],
            "env": {
                "GRAFANA_URL": docker_url,
                "GRAFANA_SERVICE_ACCOUNT_TOKEN": token,
            },
        }
    }
}
with open(out, "w", encoding="utf-8") as f:
    json.dump(config, f, indent=2)
    f.write("\n")
PY

echo "Wrote ${ROOT}/.cursor/mcp.json"
echo ""
echo "Next steps in Cursor:"
echo "  1. Cursor → Settings → Tools & Integrations → MCP"
echo "  2. Enable the 'grafana' server (green indicator)"
echo "  3. In Composer, ask: 'List my Grafana datasources'"
