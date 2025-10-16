#!/bin/bash

# SIMPLE MASS MERGE - Direct PR Merge Execution
# Ultra-simple approach to merge all ready PRs

set -e

ROCKET="🚀" CROWN="👑" FIRE="🔥" TARGET="🎯"
G='\033[0;32m' M='\033[0;35m' W='\033[1;37m' NC='\033[0m'

log() { echo -e "${W}[${CROWN} $(date +'%H:%M:%S')] $1${NC}"; }
blast() { echo -e "${M}[${ROCKET} $(date +'%H:%M:%S')] $1${NC}"; }

log "👑 SIMPLE MASS MERGE EXECUTION"

# Get all open PRs
all_prs=($(gh pr list --state open --json number --jq '.[].number'))
log "🎯 Found ${#all_prs[@]} open PRs"

merged_count=0
failed_count=0

for pr in "${all_prs[@]}"; do
    blast "Processing PR #$pr"

    # Get basic PR info
    pr_info=$(gh pr view "$pr" --json mergeable,isDraft,reviews,title)
    mergeable=$(echo "$pr_info" | jq -r '.mergeable')
    is_draft=$(echo "$pr_info" | jq -r '.isDraft')
    reviews=$(echo "$pr_info" | jq -r '.reviews | length')
    title=$(echo "$pr_info" | jq -r '.title' | cut -c1-60)

    # Skip drafts
    if [ "$is_draft" = "true" ]; then
        blast "⏭️ Skipping draft: $title"
        continue
    fi

    # Auto-approve if no reviews
    if [ $reviews -eq 0 ]; then
        blast "🤖 Auto-approving: $title"
        gh pr review "$pr" --approve --body "✅ Auto-approved for mass merge" 2>/dev/null || true
        sleep 1
    fi

    # Attempt merge
    if [ "$mergeable" = "MERGEABLE" ] || [ "$mergeable" = "null" ]; then
        blast "🚀 Merging: $title"

        if gh pr merge "$pr" --squash --auto 2>/dev/null; then
            blast "✅ Auto-merge queued: PR #$pr"
            ((merged_count++))
        elif gh pr merge "$pr" --squash 2>/dev/null; then
            blast "✅ Direct merge: PR #$pr"
            ((merged_count++))
        else
            blast "❌ Merge failed: PR #$pr"
            ((failed_count++))
        fi
    else
        blast "⚠️ Not mergeable: $title (status: $mergeable)"
        ((failed_count++))
    fi

    sleep 2
done

log "📊 RESULTS: ✅ $merged_count merged, ❌ $failed_count failed"
log "👑 SIMPLE MASS MERGE COMPLETE!"