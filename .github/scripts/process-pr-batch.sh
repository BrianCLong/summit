#!/bin/bash
# Batch PR processor - updates workflow files in PRs

set -e

BATCH_FILE="$1"
WORKFLOW_CONTENT=$(base64 < .github/workflows/_reusable-ci-fast.yml)

updated=0
skipped=0

while IFS=: read -r pr_num branch_name; do
  echo "Processing PR #$pr_num ($branch_name)..."

  # Get workflow file SHA
  sha=$(gh api "repos/BrianCLong/summit/contents/.github/workflows/_reusable-ci-fast.yml?ref=$branch_name" \
    --jq '.sha' 2>/dev/null || echo "")

  if [ -z "$sha" ]; then
    echo "⏭️ Skipping PR #$pr_num (no workflow file)"
    skipped=$((skipped + 1))
    continue
  fi

  # Update workflow file via API
  if gh api -X PUT "repos/BrianCLong/summit/contents/.github/workflows/_reusable-ci-fast.yml" \
    -f message="chore(ci): mega-merge auto-update [skip ci]" \
    -f content="$WORKFLOW_CONTENT" \
    -f sha="$sha" \
    -f branch="$branch_name" >/dev/null 2>&1; then

    echo "✅ Updated PR #$pr_num"
    updated=$((updated + 1))
  else
    echo "⚠️ Failed to update PR #$pr_num"
    skipped=$((skipped + 1))
  fi

  sleep 0.5  # Rate limit protection

done < "$BATCH_FILE"

echo "Batch complete: $updated updated, $skipped skipped"
