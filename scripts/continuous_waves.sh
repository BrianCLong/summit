#!/bin/bash

# Continuous Waves Strategy Implementation
# Based on handoff document specifications

set -e

# Configuration
WAVE_SIZE=${WAVE_SIZE:-4}  # Default 3-4 branches per wave
PARALLEL_LIMIT=${PARALLEL_LIMIT:-4}  # Parallel processing limit

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Function to process a single branch (simulates open_one.sh from handoff doc)
process_branch() {
    local branch=$1
    log "Processing branch: $branch"

    # Fetch branch
    if git fetch origin "$branch:$branch" 2>/dev/null || true; then
        log "✓ Fetched $branch"
    else
        warn "Could not fetch $branch, may already exist locally"
    fi

    # Check if PR already exists
    if gh pr list --head "$branch" --json number,title | jq -e '.[] | select(.number)' >/dev/null 2>&1; then
        log "✓ PR already exists for $branch"
        return 0
    fi

    # Create PR if it doesn't exist
    log "Creating PR for $branch..."

    # Generate basic PR body
    local pr_title="feat: $(echo $branch | sed 's/codex\///g' | sed 's/-/ /g')"
    local pr_body="Automated PR creation for branch $branch

This PR was created as part of the continuous waves strategy.

- Branch: $branch
- Created: $(date)
- Wave processing: Automated

Please review and merge when ready."

    if gh pr create --head "$branch" --title "$pr_title" --body "$pr_body" --label "codex" --label "risk:low" 2>/dev/null; then
        log "✓ Created PR for $branch"
    else
        warn "Failed to create PR for $branch"
    fi
}

# Function to process a wave of branches
process_wave() {
    local branches=("$@")
    log "Processing wave with ${#branches[@]} branches: ${branches[*]}"

    # Process branches in parallel with limit
    printf '%s\n' "${branches[@]}" | xargs -n 1 -P "$PARALLEL_LIMIT" -I {} bash -c 'process_branch "$@"' _ {}

    log "Wave completed"
}

# Main execution
main() {
    log "Starting continuous waves processing"
    log "Configuration: WAVE_SIZE=$WAVE_SIZE, PARALLEL_LIMIT=$PARALLEL_LIMIT"

    # Get all codex branches excluding the ones already processed in Wave 1
    local all_branches=($(git for-each-ref --format='%(refname:short)' refs/heads | \
        egrep '^(codex|feature|feat)/' | \
        grep -v -E "(mstc|opa.*policy|trr)" | \
        sort))

    log "Found ${#all_branches[@]} branches to process"

    # Process in waves
    local wave_num=2  # Starting from wave 2 since wave 1 is complete
    local start_idx=0

    while [ $start_idx -lt ${#all_branches[@]} ]; do
        local wave_branches=()

        # Collect branches for this wave
        for ((i=0; i<WAVE_SIZE && (start_idx + i) < ${#all_branches[@]}; i++)); do
            wave_branches+=("${all_branches[$((start_idx + i))]}")
        done

        log "=== WAVE $wave_num ==="
        process_wave "${wave_branches[@]}"

        # Export the process_branch function for xargs
        export -f process_branch log warn error

        ((wave_num++))
        ((start_idx += WAVE_SIZE))

        # Small delay between waves
        sleep 2
    done

    log "All waves completed!"
}

# Export functions for parallel processing
export -f process_branch log warn error

# Run main if script is executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi