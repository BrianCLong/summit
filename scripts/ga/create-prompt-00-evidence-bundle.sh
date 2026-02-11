#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  scripts/ga/create-prompt-00-evidence-bundle.sh [--run-id YYYYMMDD-HHMM] [--force]

Creates artifacts/ga-discovery/<run-id>/ with the required Prompt #00 evidence files.
USAGE
}

RUN_ID="$(date +%Y%m%d-%H%M)"
FORCE="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --run-id)
      RUN_ID="${2:-}"
      shift 2
      ;;
    --force)
      FORCE="true"
      shift
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

if [[ -z "${RUN_ID}" ]]; then
  echo "run-id cannot be empty" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="${ROOT_DIR}/artifacts/ga-discovery/${RUN_ID}"

if [[ -e "${OUT_DIR}" && "${FORCE}" != "true" ]]; then
  echo "Output directory already exists: ${OUT_DIR}" >&2
  echo "Re-run with --force to overwrite manifest/template files." >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"

cat > "${OUT_DIR}/manifest.json" <<EOF
{"run_id":"${RUN_ID}","prompt":"00-feature-discovery-ga-orchestration","status":"started"}
EOF

cat > "${OUT_DIR}/uef.json" <<'EOF'
{
  "evidence": [],
  "notes": "Populate raw evidence before any narrative."
}
EOF

for file in summary.md architecture.md implementation-plan.md test-plan.md docs-plan.md cicd-gates.md pr-package.md future-roadmap.md ga-checklist.md; do
  title="${file%.md}"
  printf "# %s\n\nTODO: fill this section.\n" "${title}" > "${OUT_DIR}/${file}"
done

echo "Created Prompt #00 evidence bundle scaffold:"
echo "  ${OUT_DIR}"
