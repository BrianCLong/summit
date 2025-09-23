#!/usr/bin/env bash
set -euo pipefail
if ! command -v prism >/dev/null 2>&1; then
  echo "Prism CLI not found. Install: npm i -g @stoplight/prism-cli" >&2
  exit 1
fi
SPEC=${1:-openapi/export.yaml}
PORT=${PORT:-4010}
echo "Mocking $SPEC on http://127.0.0.1:$PORT"
exec prism mock "$SPEC" -h 127.0.0.1 -p "$PORT"

