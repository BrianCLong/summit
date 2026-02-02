#!/bin/bash
REPO_ROOT=$(pwd)
SCRIPT_PATH="$REPO_ROOT/ci/gates/dependency-delta.sh"

TEST_DIR=$(mktemp -d)
echo "Running test in $TEST_DIR"
cd "$TEST_DIR"
git init
git config user.email "test@example.com"
git config user.name "Test User"

# Initial commit
touch package-lock.json
mkdir -p docs/supply-chain
touch docs/supply-chain/dependency-delta.md
git add .
git commit -m "Initial commit"

# Test Case 1: Failure - Modify lockfile without doc update
echo "change" >> package-lock.json
git add package-lock.json
git commit -m "Update dependencies"

echo "Running gate check (expect failure)..."
if "$SCRIPT_PATH"; then
  echo "FAIL: Gate passed but should have failed."
  exit 1
else
  echo "PASS: Gate failed as expected."
fi

# Test Case 2: Success - Modify lockfile AND doc
echo "change doc" >> docs/supply-chain/dependency-delta.md
git add docs/supply-chain/dependency-delta.md
git commit --amend --no-edit

echo "Running gate check (expect success)..."
if "$SCRIPT_PATH"; then
  echo "PASS: Gate passed as expected."
else
  echo "FAIL: Gate failed but should have passed."
  exit 1
fi

rm -rf "$TEST_DIR"
echo "All tests passed."
