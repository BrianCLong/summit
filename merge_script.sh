
#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -euo pipefail
[ -f ".orchestra.env" ] && set -a && . ./.orchestra.env && set +a

# Define the branches to merge.
BRANCHES_TO_MERGE=(
  "chore/dev-boost"
  "chore/dev-boost-apply"
  "chore/update-husky"
  "cleanup-test"
  "codex/ensure-mvp3-is-fully-functional"
  "codex/find-and-fix-important-codebase-bug"
  "codex/fix-data-modeling-inconsistencies-47s2l8"
  "feature/ai-ml-service"
  "feature/sprint7-insight-experience-polish"
  "perf/neighborhood-cache"
  "perf/neo4j-indexing"
  "security/multi-tenant"
)

# Checkout the main branch.
echo "Checking out the main branch..."
git checkout main

# Pull the latest changes from the remote repository.
echo "Pulling the latest changes from the remote repository..."
git pull origin main

# Merge each of the feature branches into the main branch.
for branch in "${BRANCHES_TO_MERGE[@]}"
do
  echo "Merging branch: $branch..."
  git merge "$branch"
  if [ $? -ne 0 ]; then
    echo "Merge conflict detected for branch: $branch. Please resolve the conflicts and then run the script again."
    exit 1
  fi
done

# Push the changes to the remote repository.
echo "Pushing the changes to the remote repository..."
git push origin main

echo "All branches have been merged successfully!"
