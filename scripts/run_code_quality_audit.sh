#!/usr/bin/env bash
set -uo pipefail

ROOT_DIR="$(git rev-parse --show-toplevel)"
REPORT_DIR="$ROOT_DIR/reports/code-quality/logs"
mkdir -p "$REPORT_DIR"

ESLINT_LOG="$REPORT_DIR/eslint-server.log"
PYLINT_LOG="$REPORT_DIR/pylint-data-quality.log"
SONAR_LOG="$REPORT_DIR/sonarqube.log"

printf 'Running ESLint against server workspace...\n'
if command -v pnpm >/dev/null 2>&1; then
  # shellcheck disable=SC2034
  ESLINT_STATUS=0
  pnpm exec eslint server --ext .ts,.tsx | tee "$ESLINT_LOG"
  ESLINT_STATUS=${PIPESTATUS[0]}
else
  ESLINT_STATUS=127
  printf 'pnpm is not available on PATH; skipping ESLint.\n' | tee "$ESLINT_LOG"
fi
printf 'ESLint exit code: %s\n\n' "$ESLINT_STATUS"

printf 'Running Pylint against data quality service...\n'
if command -v pylint >/dev/null 2>&1; then
  pylint services/data-quality/src | tee "$PYLINT_LOG"
  PYLINT_STATUS=${PIPESTATUS[0]}
else
  PYLINT_STATUS=127
  printf 'pylint is not available on PATH; skipping Python linting.\n' | tee "$PYLINT_LOG"
fi
printf 'Pylint exit code: %s\n\n' "$PYLINT_STATUS"

printf 'Checking for SonarQube scanner...\n'
if command -v sonar-scanner >/dev/null 2>&1; then
  sonar-scanner | tee "$SONAR_LOG"
  SONAR_STATUS=${PIPESTATUS[0]}
else
  SONAR_STATUS=127
  printf 'sonar-scanner is not installed; capture manual reminder.\n' | tee "$SONAR_LOG"
fi
printf 'SonarQube step exit code: %s\n\n' "$SONAR_STATUS"

printf 'Summary:\n'
printf '  ESLint exit: %s\n' "$ESLINT_STATUS"
printf '  Pylint exit: %s\n' "$PYLINT_STATUS"
printf '  SonarQube exit: %s\n' "$SONAR_STATUS"

# Always exit successfully so the audit can aggregate results even if linters fail
exit 0
