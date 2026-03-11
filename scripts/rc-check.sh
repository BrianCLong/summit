#!/usr/bin/env bash
#
# rc-check.sh — Summit Release Candidate Pre-Flight Check
#
# PURPOSE
#   Single entry-point for local RC readiness verification before any RC tag.
#   Runs the subset of gates that execute without a live deployment.
#   Does NOT replace CI; catches local issues early.
#
# USAGE
#   bash scripts/rc-check.sh [--verbose] [--output <path>]
#
# CANONICAL REFERENCE
#   RC_GATE.md §2 — Canonical RC Check Script
#
# EXIT CODES
#   0 = all gates PASS
#   1 = one or more gates FAIL

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
VERBOSE=false
OUTPUT_PATH="${REPO_ROOT}/artifacts/rc-readiness-stamp.txt"

# --- Argument parsing ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    --verbose|-v) VERBOSE=true; shift ;;
    --output)     OUTPUT_PATH="$2"; shift 2 ;;
    --help|-h)
      echo "Usage: bash scripts/rc-check.sh [--verbose] [--output <path>]"
      exit 0
      ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

# --- Helpers ---
PASS=0
FAIL=0

log() { echo "[rc-check] $*"; }
log_verbose() { $VERBOSE && echo "[rc-check] $*" || true; }

pass() { echo "  ✓ $1"; PASS=$((PASS + 1)); }
fail() { echo "  ✗ $1"; FAIL=$((FAIL + 1)); }
skip() { echo "  ~ $1 (skipped: $2)"; }

# --- Gate 1: Working tree clean ---
log "Gate 1: Working tree clean"
if git diff --quiet && git diff --cached --quiet; then
  pass "Working tree is clean"
else
  fail "Working tree has uncommitted changes — stash or commit before cutting RC"
fi

# --- Gate 2: On main or a release branch ---
log "Gate 2: Branch check"
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" == "main" || "$CURRENT_BRANCH" == release/* ]]; then
  pass "On branch: $CURRENT_BRANCH"
else
  fail "Not on main or release/* branch (current: $CURRENT_BRANCH) — RC tags must be cut from main"
fi

# --- Gate 3: No merge conflicts ---
log "Gate 3: Merge conflict markers"
if git diff --name-only --diff-filter=U | grep -q .; then
  fail "Unresolved merge conflicts in repo"
else
  pass "No unresolved merge conflicts"
fi

# --- Gate 4: Governance lockfile verification ---
log "Gate 4: Governance lockfile"
LOCKFILE_SCRIPT="${REPO_ROOT}/scripts/release/verify_governance_lockfile.sh"
if [[ -f "$LOCKFILE_SCRIPT" ]]; then
  if bash "$LOCKFILE_SCRIPT" >/dev/null 2>&1; then
    pass "Governance lockfile valid"
  else
    fail "Governance lockfile verification failed — run: bash scripts/release/verify_governance_lockfile.sh"
  fi
else
  skip "Governance lockfile" "script not found at scripts/release/verify_governance_lockfile.sh"
fi

# --- Gate 5: GA verify report ---
log "Gate 5: GA verify script"
GA_VERIFY="${REPO_ROOT}/scripts/release/ga_verify.mjs"
if [[ -f "$GA_VERIFY" ]]; then
  log_verbose "Running: node $GA_VERIFY"
  if node "$GA_VERIFY" >/dev/null 2>&1; then
    pass "GA verify report: PASS"
  else
    fail "GA verify report: FAIL — run: node scripts/release/ga_verify.mjs --verbose"
  fi
else
  skip "GA verify" "script not found at scripts/release/ga_verify.mjs"
fi

# --- Gate 6: RC gate document present ---
log "Gate 6: Canonical RC gate document"
if [[ -f "${REPO_ROOT}/RC_GATE.md" ]]; then
  pass "RC_GATE.md present"
else
  fail "RC_GATE.md missing — create the canonical RC gate document"
fi

# --- Gate 7: RC readiness report present ---
log "Gate 7: RC readiness report artifact"
if [[ -f "${REPO_ROOT}/RC_READINESS_REPORT.md" ]]; then
  pass "RC_READINESS_REPORT.md present"
else
  fail "RC_READINESS_REPORT.md missing — create the RC readiness report"
fi

# --- Gate 8: Go/No-Go gate document present and non-empty ---
log "Gate 8: Go/No-Go gate document"
GONG="${REPO_ROOT}/GO_NO_GO_GATE.md"
if [[ -f "$GONG" ]]; then
  LINE_COUNT=$(wc -l < "$GONG")
  if [[ "$LINE_COUNT" -gt 5 ]]; then
    pass "GO_NO_GO_GATE.md present ($LINE_COUNT lines)"
  else
    fail "GO_NO_GO_GATE.md appears empty or minimal — complete the signoff table"
  fi
else
  fail "GO_NO_GO_GATE.md missing"
fi

# --- Gate 9: Key runbooks present ---
log "Gate 9: Canonical runbooks"
MISSING_RUNBOOKS=()
for rb in \
  "RUNBOOKS/GA_RELEASE.md" \
  "RUNBOOKS/GA_FIRST_WEEK_OPERATIONS.md" \
  "RUNBOOKS/DISASTER_RECOVERY.md" \
  "docs/runbooks/rollback-procedure.md" \
  "docs/runbooks/LAUNCH_RUNBOOKS.md"; do
  if [[ ! -f "${REPO_ROOT}/${rb}" ]]; then
    MISSING_RUNBOOKS+=("$rb")
  fi
done
if [[ ${#MISSING_RUNBOOKS[@]} -eq 0 ]]; then
  pass "All canonical runbooks present"
else
  fail "Missing canonical runbooks: ${MISSING_RUNBOOKS[*]}"
fi

# --- Gate 10: Key workflow files present ---
log "Gate 10: Canonical CI workflows"
MISSING_WORKFLOWS=()
for wf in \
  ".github/workflows/release-readiness.yml" \
  ".github/workflows/release-ga.yml" \
  ".github/workflows/rc-preparation.yml" \
  ".github/workflows/go-live-gate.yml" \
  ".github/workflows/post-deploy-gate.yml" \
  ".github/workflows/_reusable-ga-readiness.yml"; do
  if [[ ! -f "${REPO_ROOT}/${wf}" ]]; then
    MISSING_WORKFLOWS+=("$wf")
  fi
done
if [[ ${#MISSING_WORKFLOWS[@]} -eq 0 ]]; then
  pass "All canonical CI workflows present"
else
  fail "Missing canonical CI workflows: ${MISSING_WORKFLOWS[*]}"
fi

# --- Summary ---
echo ""
echo "=========================================="
echo "  RC Pre-Flight Summary"
echo "=========================================="
echo "  PASS: $PASS"
echo "  FAIL: $FAIL"
echo ""

# Write stamp (runtime data — not committed)
STAMP_DIR="$(dirname "$OUTPUT_PATH")"
mkdir -p "$STAMP_DIR"
{
  echo "rc-check stamp"
  echo "timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "branch: $CURRENT_BRANCH"
  echo "sha: $(git rev-parse HEAD)"
  echo "pass: $PASS"
  echo "fail: $FAIL"
  echo "result: $([ "$FAIL" -eq 0 ] && echo PASS || echo FAIL)"
} > "$OUTPUT_PATH"
log_verbose "Stamp written to: $OUTPUT_PATH"

if [[ "$FAIL" -eq 0 ]]; then
  echo "  RESULT: ✓ RC PRE-FLIGHT PASS"
  echo ""
  echo "  Next steps:"
  echo "    1. node scripts/release/ga_verify.mjs --verbose"
  echo "    2. Trigger .github/workflows/rc-preparation.yml (dry_run=true)"
  echo "    3. Review and execute RC tag commands from the bundle"
  echo ""
  exit 0
else
  echo "  RESULT: ✗ RC PRE-FLIGHT FAIL — resolve the above failures before cutting RC"
  echo ""
  echo "  See RC_GATE.md for the canonical RC gate definition."
  echo ""
  exit 1
fi
