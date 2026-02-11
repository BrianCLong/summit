#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/ga/verify-prompt-00-evidence-bundle.sh --run-id YYYYMMDD-HHMM
  scripts/ga/verify-prompt-00-evidence-bundle.sh --dir artifacts/ga-discovery/YYYYMMDD-HHMM

Validates required Prompt #00 evidence bundle files and minimal content checks.
USAGE
}

RUN_ID=""
TARGET_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --run-id)
      RUN_ID="${2:-}"
      shift 2
      ;;
    --dir)
      TARGET_DIR="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -n "${RUN_ID}" && -n "${TARGET_DIR}" ]]; then
  echo "Specify only one of --run-id or --dir" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [[ -n "${RUN_ID}" ]]; then
  TARGET_DIR="${ROOT_DIR}/artifacts/ga-discovery/${RUN_ID}"
fi

if [[ -z "${TARGET_DIR}" ]]; then
  echo "Missing target bundle. Provide --run-id or --dir." >&2
  usage >&2
  exit 1
fi

if [[ ! -d "${TARGET_DIR}" ]]; then
  echo "Bundle directory not found: ${TARGET_DIR}" >&2
  exit 1
fi

required_files=(
  "manifest.json"
  "uef.json"
  "summary.md"
  "architecture.md"
  "implementation-plan.md"
  "test-plan.md"
  "docs-plan.md"
  "cicd-gates.md"
  "pr-package.md"
  "future-roadmap.md"
  "ga-checklist.md"
)

missing=0
for file in "${required_files[@]}"; do
  if [[ ! -s "${TARGET_DIR}/${file}" ]]; then
    echo "missing_or_empty: ${file}" >&2
    missing=1
  fi
done

if [[ "${missing}" -ne 0 ]]; then
  exit 1
fi

# Validate JSON payloads for structural sanity.
node -e "const fs=require('fs'); JSON.parse(fs.readFileSync(process.argv[1],'utf8')); JSON.parse(fs.readFileSync(process.argv[2],'utf8'));" \
  "${TARGET_DIR}/manifest.json" \
  "${TARGET_DIR}/uef.json"

# Verify expected prompt id in manifest.
if ! rg -q '"prompt"\s*:\s*"00-feature-discovery-ga-orchestration"' "${TARGET_DIR}/manifest.json"; then
  echo "manifest_prompt_mismatch: expected 00-feature-discovery-ga-orchestration" >&2
  exit 1
fi

echo "Prompt #00 evidence bundle verified:"
echo "  ${TARGET_DIR}"
