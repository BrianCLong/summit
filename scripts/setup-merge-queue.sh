#!/bin/bash
set -e

# Setup Merge Queue for the repository
# Usage: ./scripts/setup-merge-queue.sh [OWNER/REPO]

REPO=$1

if [ -z "$REPO" ]; then
  # Try to guess from git remote
  REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || true)
  if [ -z "$REPO" ]; then
    echo "Usage: $0 <owner/repo>"
    echo "Error: Could not determine repository from current directory."
    exit 1
  fi
fi

echo "Configuring Merge Queue for $REPO..."

# 1. Protect main and require checks
echo "Applying branch protection rules to 'main'..."
gh api -X PUT "repos/$REPO/branches/main/protection" --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "CI Core Gate ✅",
      "CI Verify Gate ✅"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": true
}
EOF

# 2. Enable the merge queue
echo "Enabling Merge Queue..."
gh api -X PUT "repos/$REPO/merge-queue/settings" --input - <<EOF
{
  "merge_queue_enabled": true,
  "max_entries_to_build": 5,
  "max_entries_to_merge": 1,
  "min_entries_to_merge": 1,
  "commit_message": "pull_request_title",
  "merge_method": "squash"
}
EOF

echo "✅ Merge Queue configured successfully for $REPO!"
echo "Required checks: 'CI Core Gate ✅', 'CI Verify Gate ✅'"
