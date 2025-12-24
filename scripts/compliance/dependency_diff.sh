#!/bin/bash

BASE_REF=${1:-main}
TARGET_FILE=${2:-package.json}

echo "Generating dependency diff for $TARGET_FILE between $BASE_REF and HEAD..."

# Get old file
git show "$BASE_REF:$TARGET_FILE" > old_package.json 2>/dev/null

if [ ! -s old_package.json ]; then
  echo "{}" > old_package.json
fi

# Compare
node scripts/compliance/gen_dep_diff.js old_package.json "$TARGET_FILE"

# Cleanup
rm old_package.json
