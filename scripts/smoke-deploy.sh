#!/usr/bin/env bash
set -euo pipefail
URL=${1:?usage: $0 <base-url>}

curl -fsS "$URL/healthz" >/dev/null
curl -fsS "$URL/readyz" >/dev/null

echo "smoke ok"
