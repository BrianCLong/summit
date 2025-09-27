#!/usr/bin/env bash
set -euo pipefail

URL=${1:-}
TIMEOUT=${2:-60}
if [[ -z "$URL" ]]; then
  echo "Usage: $0 <url> [timeout_seconds]" >&2
  exit 2
fi

echo "Waiting for $URL (timeout: ${TIMEOUT}s)"
end=$((SECONDS + TIMEOUT))
while (( SECONDS < end )); do
  if curl -fsS "$URL" >/dev/null; then
    echo "Service at $URL is ready"
    exit 0
  fi
  sleep 5
  echo "Still waiting..."
done

echo "::error::Service $URL did not become ready within ${TIMEOUT}s" >&2
exit 1
