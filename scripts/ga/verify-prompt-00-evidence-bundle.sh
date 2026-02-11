#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/ga/verify-prompt-00-evidence-bundle.sh --run-id YYYYMMDD-HHMM
  scripts/ga/verify-prompt-00-evidence-bundle.sh --dir docs/evidence/ga-hardening/prompt-00/<RUN_ID>
USAGE
}

RUN_ID=""
DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --run-id)
      RUN_ID="${2:-}"
      shift 2
      ;;
    --dir)
      DIR="${2:-}"
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

if [[ -n "$RUN_ID" && -n "$DIR" ]]; then
  echo "Use only one of --run-id or --dir" >&2
  exit 1
fi

if [[ -z "$RUN_ID" && -z "$DIR" ]]; then
  echo "Missing --run-id or --dir" >&2
  exit 1
fi

ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"

if [[ -z "$DIR" ]]; then
  DIR="docs/evidence/ga-hardening/prompt-00/${RUN_ID}"
fi

required_files=(
  "${DIR}/manifest.json"
  "${DIR}/commands.txt"
  "${DIR}/prompt-integrity.txt"
  "${DIR}/boundaries.txt"
  "${DIR}/status-json.txt"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing required file: $file" >&2
    exit 1
  fi
done

manifest_prompt_hash="$(node -e 'const fs=require("fs");const m=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(m.prompt_hash_sha256||"");' "${DIR}/manifest.json")"
manifest_prompt_path="$(node -e 'const fs=require("fs");const m=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(m.canonical_prompt||"");' "${DIR}/manifest.json")"

if [[ -z "$manifest_prompt_hash" || -z "$manifest_prompt_path" ]]; then
  echo "Manifest missing canonical_prompt or prompt_hash_sha256" >&2
  exit 1
fi

if [[ ! -f "$manifest_prompt_path" ]]; then
  echo "Canonical prompt from manifest does not exist: $manifest_prompt_path" >&2
  exit 1
fi

actual_hash="$(shasum -a 256 "$manifest_prompt_path" | awk '{print $1}')"
if [[ "$manifest_prompt_hash" != "$actual_hash" ]]; then
  echo "Prompt hash mismatch: manifest=$manifest_prompt_hash actual=$actual_hash" >&2
  exit 1
fi

if ! rg -q "sha256: ${manifest_prompt_hash}" prompts/registry.yaml; then
  echo "Prompt hash not found in prompts/registry.yaml: ${manifest_prompt_hash}" >&2
  exit 1
fi

if ! rg -q "Prompt integrity verified" "${DIR}/prompt-integrity.txt"; then
  echo "Prompt integrity output missing expected success marker" >&2
  exit 1
fi

if ! rg -q "No boundary violations found" "${DIR}/boundaries.txt"; then
  echo "Boundary output missing expected success marker" >&2
  exit 1
fi

if ! rg -q "STATUS.json valid" "${DIR}/status-json.txt"; then
  echo "STATUS.json validation output missing expected success marker" >&2
  exit 1
fi

echo "Prompt #00 evidence bundle verified: ${DIR}"

