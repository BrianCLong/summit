#!/bin/bash
set -e

# setup_merge_queue.sh
#
# Usage: ./scripts/setup_merge_queue.sh <owner> <repo>
# Example: ./scripts/setup_merge_queue.sh my-org my-repo
#
# Prerequisites:
# - gh CLI installed (https://cli.github.com/)
# - gh auth login (with admin permissions)

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <owner> <repo>"
    echo "Example: $0 my-org my-repo"
    exit 1
fi

OWNER=$1
REPO=$2

echo "Configuring Merge Queue and Branch Protection for $OWNER/$REPO..."

# 1) Enforce Golden Main (Branch Protection)
echo "Setting branch protection for 'main'..."
gh api -X PUT repos/$OWNER/$REPO/branches/main/protection --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "ci/build",
      "ci/test",
      "lint",
      "security"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1
  },
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "restrictions": null
}
EOF

# 2) Enable GitHub Merge Queue (Merge Train)
echo "Enabling Merge Queue..."
gh api -X PUT repos/$OWNER/$REPO/merge-queue/settings --input - <<EOF
{
  "merge_queue_enabled": true,
  "merge_method": "squash",
  "max_entries_to_build": 3,
  "max_entries_to_merge": 1,
  "min_entries_to_merge": 1,
  "commit_message": "pull_request_title"
}
EOF

# 3) Create a “Ready for Queue” Control Label
echo "Creating 'queue:ready' label..."
gh label create queue:ready \
  --repo $OWNER/$REPO \
  --description "Approved, CI-green, enqueue for merge train" \
  --color 0E8A16 || echo "Label 'queue:ready' might already exist, skipping creation."

echo "---------------------------------------------------"
echo "✅ Configuration Complete!"
echo "Next steps:"
echo "1. Approve all currently green PRs."
echo "2. Apply 'queue:ready' label to them."
echo "3. Watch the train run."
echo "---------------------------------------------------"
