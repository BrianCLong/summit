#!/bin/bash
# Local PR Bundle Merge Script for Green Train System
# This script merges the PR bundles in sequence, handling conflicts as needed

set -euo pipefail

echo "🚂 Starting Local PR Bundle Merge via Green Train System"

# Define PR bundle branches
PR_BUNDLES=("chore/pr-bundle-1" "chore/pr-bundle-2" "chore/pr-bundle-3" "chore/pr-bundle-4" "chore/pr-bundle-5")

# Function to merge a PR bundle
merge_pr_bundle() {
  local bundle=$1
  local bundle_num=${bundle#chore/pr-bundle-}
  
  echo "=== Processing PR Bundle $bundle_num ==="
  
  # Check if the branch exists
  if ! git show-ref --verify --quiet "refs/heads/$bundle"; then
    echo "❌ PR Bundle $bundle does not exist locally"
    return 1
  fi
  
  # Try to merge with allowing unrelated histories
  echo "Attempting to merge $bundle..."
  if git merge "$bundle" --allow-unrelated-histories --no-ff -m "Merge PR Bundle $bundle_num via Green Train merge system"; then
    echo "✅ Successfully merged $bundle"
    return 0
  else
    echo "⚠️  Merge conflicts detected for $bundle"
    # Abort the failed merge
    git merge --abort || true
    
    # Try a different approach - cherry-pick the commits
    echo "Trying cherry-pick approach for $bundle..."
    
    # Get all commits from the PR bundle that are not in current branch
    local commits
    commits=$(git log --oneline --no-merges --reverse HEAD.."$bundle" | cut -d' ' -f1)
    
    if [ -z "$commits" ]; then
      echo "No new commits to cherry-pick from $bundle"
      return 0
    fi
    
    echo "Cherry-picking commits from $bundle:"
    echo "$commits"
    
    # Cherry-pick each commit
    for commit in $commits; do
      echo "Cherry-picking $commit..."
      if ! git cherry-pick "$commit" -X theirs; then
        echo "Conflict during cherry-pick of $commit - resolving with ours"
        git cherry-pick --abort || true
        git cherry-pick "$commit" -X ours || {
          echo "Failed to cherry-pick $commit even with conflict resolution"
          return 1
        }
      fi
    done
    
    echo "✅ Successfully cherry-picked $bundle"
    return 0
  fi
}

# Process each PR bundle in sequence
for bundle in "${PR_BUNDLES[@]}"; do
  merge_pr_bundle "$bundle" || {
    echo "❌ Failed to merge $bundle - stopping merge train"
    exit 1
  }
done

echo "🎉 All PR bundles successfully processed!"
echo "📝 Next steps:"
echo "  1. Review the merged changes"
echo "  2. Run validation tests"
echo "  3. Proceed to Phase 4 enterprise-scale deployment"