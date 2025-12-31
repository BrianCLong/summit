#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
DOC_DIR="$ROOT_DIR/docs/governance"
SCRIPT_DIR="$ROOT_DIR/scripts/learning"

missing=0

declare -a required_docs=(
  "LEARNING_INVENTORY.md"
  "LEARNING_LIFECYCLE.md"
  "EVALUATION_GATES.md"
  "DRIFT_AND_RECERT.md"
  "AUDITABILITY.md"
  "GOVERNANCE_CADENCE.md"
)

for doc in "${required_docs[@]}"; do
  path="$DOC_DIR/$doc"
  if [[ ! -f "$path" ]]; then
    echo "[learning-change] Missing document: $path" >&2
    missing=1
  elif ! grep -q "#" "$path"; then
    echo "[learning-change] Document lacks heading: $path" >&2
    missing=1
  fi
done

if [[ ! -x "$SCRIPT_DIR/promote_artifact.sh" ]]; then
  echo "[learning-change] Promotion script missing or not executable: $SCRIPT_DIR/promote_artifact.sh" >&2
  missing=1
fi

if [[ ! -x "$SCRIPT_DIR/rollback_artifact.sh" ]]; then
  echo "[learning-change] Rollback script missing or not executable: $SCRIPT_DIR/rollback_artifact.sh" >&2
  missing=1
fi

if [[ $missing -ne 0 ]]; then
  echo "[learning-change] Governance assets are incomplete." >&2
  exit 1
fi

echo "[learning-change] Governance assets verified."
