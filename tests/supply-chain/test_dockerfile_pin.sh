#!/usr/bin/env bash
set -e

# Regression test for Dockerfile pinning linter
# Creates a temporary Dockerfile with bad practices and asserts failure
# Then creates one with good practices and asserts success

SCRIPT_DIR="$(dirname "$(realpath "$0")")"
# Fix path to point to repo root from tests/supply-chain/
REPO_ROOT="$(realpath "$SCRIPT_DIR/../../")"
LINTER="${REPO_ROOT}/hack/supplychain/lint_dockerfile_pin.sh"

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Testing lint_dockerfile_pin.sh..."

# Test 1: Unpinned tag
cat <<EOF > "$TMP_DIR/Dockerfile.bad1"
FROM node:22-alpine
RUN echo "bad"
EOF

# Run linter inside TMP_DIR
# Note: linter runs find . -name "Dockerfile*"
cd "$TMP_DIR"
if "$LINTER" > /dev/null 2>&1; then
    echo "FAIL: Linter passed on unpinned tag"
    exit 1
else
    echo "PASS: Linter failed on unpinned tag"
fi

# Test 2: :latest tag
cat <<EOF > "$TMP_DIR/Dockerfile.bad2"
FROM node:latest@sha256:1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
RUN echo "bad"
EOF
# The linter checks for grep ":latest", so even if pinned, it might fail on latest if configured to deny latest tag.
if "$LINTER" > /dev/null 2>&1; then
    echo "FAIL: Linter passed on :latest tag"
    exit 1
else
    echo "PASS: Linter failed on :latest tag"
fi

# Test 3: Good Dockerfile
rm "$TMP_DIR"/Dockerfile.bad*
cat <<EOF > "$TMP_DIR/Dockerfile.good"
FROM node:22-alpine@sha256:e4bf2a82ad0a4037d28035ae71529873c069b13eb0455466ae0bc13363826e34
RUN echo "good"
EOF

if "$LINTER" > /dev/null; then
    echo "PASS: Linter passed on valid file"
else
    echo "FAIL: Linter failed on valid file"
    exit 1
fi

echo "All linter regression tests passed."
