#!/bin/bash
set -e

# Reproducible Builds Sanity Check
# This script runs the client build twice in separate temporary directories
# and compares the output to ensure reproducibility.

# Ensure we are in the root of the repo
REPO_ROOT=$(pwd)

# Create two temporary directories for the builds
TEMP_DIR=$(mktemp -d)
BUILD1_DIR="$TEMP_DIR/build1"
BUILD2_DIR="$TEMP_DIR/build2"

echo "Reproducible Builds Sanity Check"
echo "================================"
echo "Repo Root: $REPO_ROOT"
echo "Temp Dir: $TEMP_DIR"

# Clean up function
cleanup() {
  echo "Cleaning up..."
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# Run Build 1
echo "Running Build 1..."
cd "$REPO_ROOT/client"
# Use --emptyOutDir to allow building outside of root
npm run build -- --outDir "$BUILD1_DIR" --emptyOutDir
echo "Build 1 completed."

# Run Build 2
echo "Running Build 2..."
cd "$REPO_ROOT/client"
npm run build -- --outDir "$BUILD2_DIR" --emptyOutDir
echo "Build 2 completed."

# Compare the outputs
echo "Comparing builds..."

# Calculate hashes of all files in the output directories, relative to the build dir
# We use find to list files, sort them to ensure order, and then hash them.
# We then strip the build directory prefix to make the output comparable.

get_hashes() {
  local dir=$1
  cd "$dir"
  find . -type f | sort | xargs sha256sum
}

HASHES1=$(get_hashes "$BUILD1_DIR")
HASHES2=$(get_hashes "$BUILD2_DIR")

if [ "$HASHES1" = "$HASHES2" ]; then
  echo "SUCCESS: Builds are reproducible!"
  exit 0
else
  echo "FAILURE: Builds are NOT reproducible."
  echo "Diff:"
  diff <(echo "$HASHES1") <(echo "$HASHES2")
  exit 1
fi
