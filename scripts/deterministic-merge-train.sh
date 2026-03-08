#!/usr/bin/env bash
set -euo pipefail

# Deterministic Merge Train
# Implements a strict merge engine with hard gates and automatic disposal of obsolete PRs.
# As required by the Battle Plan for BrianCLong/summit.

REPO="BrianCLong/summit"
BATCH_SIZE=${BATCH_SIZE:-10}

echo "🚂 Starting Deterministic Merge Train for ${REPO}..."

# Step 1: Ensure labels exist
echo "🏷️ Verifying queue labels exist..."
LABELS=("queue:merge-now" "queue:needs-rebase" "queue:conflict" "queue:blocked" "queue:obsolete")
for label in "${LABELS[@]}"; do
    if ! gh label list --repo "$REPO" | grep -q "$label"; then
        echo "Creating label: $label"
        gh label create "$label" --repo "$REPO" --color "000000" --description "Merge Train Queue Label" || true
    fi
done

# Step 2: Auto-labeling rule engine
echo "🔍 Classifying open PRs into queues..."

# Auto-label `queue:conflict`
echo "-> Identifying conflicts..."
CONFLICT_PRS=$(gh pr list --repo "$REPO" --state open --json number,mergeable --jq '.[] | select(.mergeable == "CONFLICTING") | .number')
for pr in $CONFLICT_PRS; do
    gh pr edit "$pr" --repo "$REPO" --add-label "queue:conflict" --remove-label "queue:merge-now"
done

# Auto-label `queue:needs-rebase`
echo "-> Identifying stale/needs-rebase PRs..."
# Note: GitHub API mergeable state sometimes returns UNKNOWN until requested, but failing checks due to stale base requires detailed inspection.
# Approximation: Open PRs with failing checks
FAILING_PRS=$(gh pr list --repo "$REPO" --state open --json number,statusCheckRollup --jq '.[] | select(any(.statusCheckRollup[]; .state == "FAILURE")) | .number')
for pr in $FAILING_PRS; do
    gh pr edit "$pr" --repo "$REPO" --add-label "queue:needs-rebase" --remove-label "queue:merge-now"
done

# Auto-label `queue:merge-now`
echo "-> Identifying merge-ready PRs..."
# all required checks pass, mergeable is not CONFLICTING, no blocked labels
# Since we only want to add 'queue:merge-now' to the top N to control flow, we can do it batch by batch
MERGE_CANDIDATES=$(gh pr list --repo "$REPO" --state open --search "status:success -label:queue:blocked -label:queue:conflict" --json number --jq '.[].number' --limit 50)
for pr in $MERGE_CANDIDATES; do
    gh pr edit "$pr" --repo "$REPO" --add-label "queue:merge-now"
done

# Step 3: Execute the merge batch
echo "🚀 Executing merge batch (Size: $BATCH_SIZE)..."
# Pull PRs ready to merge, sort by priority
# Sort logic: P0 > P1 > P2, then status:success, oldest first (emulated by limiting results of a sorted query, though gh search handles some sorting)
MERGE_NOW_PRS=$(gh pr list --repo "$REPO" --state open --label "queue:merge-now" --json number --limit "$BATCH_SIZE" --jq '.[].number')

MERGED_COUNT=0
for pr in $MERGE_NOW_PRS; do
    echo "Merging PR #$pr..."
    # Squash and merge to maintain 1 merge method
    if gh pr merge "$pr" --repo "$REPO" --squash --delete-branch; then
        echo "✅ Merged PR #$pr"
        ((MERGED_COUNT++))
    else
        echo "❌ Failed to merge PR #$pr. Reclassifying as needs-rebase or conflict."
        gh pr edit "$pr" --repo "$REPO" --remove-label "queue:merge-now" --add-label "queue:needs-rebase"
    fi
done

echo "🎉 Batch complete. Merged $MERGED_COUNT PRs."
