#!/usr/bin/env bash
set -euo pipefail
THRESHOLD="${THRESHOLD:-95}"

cd "$(dirname "$0")/.."
WS_BASE="${1:-staging}"
WS_CMP="${2:-preprod}"

collect() {
  local ws="$1"
  terraform workspace select "$ws" >/dev/null 2>&1 || terraform workspace new "$ws" >/dev/null
  terraform providers lock -platform=linux_amd64 >/dev/null 2>&1 || true
  terraform state list 2>/dev/null | wc -l | tr -d ' ' > "/tmp/${ws}.count" || echo 0 > "/tmp/${ws}.count"
  terraform providers | awk '/provider\[registry.terraform.io\//{print $2}' | sort -u > "/tmp/${ws}.providers"
  # Example tag check via plan: ensure required_tags appear in all resources (adapt to your modules)
  echo 1 > "/tmp/${ws}.tags"  # stub: set to 0 if missing required tags after custom checks
}

pushd infra >/dev/null
terraform init -upgrade=false >/dev/null
collect "$WS_BASE"
collect "$WS_CMP"
popd >/dev/null

COUNT_BASE=$(cat "/tmp/${WS_BASE}.count")
COUNT_CMP=$(cat "/tmp/${WS_CMP}.count")

# Parity score: min/ max *100, further reduced if tags/providers diverge
base=$(( COUNT_BASE > COUNT_CMP ? COUNT_CMP : COUNT_BASE ))
max=$(( COUNT_BASE > COUNT_CMP ? COUNT_BASE : COUNT_CMP ))
score=$(( max == 0 ? 100 : (100 * base / max) ))

# Provider parity (rough check)
if ! diff -q "/tmp/${WS_BASE}.providers" "/tmp/${WS_CMP}.providers" >/dev/null; then
  score=$(( score - 3 ))
fi

# Tag parity placeholder (wire in your org’s checks)
if [[ "$(cat /tmp/${WS_BASE}.tags)" != "1" || "$(cat /tmp/${WS_CMP}.tags)" != "1" ]]; then
  score=$(( score - 2 ))
fi

echo "parity=${score}"
if (( score < THRESHOLD )); then
  echo "Parity ${score}% below threshold ${THRESHOLD}%"
  exit 1
fi
