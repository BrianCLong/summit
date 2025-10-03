#!/usr/bin/env bash
set -euo pipefail

usage() { echo "Usage: $0 [--check] [--reverse]"; exit 2; }
CHECK=0; REVERSE=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --check) CHECK=1 ;;
    --reverse) REVERSE=1 ;;
    -h|--help) usage ;;
    *) echo "Unknown arg: $1"; usage ;;
  esac; shift
done

PATCH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATCHES=($(ls -1 "${PATCH_DIR}"/*.patch 2>/dev/null || true))

echo "IntelGraph Platform - Patch Application Script"
echo "==============================================="
if [[ ${#PATCHES[@]} -eq 0 ]]; then
  echo "No patches found. Nothing to do. ✅"
  exit 0
fi

# Validate each patch is a valid unified diff (quick heuristic)
validate_patch() {
  local p="$1"
  if ! grep -qE '^(--- |\-\-\- a/|diff --git a/)' "$p"; then
    echo "⚠️  Skipping suspicious patch (not unified diff): $(basename "$p")"
    return 1
  fi
  return 0
}

APPLY_FLAGS=(--3way)
[[ $CHECK -eq 1 ]] && APPLY_FLAGS+=(--check)
[[ $REVERSE -eq 1 ]] && APPLY_FLAGS+=(-R)

FAILED=0
for p in "${PATCHES[@]}"; do
  echo "Checking patch: $(basename "$p")"
  if ! validate_patch "$p"; then
    FAILED=1; continue
  fi
  if ! git apply "${APPLY_FLAGS[@]}" "$p"; then
    echo "❌ git apply failed for $(basename "$p")"
    FAILED=1
  else
    echo "✅ $( [[ $CHECK -eq 1 ]] && echo 'Applicable' || echo 'Applied' ): $(basename "$p")"
  fi
done

if [[ $FAILED -eq 1 ]]; then
  echo "Some patches failed. See messages above."
  exit 1
fi