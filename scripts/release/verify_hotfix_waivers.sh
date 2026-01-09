#!/usr/bin/env bash
#
# verify_hotfix_waivers.sh - Validate hotfix waiver state
#
# Usage:
#   ./verify_hotfix_waivers.sh [--strict] [--json]
#
# Validates:
#   1. No expired waivers are referenced
#   2. All active waivers have valid structure
#   3. All waivers have required approvals
#
# Exit codes:
#   0 - All waivers valid
#   1 - Validation errors found
#   2 - Waiver file not found

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="${SCRIPT_DIR}/../.."
WAIVER_FILE="${REPO_ROOT}/docs/releases/_state/hotfix_waivers.json"
AUDIT_LOG="${REPO_ROOT}/docs/releases/_state/waiver_audit_log.json"

STRICT_MODE=false
JSON_OUTPUT=false
EXIT_CODE=0

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --strict)
      STRICT_MODE=true
      shift
      ;;
    --json)
      JSON_OUTPUT=true
      shift
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

# Check waiver file exists
if [[ ! -f "${WAIVER_FILE}" ]]; then
  if [[ "${JSON_OUTPUT}" == "true" ]]; then
    echo '{"status": "error", "message": "Waiver file not found"}'
  else
    echo "Error: Waiver file not found: ${WAIVER_FILE}" >&2
  fi
  exit 2
fi

# Get current timestamp
CURRENT_TIME=$(date -u +%s)
CURRENT_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Initialize results
TOTAL_WAIVERS=0
ACTIVE_WAIVERS=0
EXPIRED_WAIVERS=0
INVALID_WAIVERS=0
EXPIRING_SOON=0  # Within 24 hours

# Read waivers
WAIVERS=$(jq -c '.waivers[]' "${WAIVER_FILE}" 2>/dev/null || echo "")

if [[ -z "${WAIVERS}" ]]; then
  if [[ "${JSON_OUTPUT}" == "true" ]]; then
    echo '{"status": "pass", "total": 0, "active": 0, "expired": 0, "invalid": 0}'
  else
    echo "No waivers defined. All clear."
  fi
  exit 0
fi

# Process each waiver
ERRORS=()
WARNINGS=()

while IFS= read -r waiver; do
  TOTAL_WAIVERS=$((TOTAL_WAIVERS + 1))

  WAIVER_ID=$(echo "${waiver}" | jq -r '.id')
  STATUS=$(echo "${waiver}" | jq -r '.status')
  EXPIRES_AT=$(echo "${waiver}" | jq -r '.expires_at')
  APPROVERS=$(echo "${waiver}" | jq -r '.approved_by | length')
  WAIVER_TYPE=$(echo "${waiver}" | jq -r '.type')

  # Parse expiry timestamp
  EXPIRES_EPOCH=$(date -d "${EXPIRES_AT}" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "${EXPIRES_AT}" +%s 2>/dev/null || echo "0")

  # Skip non-active waivers
  if [[ "${STATUS}" != "active" ]]; then
    continue
  fi

  # Check if expired
  if [[ "${CURRENT_TIME}" -gt "${EXPIRES_EPOCH}" ]]; then
    EXPIRED_WAIVERS=$((EXPIRED_WAIVERS + 1))
    ERRORS+=("Waiver ${WAIVER_ID} has expired (${EXPIRES_AT})")
    continue
  fi

  # Check expiring soon (within 24 hours)
  HOURS_UNTIL_EXPIRY=$(( (EXPIRES_EPOCH - CURRENT_TIME) / 3600 ))
  if [[ "${HOURS_UNTIL_EXPIRY}" -lt 24 ]]; then
    EXPIRING_SOON=$((EXPIRING_SOON + 1))
    WARNINGS+=("Waiver ${WAIVER_ID} expires in ${HOURS_UNTIL_EXPIRY} hours")
  fi

  # Validate approver count
  REQUIRED_APPROVERS=2
  if [[ "${WAIVER_TYPE}" == "security-exception" ]]; then
    REQUIRED_APPROVERS=2  # CISO + 1
  fi

  if [[ "${APPROVERS}" -lt "${REQUIRED_APPROVERS}" ]]; then
    INVALID_WAIVERS=$((INVALID_WAIVERS + 1))
    ERRORS+=("Waiver ${WAIVER_ID} requires ${REQUIRED_APPROVERS} approvers (has ${APPROVERS})")
    continue
  fi

  # Validate required fields
  JUSTIFICATION=$(echo "${waiver}" | jq -r '.justification // empty')
  if [[ -z "${JUSTIFICATION}" ]]; then
    INVALID_WAIVERS=$((INVALID_WAIVERS + 1))
    ERRORS+=("Waiver ${WAIVER_ID} missing justification")
    continue
  fi

  TICKET_URL=$(echo "${waiver}" | jq -r '.ticket_url // empty')
  if [[ -z "${TICKET_URL}" ]]; then
    INVALID_WAIVERS=$((INVALID_WAIVERS + 1))
    ERRORS+=("Waiver ${WAIVER_ID} missing ticket_url")
    continue
  fi

  # Waiver is valid and active
  ACTIVE_WAIVERS=$((ACTIVE_WAIVERS + 1))

done <<< "${WAIVERS}"

# Determine overall status
if [[ ${#ERRORS[@]} -gt 0 ]]; then
  EXIT_CODE=1
fi

if [[ "${STRICT_MODE}" == "true" ]] && [[ ${#WARNINGS[@]} -gt 0 ]]; then
  EXIT_CODE=1
fi

# Output results
if [[ "${JSON_OUTPUT}" == "true" ]]; then
  cat <<EOF
{
  "status": $(if [[ ${EXIT_CODE} -eq 0 ]]; then echo '"pass"'; else echo '"fail"'; fi),
  "timestamp": "${CURRENT_ISO}",
  "summary": {
    "total": ${TOTAL_WAIVERS},
    "active": ${ACTIVE_WAIVERS},
    "expired": ${EXPIRED_WAIVERS},
    "invalid": ${INVALID_WAIVERS},
    "expiring_soon": ${EXPIRING_SOON}
  },
  "errors": $(printf '%s\n' "${ERRORS[@]:-}" | jq -R -s -c 'split("\n") | map(select(length > 0))'),
  "warnings": $(printf '%s\n' "${WARNINGS[@]:-}" | jq -R -s -c 'split("\n") | map(select(length > 0))')
}
EOF
else
  echo "Hotfix Waiver Validation Report"
  echo "================================"
  echo ""
  echo "Timestamp: ${CURRENT_ISO}"
  echo ""
  echo "Summary:"
  echo "  Total waivers:    ${TOTAL_WAIVERS}"
  echo "  Active:           ${ACTIVE_WAIVERS}"
  echo "  Expired:          ${EXPIRED_WAIVERS}"
  echo "  Invalid:          ${INVALID_WAIVERS}"
  echo "  Expiring soon:    ${EXPIRING_SOON}"
  echo ""

  if [[ ${#ERRORS[@]} -gt 0 ]]; then
    echo "Errors:"
    for error in "${ERRORS[@]}"; do
      echo "  - ${error}"
    done
    echo ""
  fi

  if [[ ${#WARNINGS[@]} -gt 0 ]]; then
    echo "Warnings:"
    for warning in "${WARNINGS[@]}"; do
      echo "  - ${warning}"
    done
    echo ""
  fi

  if [[ ${EXIT_CODE} -eq 0 ]]; then
    echo "Result: PASS"
  else
    echo "Result: FAIL"
  fi
fi

exit ${EXIT_CODE}
