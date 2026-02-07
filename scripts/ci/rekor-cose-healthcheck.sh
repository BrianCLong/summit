#!/usr/bin/env bash
set -euo pipefail

REKOR_URL=${REKOR_URL:-}
REKOR_MALFORMED_TEST=${REKOR_MALFORMED_TEST:-false}
REKOR_HEALTHCHECK_CONFIRM=${REKOR_HEALTHCHECK_CONFIRM:-false}

if [[ -z "$REKOR_URL" ]]; then
  echo "REKOR_URL is required" >&2
  exit 1
fi

if [[ "$REKOR_MALFORMED_TEST" != "true" || "$REKOR_HEALTHCHECK_CONFIRM" != "true" ]]; then
  echo "Malformed COSE entry test skipped. Set REKOR_MALFORMED_TEST=true and REKOR_HEALTHCHECK_CONFIRM=true to run." >&2
  exit 0
fi

payload='{"apiVersion":"0.0.1","kind":"cose","spec":{"data":"bm90LWEtY29zZS1wYXlsb2Fk"}}'
status=$(curl -sS -o /dev/null -w "%{http_code}" \
  -X POST "${REKOR_URL%/}/api/v1/log/entries" \
  -H "Content-Type: application/json" \
  --data "$payload" || true)

if [[ "$status" == "500" ]]; then
  echo "Rekor returned 500 for malformed COSE entry (potential panic)." >&2
  exit 1
fi

if [[ "$status" =~ ^2 ]]; then
  echo "Rekor accepted malformed COSE entry unexpectedly (status ${status})." >&2
  exit 1
fi

echo "Malformed COSE entry check completed with status ${status}."
