#!/usr/bin/env bash
# CI gate: Cognitive Battlespace Map (CBM) checks
#
# Gates:
#   cbm_unit_tests       — pytest determinism + schema tests
#   cbm_determinism      — artifact determinism (two runs, diff output)
#   cbm_artifact_schema  — required fields present in artifacts
#   cbm_security_no_network — ensure replay mode has no network calls
#   cbm_perf_budget      — placeholder; enforced from PR2+ with metrics.json
#
# Usage:
#   ci/check_cbm.sh [--mode replay|live]
#
# Exit codes:
#   0 = all gates passed
#   1 = one or more gates failed (details in output)

set -euo pipefail

MODE="${1:-replay}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ARTIFACT_DIR="${REPO_ROOT}/artifacts/cbm"
EXIT_CODE=0

log() { echo "[check_cbm] $*"; }
fail() { echo "[check_cbm] FAIL: $*" >&2; EXIT_CODE=1; }
pass() { echo "[check_cbm] PASS: $*"; }

# ---------------------------------------------------------------------------
# Gate: cbm_unit_tests
# ---------------------------------------------------------------------------
log "--- gate: cbm_unit_tests ---"
if python -m pytest \
    "${REPO_ROOT}/summit/tests/test_cbm_determinism.py" \
    -v \
    --tb=short \
    --no-header \
    2>&1; then
  pass "cbm_unit_tests"
else
  fail "cbm_unit_tests — pytest exited non-zero"
fi

# ---------------------------------------------------------------------------
# Gate: cbm_determinism (two-run artifact diff)
# ---------------------------------------------------------------------------
log "--- gate: cbm_determinism ---"
RUN_A_DIR=$(mktemp -d)
RUN_B_DIR=$(mktemp -d)

python - <<PYEOF
import sys, json, hashlib, pathlib
sys.path.insert(0, "${REPO_ROOT}")
from summit.cbm import CBMConfig, DocumentEvent, run_cbm

events = [
    DocumentEvent(doc_id="ci-001", source="ci.test", text="CBM CI test event.", locale="en"),
]

cfg_a = CBMConfig(enabled=True, run_date="20260305", artifact_dir="${RUN_A_DIR}")
cfg_b = CBMConfig(enabled=True, run_date="20260305", artifact_dir="${RUN_B_DIR}")

run_cbm(list(events), cfg_a)
run_cbm(list(events), cfg_b)
PYEOF

DIFF_RESULT=0
for artifact in stamp.json narratives.json influence_graph.json data_void_risk.json ai_exposure.json; do
  A="${RUN_A_DIR}/${artifact}"
  B="${RUN_B_DIR}/${artifact}"
  if [ ! -f "${A}" ] || [ ! -f "${B}" ]; then
    fail "cbm_determinism — missing artifact: ${artifact}"
    DIFF_RESULT=1
    continue
  fi
  if ! diff -q "${A}" "${B}" > /dev/null 2>&1; then
    fail "cbm_determinism — artifact differs between runs: ${artifact}"
    diff "${A}" "${B}" || true
    DIFF_RESULT=1
  fi
done

rm -rf "${RUN_A_DIR}" "${RUN_B_DIR}"

if [ "${DIFF_RESULT}" -eq 0 ]; then
  pass "cbm_determinism"
fi

# ---------------------------------------------------------------------------
# Gate: cbm_artifact_schema
# ---------------------------------------------------------------------------
log "--- gate: cbm_artifact_schema ---"
if [ -f "${ARTIFACT_DIR}/stamp.json" ]; then
  python - <<PYEOF
import json, sys
stamp = json.loads(open("${ARTIFACT_DIR}/stamp.json").read())
required = {"config", "evidence_id", "input_count", "run_date", "run_hash", "status"}
missing = required - set(stamp.keys())
if missing:
    print(f"stamp.json missing fields: {missing}", file=sys.stderr)
    sys.exit(1)
evid = stamp["evidence_id"]
import re
if not re.match(r"^EVID-CBM-\d{8}-[0-9A-F]{8}-\d{4}$", evid):
    print(f"bad evidence_id format: {evid!r}", file=sys.stderr)
    sys.exit(1)
print("stamp.json schema ok")
PYEOF
  if [ $? -eq 0 ]; then
    pass "cbm_artifact_schema"
  else
    fail "cbm_artifact_schema — stamp.json schema validation failed"
  fi
else
  log "cbm_artifact_schema — no stamp.json at ${ARTIFACT_DIR}; skipping (run pipeline first)"
fi

# ---------------------------------------------------------------------------
# Gate: cbm_security_no_network (replay mode only)
# ---------------------------------------------------------------------------
log "--- gate: cbm_security_no_network ---"
if [ "${MODE}" = "replay" ]; then
  # In replay mode, CBM pipeline must not make outbound network calls.
  # Validation: run with network sandbox if available (CI enforces via firewall).
  # Heuristic check: ensure llm_probe_enabled and hybrid_correlation_enabled are
  # both False in replay mode (enforced by CBMConfig defaults).
  python - <<PYEOF
import sys
sys.path.insert(0, "${REPO_ROOT}")
from summit.cbm import CBMConfig
cfg = CBMConfig(enabled=True, run_date="19700101")
assert not cfg.llm_probe_enabled, "llm_probe_enabled must be False in replay mode"
assert not cfg.hybrid_correlation_enabled, "hybrid_correlation_enabled must be False in replay mode"
print("network-sensitive flags are OFF (replay mode ok)")
PYEOF
  if [ $? -eq 0 ]; then
    pass "cbm_security_no_network"
  else
    fail "cbm_security_no_network — network-sensitive flags are ON in replay mode"
  fi
else
  log "cbm_security_no_network — skipped (mode=${MODE})"
fi

# ---------------------------------------------------------------------------
# Gate: cbm_perf_budget (stub — enforced from PR2+ with metrics.json)
# ---------------------------------------------------------------------------
log "--- gate: cbm_perf_budget ---"
log "cbm_perf_budget — STUB in PR1; enforced from PR2+ via artifacts/cbm/metrics.json"
pass "cbm_perf_budget (stub)"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
log ""
if [ "${EXIT_CODE}" -eq 0 ]; then
  log "=== ALL CBM GATES PASSED ==="
else
  log "=== CBM GATE FAILURES DETECTED — see output above ===" >&2
fi

exit "${EXIT_CODE}"
