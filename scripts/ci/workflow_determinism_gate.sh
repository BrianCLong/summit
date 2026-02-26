#!/usr/bin/env bash
################################################################################
# Workflow Determinism Gate
#
# Purpose: Ensures that workflow validation produces deterministic artifacts.
#          report.json and metrics.json must be identical across runs.
#          stamp.json is expected to differ (contains timestamps).
################################################################################

set -euo pipefail

readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly NC='\033[0m'

log_info() { echo -e "[INFO] $*"; }
log_success() { echo -e "${GREEN}[✓]${NC} $*"; }
log_error() { echo -e "${RED}[✗]${NC} $*"; }

# Setup
readonly TEST_TARGET="summit/workflow"
readonly OUT_BASE="artifacts/test/workflow-determinism"
readonly OUT1="${OUT_BASE}/run1"
readonly OUT2="${OUT_BASE}/run2"

mkdir -p "$OUT_BASE"

# Find python
PYTHON_EXE="python3"
if [ -f ".venv/bin/python" ]; then
    PYTHON_EXE=".venv/bin/python"
fi

log_info "Using python: $PYTHON_EXE"

# Run 1
log_info "Executing Run 1..."
PYTHONPATH=. $PYTHON_EXE summit/workflow/cli.py validate "$TEST_TARGET" --output "$OUT1" --run-id "test-deterministic-run"

# Run 2
log_info "Executing Run 2..."
PYTHONPATH=. $PYTHON_EXE summit/workflow/cli.py validate "$TEST_TARGET" --output "$OUT2" --run-id "test-deterministic-run"

# Comparison
log_info "Comparing artifacts for determinism..."

# 1. report.json
if diff "$OUT1/report.json" "$OUT2/report.json" > /dev/null; then
    log_success "report.json is deterministic"
else
    log_error "report.json differs between runs!"
    diff -u "$OUT1/report.json" "$OUT2/report.json"
    exit 1
fi

# 2. metrics.json
if diff "$OUT1/metrics.json" "$OUT2/metrics.json" > /dev/null; then
    log_success "metrics.json is deterministic"
else
    log_error "metrics.json differs between runs!"
    diff -u "$OUT1/metrics.json" "$OUT2/metrics.json"
    exit 1
fi

# 3. stamp.json should exist but we don't compare it for equality (except maybe structure)
if [ -f "$OUT1/stamp.json" ] && [ -f "$OUT2/stamp.json" ]; then
    log_success "stamp.json artifacts produced"
else
    log_error "stamp.json missing!"
    exit 1
fi

log_success "Workflow determinism gate passed! ✨"
