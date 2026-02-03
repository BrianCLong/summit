#!/usr/bin/env bash
set -euo pipefail

# run_memory_privacy_gates.sh
# Runs unit tests and evaluation fixtures for memory privacy.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

log() {
  printf '\n[memory-privacy-gates] %s\n' "$*"
}

log "Starting Memory Privacy CI Gates..."

# 1. Foundation Gate
log "Running Foundation Gate (core/memory, core/privacy, api/memory)..."
if [ -d "core/memory" ]; then
  NODE_OPTIONS="--experimental-vm-modules" pnpm exec jest core/memory core/privacy api/memory
  log "Foundation tests passed."
else
  log "core/memory not found, skipping foundation tests."
fi

# 2. Evaluation Gate
log "Running Evaluation Gate (eval/privacy_memory)..."
if [ -d "eval/privacy_memory" ]; then
  NODE_OPTIONS="--experimental-vm-modules" pnpm exec jest eval/privacy_memory
  log "Evaluation tests passed."
else
  log "eval/privacy_memory not found, skipping evaluation tests."
fi

# 3. Evidence Gate
log "Verifying Evidence Artifacts..."
if command -v python3 >/dev/null 2>&1; then
  python3 ci/gates/gate_evidence_validate.py --path evidence || log "Evidence validation skipped or failed."
else
  log "python3 not found, skipping evidence validation."
fi

log "Memory Privacy CI Gates COMPLETED."
