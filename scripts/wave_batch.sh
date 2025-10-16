#!/bin/bash

# Wave Batch Processing - Simple implementation based on handoff document
# Usage: ./scripts/wave_batch.sh [branch1] [branch2] [branch3] [branch4]

set -e

log() {
    echo "[$(date +'%H:%M:%S')] $1"
}

# Simple branch processing function
process_one() {
    local branch=$1
    log "Processing: $branch"

    # Fetch branch
    git fetch origin "$branch:$branch" 2>/dev/null || {
        log "Branch $branch may already exist locally or not found"
    }

    # Check for existing PR
    if gh pr list --head "$branch" >/dev/null 2>&1; then
        log "✓ PR exists for $branch"
        return 0
    fi

    # Create PR with basic details
    local title="feat: $(echo $branch | sed 's/codex\///g' | tr '-' ' ')"
    if gh pr create --head "$branch" --title "$title" --body "Automated PR for $branch" --label "codex" 2>/dev/null; then
        log "✓ Created PR for $branch"
    else
        log "✗ Failed to create PR for $branch"
    fi
}

# Process branches provided as arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 <branch1> [branch2] [branch3] [branch4]"
    echo "Example: $0 codex/branch1 codex/branch2 codex/branch3"
    exit 1
fi

log "Processing wave with branches: $*"

for branch in "$@"; do
    process_one "$branch"
done

log "Wave batch complete!"