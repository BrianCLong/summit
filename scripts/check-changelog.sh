#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Checking CHANGELOG.md..."

# 1. Check for [Unreleased] section
if grep -q "\[Unreleased\]" CHANGELOG.md; then
    echo -e "${GREEN}✓ [Unreleased] section found${NC}"
else
    echo -e "${RED}Error: [Unreleased] section missing in CHANGELOG.md${NC}"
    exit 1
fi

# 2. Check if CHANGELOG.md is modified
# This check depends on git and being in a repo with history.
# We use git diff --name-only to check against origin/main.
# If origin/main is not available (shallow clone), this might fail or need fetching.
# We assume the CI environment will fetch appropriate depth.

TARGET_BRANCH="${1:-origin/main}"
echo "Checking for modifications relative to $TARGET_BRANCH..."

if ! git rev-parse --verify "$TARGET_BRANCH" >/dev/null 2>&1; then
    echo -e "${RED}Error: Target branch $TARGET_BRANCH not found. Ensure git fetch has been run.${NC}"
    # We exit 0 here to avoid blocking if git history is incomplete in some local envs,
    # but in strict CI this should probably fail.
    # For now, we'll fail to enforce the requirement.
    exit 1
fi

CHANGED_FILES=$(git diff --name-only "$TARGET_BRANCH"...HEAD)

if echo "$CHANGED_FILES" | grep -q "CHANGELOG.md"; then
    echo -e "${GREEN}✓ CHANGELOG.md has been modified${NC}"
else
    echo -e "${RED}Error: CHANGELOG.md was not modified in this PR.${NC}"
    echo "Please add a note to the [Unreleased] section."
    echo "If this PR does not require a changelog entry, add the 'skip-changelog' label to the PR."
    exit 1
fi

echo -e "${GREEN}Changelog check passed.${NC}"
