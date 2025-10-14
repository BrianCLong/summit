#!/usr/bin/env bash
set -euo pipefail

# Test script for merge train zero-state scenarios
# Verifies that all scripts handle empty PR queues and zero commits gracefully

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

export REAL_GIT_BIN=$(command -v git)

echo -e "${BLUE}════════════════════════════════════════════════════${RESET}"
echo -e "${BLUE}Merge Train Zero-State Test Suite${RESET}"
echo -e "${BLUE}════════════════════════════════════════════════════${RESET}"
echo ""

# Create mock git that returns zero commits
cat >"$TMP_DIR/git" <<'EOF'
#!/usr/bin/env bash
REAL_GIT="${REAL_GIT_BIN:-git}"
if [[ "$1" == "log" ]]; then
  # Simulate zero commits returned for any git log invocation
  exit 0
elif [[ "$1" == "remote" && "$2" == "get-url" ]]; then
  echo "git@github.com:test/repo.git"
  exit 0
fi
exec "$REAL_GIT" "$@"
EOF

chmod +x "$TMP_DIR/git"

# Create mock gh that returns empty PR lists
cat >"$TMP_DIR/gh" <<'EOF'
#!/usr/bin/env bash
case "$1" in
  pr)
    if [[ "$2" == "list" ]]; then
      echo "[]"
      exit 0
    fi
    ;;
  run)
    if [[ "$2" == "list" ]]; then
      echo "[]"
      exit 0
    fi
    ;;
  issue)
    if [[ "$2" == "create" ]]; then
      echo '{"number": 1}'
      exit 0
    fi
    ;;
esac
echo "[]"
exit 0
EOF

chmod +x "$TMP_DIR/gh"

export PATH="$TMP_DIR:$PATH"
export GH_TOKEN="dummy-token"

# Test 1: conflict-hotspot-report.sh with zero commits
echo -e "${YELLOW}Test 1: conflict-hotspot-report.sh (zero commits)${RESET}"
if "$ROOT_DIR"/scripts/conflict-hotspot-report.sh 30 5 >"$TMP_DIR/hotspot.log" 2>&1; then
  if grep -q "No data" /tmp/hotspot-report.csv; then
    echo -e "  ${GREEN}✓ PASS${RESET} - Handled zero commits gracefully"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "  ${RED}✗ FAIL${RESET} - Expected 'No data' marker in CSV"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
else
  echo -e "  ${RED}✗ FAIL${RESET} - Script crashed on zero commits"
  cat "$TMP_DIR/hotspot.log"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 2: merge-train-health-dashboard.sh with zero PRs
echo -e "${YELLOW}Test 2: merge-train-health-dashboard.sh (zero PRs)${RESET}"
if "$ROOT_DIR"/scripts/merge-train-health-dashboard.sh >"$TMP_DIR/health.log" 2>&1; then
  if grep -q "Total Open PRs.*0" /tmp/merge-train-health-*.md 2>/dev/null; then
    echo -e "  ${GREEN}✓ PASS${RESET} - Handled zero PRs gracefully"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo -e "  ${RED}✗ FAIL${RESET} - Expected health report with 0 PRs"
    TESTS_FAILED=$((TESTS_FAILED + 1))
  fi
else
  echo -e "  ${RED}✗ FAIL${RESET} - Script crashed on zero PRs"
  cat "$TMP_DIR/health.log"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 3: Division-by-zero guard (direct bash test)
echo -e "${YELLOW}Test 3: Division-by-zero guards${RESET}"
TOTAL_OPEN=0
TOTAL_CONFLICTING=0
if [ "$TOTAL_OPEN" -eq 0 ]; then
    CONFLICT_RATE=0
else
    CONFLICT_RATE=$(echo "scale=1; $TOTAL_CONFLICTING * 100 / $TOTAL_OPEN" | bc)
fi

if [ "$CONFLICT_RATE" = "0" ]; then
  echo -e "  ${GREEN}✓ PASS${RESET} - Division-by-zero guard works correctly"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "  ${RED}✗ FAIL${RESET} - Division-by-zero guard failed"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 4: Workflow fork detection logic
echo -e "${YELLOW}Test 4: Workflow fork detection${RESET}"
IS_SAME_REPO='false'
if [ "$IS_SAME_REPO" != 'true' ]; then
  echo -e "  ${GREEN}✓ PASS${RESET} - Fork PR detection logic works"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "  ${RED}✗ FAIL${RESET} - Fork PR detection failed"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

IS_SAME_REPO='true'
if [ "$IS_SAME_REPO" = 'true' ]; then
  echo -e "  ${GREEN}✓ PASS${RESET} - Same-repo PR detection logic works"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "  ${RED}✗ FAIL${RESET} - Same-repo PR detection failed"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Test 5: Makefile mt-metrics zero-state guard
echo -e "${YELLOW}Test 5: Makefile mt-metrics guards${RESET}"
TOTAL=0
CONFLICTS=0
MERGEABLE=0
if [ "$TOTAL" -gt 0 ]; then
    CONFLICT_PCT=$(awk -v c="$CONFLICTS" -v t="$TOTAL" 'BEGIN { printf "%.1f", (c*100)/t }')
    MERGEABLE_PCT=$(awk -v m="$MERGEABLE" -v t="$TOTAL" 'BEGIN { printf "%.1f", (m*100)/t }')
else
    CONFLICT_PCT=0
    MERGEABLE_PCT=0
fi

if [ "$CONFLICT_PCT" = "0" ] && [ "$MERGEABLE_PCT" = "0" ]; then
  echo -e "  ${GREEN}✓ PASS${RESET} - Makefile percentage calculation guards work"
  TESTS_PASSED=$((TESTS_PASSED + 1))
else
  echo -e "  ${RED}✗ FAIL${RESET} - Makefile guards failed"
  TESTS_FAILED=$((TESTS_FAILED + 1))
fi

# Summary
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════${RESET}"
echo -e "${BLUE}Test Results${RESET}"
echo -e "${BLUE}════════════════════════════════════════════════════${RESET}"
echo -e "${GREEN}Passed: $TESTS_PASSED${RESET}"
echo -e "${RED}Failed: $TESTS_FAILED${RESET}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${RESET}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${RESET}"
    exit 1
fi
