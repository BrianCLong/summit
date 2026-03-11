#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:4000}"
GRAPHQL_URL="${GRAPHQL_URL:-${API_BASE_URL}/api/graphql}"
INGEST_URL="${INGEST_URL:-${API_BASE_URL}/api/ingest/batch}"
WEB_URL="${WEB_URL:-http://localhost:3000}"
NEO4J_URL="${NEO4J_URL:-http://localhost:7474/browser}"
DATASET_DIR="${DATASET_DIR:-datasets/demo}"

print_banner() {
  cat <<'BANNER'
=====================================
  Summit WOW Demo - Zero to Insight
  (runs in ~60-180s on a healthy dev stack)
=====================================
BANNER
}

open_url() {
  local url="$1"
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 || true
  else
    echo "No browser opener available; open manually: $url"
  fi
}

wait_for_health() {
  local url="$1"
  local attempts=30
  local delay_s=2

  for ((i = 1; i <= attempts; i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$delay_s"
  done

  return 1
}

try_start_stack() {
  if curl -fsS "${API_BASE_URL}/health" >/dev/null 2>&1; then
    return 0
  fi

  echo "API is not reachable at ${API_BASE_URL}."
  if [[ -x "./scripts/golden-path.sh" ]]; then
    echo "Starting local stack via ./scripts/golden-path.sh ..."
    ./scripts/golden-path.sh || true
  else
    echo "golden-path script not found; skipping auto-start."
  fi

  if ! wait_for_health "${API_BASE_URL}/health"; then
    echo "Warning: API health endpoint did not become ready. Demo will continue with best-effort calls."
  fi
}

ingest_demo_files() {
  local count=0

  shopt -s nullglob
  for file in "${DATASET_DIR}"/*.jsonl "${DATASET_DIR}"/*.csv; do
    count=$((count + 1))
    echo "→ Ingesting ${file}"
    if ! curl -fsS -X POST "${INGEST_URL}" \
      -H "Content-Type: multipart/form-data" \
      -F "file=@${file}" >/dev/null; then
      echo "  Warning: ingest failed for ${file}; continuing."
    fi
  done
  shopt -u nullglob

  if [[ $count -eq 0 ]]; then
    echo "No dataset files found in ${DATASET_DIR}."
    return 1
  fi

  return 0
}

trigger_agent_swarm() {
  echo "→ Triggering demo agent swarm"
  curl -fsS -X POST "${GRAPHQL_URL}" \
    -H "Content-Type: application/json" \
    -d '{"query":"mutation RunDemoSwarm { runAgentSwarm(input: { query: \"Investigate Acme Corp\", targetEntity: \"ent_001\" }) { id status reportUrl } }"}' \
    || echo "Warning: demo swarm mutation failed; verify GraphQL schema or endpoint."
}

main() {
  print_banner
  try_start_stack

  echo "→ Ingesting bundled demo datasets from ${DATASET_DIR}"
  ingest_demo_files || true

  trigger_agent_swarm

  echo "→ Opening local dashboards"
  open_url "${WEB_URL}/dashboard/reports"
  open_url "${NEO4J_URL}"

  echo "Done. Explore the report view and graph for provenance-rich results."
}

main "$@"
