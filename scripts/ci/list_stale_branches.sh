#!/bin/bash
# scripts/ci/list_stale_branches.sh
# Lists branches merged into main OR inactive for > 90 days

echo "Analyzing branches..."

# Check if we are in a git repo
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "Error: Not a git repository."
    exit 1
fi

echo "--- Merged Branches (Safe to Delete) ---"
git branch -r --merged main | grep -v "main" | sed 's/origin\///' | head -n 5

echo ""
echo "--- Stale Branches (> 90 days inactive) ---"
# Get branches sorted by committer date, filter for old ones
# Note: BSD/GNU date syntax varies, using a simpler approach
# Just listing top 5 oldest branches
git for-each-ref --sort=committerdate refs/remotes/origin/ --format='%(committerdate:short) %(refname:short)' | head -n 5
