#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/ga/create-prompt-00-evidence-bundle.sh [--run-id YYYYMMDD-HHMM]

Creates Prompt #00 GA evidence bundle under:
  docs/evidence/ga-hardening/prompt-00/<RUN_ID>/
USAGE
}

RUN_ID="$(date -u +%Y%m%d-%H%M)"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --run-id)
      RUN_ID="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$RUN_ID" ]]; then
  echo "RUN_ID must not be empty" >&2
  exit 1
fi

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"

OUT_DIR="docs/evidence/ga-hardening/prompt-00/${RUN_ID}"
mkdir -p "$OUT_DIR"

CANONICAL_PROMPT="prompts/ga/feature-discovery-ga-development@v1.md"
REGISTRY_FILE="prompts/registry.yaml"
STATUS_FILE="docs/roadmap/STATUS.json"

if [[ ! -f "$CANONICAL_PROMPT" ]]; then
  echo "Missing canonical prompt: $CANONICAL_PROMPT" >&2
  exit 1
fi

if [[ ! -f "$REGISTRY_FILE" ]]; then
  echo "Missing registry file: $REGISTRY_FILE" >&2
  exit 1
fi

PROMPT_HASH="$(shasum -a 256 "$CANONICAL_PROMPT" | awk '{print $1}')"

CHECK_FAILS=0

run_check() {
  local name="$1"
  local cmd="$2"
  local out="$3"
  if bash -lc "$cmd" >"$out" 2>&1; then
    echo "pass"
  else
    CHECK_FAILS=$((CHECK_FAILS + 1))
    echo "fail"
  fi
}

PROMPT_STATUS="$(run_check "prompt-integrity" \
  "pnpm exec tsx scripts/ci/verify-prompt-integrity.ts --prompt-hash ${PROMPT_HASH} --diff-base HEAD" \
  "${OUT_DIR}/prompt-integrity.txt")"

BOUNDARY_STATUS="$(run_check "boundaries" \
  "node scripts/check-boundaries.cjs" \
  "${OUT_DIR}/boundaries.txt")"

STATUS_JSON_STATUS="$(run_check "status-json" \
  "node -e \"JSON.parse(require('fs').readFileSync('${STATUS_FILE}','utf8')); console.log('STATUS.json valid')\"" \
  "${OUT_DIR}/status-json.txt")"

cat >"${OUT_DIR}/commands.txt" <<EOF
pnpm exec tsx scripts/ci/verify-prompt-integrity.ts --prompt-hash ${PROMPT_HASH} --diff-base HEAD
node scripts/check-boundaries.cjs
node -e "JSON.parse(require('fs').readFileSync('${STATUS_FILE}','utf8')); console.log('STATUS.json valid')"
EOF

node -e '
const fs = require("fs");
const path = process.argv[1];
const data = {
  run_id: process.argv[2],
  generated_at_utc: new Date().toISOString(),
  git_head: process.argv[3],
  canonical_prompt: process.argv[4],
  prompt_hash_sha256: process.argv[5],
  checks: {
    prompt_integrity: process.argv[6],
    boundaries: process.argv[7],
    status_json: process.argv[8]
  }
};
fs.writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
' "${OUT_DIR}/manifest.json" \
  "$RUN_ID" \
  "$(git rev-parse HEAD)" \
  "$CANONICAL_PROMPT" \
  "$PROMPT_HASH" \
  "$PROMPT_STATUS" \
  "$BOUNDARY_STATUS" \
  "$STATUS_JSON_STATUS"

echo "Created Prompt #00 evidence bundle: ${OUT_DIR}"
echo "Prompt hash: ${PROMPT_HASH}"

if [[ "$CHECK_FAILS" -gt 0 ]]; then
  echo "One or more checks failed (${CHECK_FAILS}). See bundle outputs." >&2
  exit 1
fi

