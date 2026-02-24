#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BASELINE=""
LOCKFILE="pnpm-lock.yaml"
ALLOW_PATCH=false
GENERATE_REPORT=false
STRICT_MODE=false
CHECK_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

while [[ $# -gt 0 ]]; do
  case $1 in
    --baseline) BASELINE="$2"; shift 2 ;;
    --lockfile) LOCKFILE="$2"; shift 2 ;;
    --allow-patch) ALLOW_PATCH=true; shift ;;
    --report) GENERATE_REPORT=true; shift ;;
    --strict) STRICT_MODE=true; shift ;;
    --help) echo "Usage..."; exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

find_latest_rc_tag() { git tag -l 'v*.*.*-rc.*' --sort=-v:refname | head -1; }
get_lockfile_at_ref() { git show "$1:$2" 2>/dev/null || echo ""; }
compare_lockfiles() {
  local b=$(mktemp); local c=$(mktemp)
  echo "$1" > "$b"; echo "$2" > "$c"
  diff -u "$b" "$c" 2>/dev/null || true
  rm -f "$b" "$c"
}
is_patch_only() {
  if echo "$1" | grep -E "^[\+\-].*[0-9]+\.[0-9]+\.[0-9]+" | grep -vE "^[\+\-].*[0-9]+\.[0-9]+\.[0-9]+->" >/dev/null 2>&1; then return 1; fi
  return 0
}

if [[ -z "$BASELINE" ]]; then BASELINE=$(find_latest_rc_tag); if [[ -z "$BASELINE" ]]; then BASELINE="HEAD"; fi; fi

B_CONTENT=$(get_lockfile_at_ref "$BASELINE" "$LOCKFILE")
if [[ -f "$LOCKFILE" ]]; then C_CONTENT=$(cat "$LOCKFILE"); else C_CONTENT=""; fi

DIFF=$(compare_lockfiles "$B_CONTENT" "$C_CONTENT")
STATUS="PASS"; CHANGES="false"; CODE=0

if [[ -n "$DIFF" ]]; then
  CHANGES="true"; STATUS="FAIL"
  if [[ "$ALLOW_PATCH" == "true" ]] && is_patch_only "$DIFF"; then STATUS="WARN"; else CODE=1; fi
fi

if [[ "$GENERATE_REPORT" == "true" ]]; then
  R_DIR="${REPO_ROOT}/artifacts/reports"; mkdir -p "$R_DIR"
  R_FILE="${R_DIR}/dependency-freeze-$(date +%Y%m%d-%H%M%S).md"
  echo "# Report" > "$R_FILE"
  echo "$R_FILE" >&2
fi

echo "{"timestamp": "${CHECK_TIMESTAMP}", "baseline": "${BASELINE}", "status": "${STATUS}", "has_changes": ${CHANGES}}"
exit $CODE
