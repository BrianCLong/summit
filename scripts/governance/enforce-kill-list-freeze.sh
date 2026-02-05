#!/usr/bin/env bash
# enforce-kill-list-freeze.sh
# Enforces feature freeze on components listed in governance/kill-list.yml
#
# Usage:
#   ./scripts/governance/enforce-kill-list-freeze.sh
#
# Authority: 90_DAY_WAR_ROOM_BACKLOG.md (Task 65)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
KILL_LIST="${REPO_ROOT}/governance/kill-list.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "[freeze-check] $*" >&2; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*" >&2; }

if [[ ! -f "$KILL_LIST" ]]; then
    log_warn "Kill list not found at $KILL_LIST. Skipping freeze check."
    exit 0
fi

# 1. Extract paths from kill list
# Uses yq to extract all paths under kill_list
if ! command -v yq &> /dev/null; then
    log_warn "yq not found. Attempting to parse with simple grep (less accurate)."
    FROZEN_PATHS=$(grep "path:" "$KILL_LIST" | sed 's/.*path: "\(.*\)".*/\1/' | sed 's/.*path: \(.*\).*/\1/')
else
    FROZEN_PATHS=$(yq -r '.kill_list[].path' "$KILL_LIST")
fi

log_info "Enforcing freeze on ${#FROZEN_PATHS[@]} paths..."

# 2. Get changed files in current branch/commit
# Compare against origin/main if in CI, or staged changes if local
BASE_REF=${GITHUB_BASE_REF:-"main"}
CHANGED_FILES=$(git diff --name-only "origin/${BASE_REF}" 2>/dev/null || git diff --name-only HEAD)

VIOLATIONS=0

for path in $FROZEN_PATHS; do
    # Remove trailing slash for matching
    clean_path="${path%/}"
    
    # Check if any changed file starts with this path
    MATCHES=$(echo "$CHANGED_FILES" | grep "^${clean_path}" || true)
    
    if [[ -n "$MATCHES" ]]; then
        log_error "VIOLATION: Component '$path' is on the KILL LIST and is FROZEN."
        echo "$MATCHES" | while read -r line; do
            echo "  -> Modified: $line"
        done
        VIOLATIONS=$((VIOLATIONS + 1))
    fi
done

if [[ $VIOLATIONS -gt 0 ]]; then
    echo ""
    log_error "Total $VIOLATIONS frozen component violations found."
    log_error "Please remove changes to these components or migrate to their replacement."
    log_error "Refer to governance/kill-list.yml for migration paths."
    
    # Check for override
    if [[ "${KILL_LIST_OVERRIDE:-}" == "true" ]]; then
        log_warn "OVERRIDE DETECTED (KILL_LIST_OVERRIDE=true). Proceeding anyway..."
        exit 0
    fi
    exit 1
fi

echo -e "${GREEN}✅ No kill-list freeze violations detected.${NC}"
exit 0
