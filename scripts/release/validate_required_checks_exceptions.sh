#!/usr/bin/env bash
# validate_required_checks_exceptions.sh
# Validates REQUIRED_CHECKS_EXCEPTIONS.yml structure and expiration dates
#
# Checks:
# - YAML syntax validity
# - Required fields present
# - Expiration dates not more than 90 days out
# - No duplicate exception IDs
# - Direction values are valid
# - Expired exceptions flagged as warnings
#
# Usage:
#   ./scripts/release/validate_required_checks_exceptions.sh
#   ./scripts/release/validate_required_checks_exceptions.sh --file path/to/exceptions.yml
#
# Authority: docs/ci/REQUIRED_CHECKS_EXCEPTIONS.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"

# Defaults
EXCEPTIONS_FILE="${REPO_ROOT}/docs/ci/REQUIRED_CHECKS_EXCEPTIONS.yml"
VERBOSE=false
STRICT=false
MAX_DURATION_DAYS=90

usage() {
    cat << 'EOF'
Usage: validate_required_checks_exceptions.sh [OPTIONS]

Validate REQUIRED_CHECKS_EXCEPTIONS.yml for correctness.

Options:
  --file FILE           Exceptions file (default: docs/ci/REQUIRED_CHECKS_EXCEPTIONS.yml)
  --max-duration DAYS   Max exception duration in days (default: 90)
  --strict              Treat warnings as errors
  --verbose             Enable verbose logging
  --help                Show this help

Exit Codes:
  0 - Valid (may have warnings)
  1 - Invalid (errors found)
  2 - File not found or not readable

EOF
    exit 0
}

log() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo "[validate] $*" >&2
    fi
}

log_info() {
    echo "[INFO] $*" >&2
}

log_warn() {
    echo "[WARN] $*" >&2
}

log_error() {
    echo "[ERROR] $*" >&2
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --file)
            EXCEPTIONS_FILE="$2"
            shift 2
            ;;
        --max-duration)
            MAX_DURATION_DAYS="$2"
            shift 2
            ;;
        --strict)
            STRICT=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            usage
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check file exists
if [[ ! -f "$EXCEPTIONS_FILE" ]]; then
    log_error "Exceptions file not found: $EXCEPTIONS_FILE"
    exit 2
fi

# Check yq is available
if ! command -v yq &> /dev/null; then
    log_error "yq is required but not installed"
    log_error "Install with: brew install yq (macOS) or apt-get install yq (Linux)"
    exit 1
fi

log "Validating: $EXCEPTIONS_FILE"

ERRORS=0
WARNINGS=0
TODAY=$(date -u +"%Y-%m-%d")

# Calculate max date (today + max duration)
if [[ "$(uname)" == "Darwin" ]]; then
    MAX_DATE=$(date -v+${MAX_DURATION_DAYS}d +"%Y-%m-%d")
else
    MAX_DATE=$(date -d "+${MAX_DURATION_DAYS} days" +"%Y-%m-%d")
fi

log "Today: $TODAY"
log "Max expiration date: $MAX_DATE"

# Check YAML syntax
log "Checking YAML syntax..."
if ! yq eval '.' "$EXCEPTIONS_FILE" > /dev/null 2>&1; then
    log_error "Invalid YAML syntax in $EXCEPTIONS_FILE"
    yq eval '.' "$EXCEPTIONS_FILE" 2>&1 | head -5 >&2
    exit 1
fi

log_info "YAML syntax valid"

# Check version field
VERSION=$(yq eval '.version' "$EXCEPTIONS_FILE")
if [[ "$VERSION" == "null" || -z "$VERSION" ]]; then
    log_error "Missing 'version' field"
    ((ERRORS++))
fi

# Get exception count
EXCEPTION_COUNT=$(yq eval '.exceptions | length' "$EXCEPTIONS_FILE")
log "Found $EXCEPTION_COUNT exceptions"

# Validate each exception
SEEN_IDS=()

for ((i=0; i<EXCEPTION_COUNT; i++)); do
    log "Validating exception [$i]..."

    # Extract fields
    ID=$(yq eval ".exceptions[$i].id" "$EXCEPTIONS_FILE")
    CHECK_NAME=$(yq eval ".exceptions[$i].check_name" "$EXCEPTIONS_FILE")
    DIRECTION=$(yq eval ".exceptions[$i].direction" "$EXCEPTIONS_FILE")
    BRANCH=$(yq eval ".exceptions[$i].branch" "$EXCEPTIONS_FILE")
    REASON=$(yq eval ".exceptions[$i].reason" "$EXCEPTIONS_FILE")
    OWNER=$(yq eval ".exceptions[$i].owner" "$EXCEPTIONS_FILE")
    CREATED_AT=$(yq eval ".exceptions[$i].created_at" "$EXCEPTIONS_FILE")
    EXPIRES_AT=$(yq eval ".exceptions[$i].expires_at" "$EXCEPTIONS_FILE")
    TICKET=$(yq eval ".exceptions[$i].ticket" "$EXCEPTIONS_FILE")

    # Check required fields
    if [[ "$ID" == "null" || -z "$ID" ]]; then
        log_error "Exception [$i]: Missing 'id' field"
        ((ERRORS++))
        continue
    fi

    # Check for duplicate IDs
    if printf '%s\n' "${SEEN_IDS[@]}" | grep -Fxq "$ID" 2>/dev/null; then
        log_error "Exception $ID: Duplicate ID found"
        ((ERRORS++))
    else
        SEEN_IDS+=("$ID")
    fi

    # Validate required fields
    if [[ "$CHECK_NAME" == "null" || -z "$CHECK_NAME" ]]; then
        log_error "Exception $ID: Missing 'check_name' field"
        ((ERRORS++))
    fi

    if [[ "$DIRECTION" == "null" || -z "$DIRECTION" ]]; then
        log_error "Exception $ID: Missing 'direction' field"
        ((ERRORS++))
    elif [[ "$DIRECTION" != "allow_missing_in_github" && "$DIRECTION" != "allow_extra_in_github" ]]; then
        log_error "Exception $ID: Invalid 'direction' value: $DIRECTION"
        log_error "  Must be: allow_missing_in_github | allow_extra_in_github"
        ((ERRORS++))
    fi

    if [[ "$BRANCH" == "null" || -z "$BRANCH" ]]; then
        log_error "Exception $ID: Missing 'branch' field"
        ((ERRORS++))
    fi

    if [[ "$REASON" == "null" || -z "$REASON" ]]; then
        log_error "Exception $ID: Missing 'reason' field"
        ((ERRORS++))
    fi

    if [[ "$OWNER" == "null" || -z "$OWNER" ]]; then
        log_error "Exception $ID: Missing 'owner' field"
        ((ERRORS++))
    fi

    if [[ "$CREATED_AT" == "null" || -z "$CREATED_AT" ]]; then
        log_error "Exception $ID: Missing 'created_at' field"
        ((ERRORS++))
    elif ! [[ "$CREATED_AT" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
        log_error "Exception $ID: Invalid 'created_at' format: $CREATED_AT (expected YYYY-MM-DD)"
        ((ERRORS++))
    fi

    if [[ "$EXPIRES_AT" == "null" || -z "$EXPIRES_AT" ]]; then
        log_error "Exception $ID: Missing 'expires_at' field (MANDATORY)"
        ((ERRORS++))
    elif ! [[ "$EXPIRES_AT" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
        log_error "Exception $ID: Invalid 'expires_at' format: $EXPIRES_AT (expected YYYY-MM-DD)"
        ((ERRORS++))
    else
        # Check if expired
        if [[ "$EXPIRES_AT" < "$TODAY" ]]; then
            log_warn "Exception $ID: EXPIRED on $EXPIRES_AT"
            log_warn "  Consider moving to archived_exceptions for audit trail"
            ((WARNINGS++))
        fi

        # Check if expiration is too far out
        if [[ "$EXPIRES_AT" > "$MAX_DATE" ]]; then
            log_error "Exception $ID: Expiration date $EXPIRES_AT exceeds max duration of $MAX_DURATION_DAYS days"
            log_error "  Max allowed expiration: $MAX_DATE"
            ((ERRORS++))
        fi
    fi

    if [[ "$TICKET" == "null" || -z "$TICKET" ]]; then
        log_error "Exception $ID: Missing 'ticket' field (must link to approval)"
        ((ERRORS++))
    elif ! [[ "$TICKET" =~ ^https?:// ]]; then
        log_warn "Exception $ID: Ticket should be a URL: $TICKET"
        ((WARNINGS++))
    fi

    log "Exception $ID validated"
done

# Check archived exceptions for ID conflicts
ARCHIVED_COUNT=$(yq eval '.archived_exceptions | length' "$EXCEPTIONS_FILE")
log "Found $ARCHIVED_COUNT archived exceptions"

for ((i=0; i<ARCHIVED_COUNT; i++)); do
    ARCHIVED_ID=$(yq eval ".archived_exceptions[$i].id" "$EXCEPTIONS_FILE")

    if [[ "$ARCHIVED_ID" != "null" && -n "$ARCHIVED_ID" ]]; then
        if printf '%s\n' "${SEEN_IDS[@]}" | grep -Fxq "$ARCHIVED_ID" 2>/dev/null; then
            log_error "Archived exception $ARCHIVED_ID: ID conflicts with active exception"
            ((ERRORS++))
        fi
    fi
done

# Summary
echo ""
echo "=== Validation Summary ==="
echo "File: $EXCEPTIONS_FILE"
echo "Active Exceptions: $EXCEPTION_COUNT"
echo "Archived Exceptions: $ARCHIVED_COUNT"
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

# Output JSON summary
cat << EOF
{
  "file": "$EXCEPTIONS_FILE",
  "valid": $([ $ERRORS -eq 0 ] && echo "true" || echo "false"),
  "active_count": $EXCEPTION_COUNT,
  "archived_count": $ARCHIVED_COUNT,
  "errors": $ERRORS,
  "warnings": $WARNINGS,
  "validated_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF

# Exit based on results
if [[ $ERRORS -gt 0 ]]; then
    log_error "Validation FAILED with $ERRORS error(s)"
    exit 1
fi

if [[ $WARNINGS -gt 0 && "$STRICT" == "true" ]]; then
    log_error "Validation FAILED (strict mode) with $WARNINGS warning(s)"
    exit 1
fi

if [[ $WARNINGS -gt 0 ]]; then
    log_warn "Validation PASSED with $WARNINGS warning(s)"
else
    log_info "Validation PASSED"
fi

exit 0
