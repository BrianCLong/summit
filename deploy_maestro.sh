#!/usr/bin/env bash
set -euo pipefail

# Deploy Maestro UI via container behind Nginx on a remote host.
# Wraps start-maestro-dev.sh and performs post-deploy verifications, writing evidence JSON.

usage() {
  cat <<USAGE
Usage: $(basename "$0") \
  --host HOST \
  --user USER \
  --key PATH \
  --server-name NAME \
  --image IMAGE \
  [--ghcr-username USER --ghcr-token TOKEN] \
  [--port 8080] [--health-path /healthz] [--pull]

Example:
  $(basename "$0") \
    --host maestro-dev.topicality.co \
    --user deployer \
    --key ~/.ssh/deployer_rsa \
    --server-name maestro-dev.topicality.co \
    --image ghcr.io/<org>/maestro@sha256:<digest> \
    --ghcr-username "\$GHCR_USERNAME" \
    --ghcr-token "\$GHCR_TOKEN" \
    --port 8080 \
    --health-path /healthz \
    --pull
USAGE
}

HOST=""; USERNAME=""; KEY=""; SERVER_NAME=""; IMAGE=""; PORT="8080"; HEALTH_PATH="/healthz"; PULL=0
GHCR_USERNAME=""; GHCR_TOKEN=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host) HOST="$2"; shift 2;;
    --user) USERNAME="$2"; shift 2;;
    --key) KEY="$2"; shift 2;;
    --server-name) SERVER_NAME="$2"; shift 2;;
    --image) IMAGE="$2"; shift 2;;
    --ghcr-username) GHCR_USERNAME="$2"; shift 2;;
    --ghcr-token) GHCR_TOKEN="$2"; shift 2;;
    --port) PORT="$2"; shift 2;;
    --health-path) HEALTH_PATH="$2"; shift 2;;
    --pull) PULL=1; shift;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown arg: $1" >&2; usage; exit 1;;
  esac
done

[[ -z "$HOST" || -z "$SERVER_NAME" || -z "$IMAGE" ]] && { echo "Missing required args" >&2; usage; exit 1; }
[[ -z "${USERNAME}" || -z "${KEY}" ]] && echo "ℹ️  No --user/--key provided, relying on SSH agent if available" >&2

# Expand ~ in KEY if present
if [[ -n "${KEY}" && "$KEY" == ~* ]]; then KEY="${KEY/#~/$HOME}"; fi

echo "🚀 Deploying Maestro to ${HOST} with image ${IMAGE}"

CMD=("./start-maestro-dev.sh" "--host" "$HOST" "--server-name" "$SERVER_NAME" "--image" "$IMAGE" "--port" "$PORT" "--health-path" "$HEALTH_PATH")
[[ -n "$USERNAME" ]] && CMD+=("--user" "$USERNAME")
[[ -n "$KEY" ]] && CMD+=("--key" "$KEY")
[[ -n "$GHCR_USERNAME" ]] && CMD+=("--ghcr-username" "$GHCR_USERNAME")
[[ -n "$GHCR_TOKEN" ]] && CMD+=("--ghcr-token" "$GHCR_TOKEN")
[[ "$PULL" -eq 1 ]] && CMD+=("--pull")

# Ensure script exists
if [[ ! -x ./start-maestro-dev.sh ]]; then
  echo "❌ start-maestro-dev.sh not found or not executable" >&2
  exit 1
fi

echo "▶️  Running: ${CMD[*]}"
"${CMD[@]}"

echo "🔍 Verifying endpoints via HTTPS"

set +e
CODE_UI=$(curl -s -o /dev/null -w "%{http_code}" "https://${HOST}/maestro")
CODE_MANIFEST=$(curl -s -o /dev/null -w "%{http_code}" "https://${HOST}/maestro/build-manifest.json")
CODE_API=$(curl -s -o /dev/null -w "%{http_code}" "https://${HOST}/api/maestro/v1/health")
REDIRECT_HEADERS=$(curl -sI "https://${HOST}/" | awk '/^HTTP|^location:/')
set -e

STATUS="pass"
if [[ "$CODE_UI" != "200" || "$CODE_MANIFEST" != "200" || "$CODE_API" != "200" ]]; then
  STATUS="fail"
fi

EPOCH=$(date +%s)
EVIDENCE="evidence.${HOST}.${EPOCH}.json"

cat > "$EVIDENCE" <<EOF
{
  "host": "${HOST}",
  "server_name": "${SERVER_NAME}",
  "image": "${IMAGE}",
  "port": "${PORT}",
  "health_path": "${HEALTH_PATH}",
  "timestamp": "$(date -Is)",
  "verifications": {
    "ui": {"path": "/maestro", "status": ${CODE_UI} },
    "manifest": {"path": "/maestro/build-manifest.json", "status": ${CODE_MANIFEST} },
    "api_health": {"path": "/api/maestro/v1/health", "status": ${CODE_API} },
    "root_redirect": $(printf '%s' "$REDIRECT_HEADERS" | jq -R -s 'split("\n")')
  },
  "result": "${STATUS}"
}
EOF

echo "📄 Evidence written: ${EVIDENCE}"

if [[ "$STATUS" != "pass" ]]; then
  echo "❌ One or more verification checks failed:" >&2
  echo "    UI:        ${CODE_UI}" >&2
  echo "    Manifest:  ${CODE_MANIFEST}" >&2
  echo "    API:       ${CODE_API}" >&2
  exit 2
fi

echo "✅ All verification gates passed"

