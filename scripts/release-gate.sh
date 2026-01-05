#!/bin/bash
set -e

# Default values
TAG="v0.0.0-pr-synthetic"
OVERRIDE_FREEZE=false
OVERRIDE_REASON=""
FINAL_OUTPUT_DIR="dist/release"

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --tag) TAG="$2"; shift ;;
        --override-freeze) OVERRIDE_FREEZE=true ;;
        --override-reason) OVERRIDE_REASON="$2"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

echo "🚀 Starting Release Gate..."
echo "   Tag: $TAG"
echo "   Override Freeze: $OVERRIDE_FREEZE"
if [ "$OVERRIDE_FREEZE" = true ]; then
    echo "   Override Reason: $OVERRIDE_REASON"
    export CHANGE_FREEZE_OVERRIDE=true
    export CHANGE_FREEZE_REASON="$OVERRIDE_REASON"
fi

# Ensure final output directory exists
mkdir -p "$FINAL_OUTPUT_DIR"

# 1. Run Evidence Bundle Generation
# Use a temporary top-level directory to avoid `cd ..` issues in the called script
TEMP_BUNDLE_DIR="release_gate_temp"
rm -rf "$TEMP_BUNDLE_DIR"
mkdir -p "$TEMP_BUNDLE_DIR"

echo "📦 Generating Release Evidence Bundle..."
# Arguments: VERSION, ARTIFACT_NAME, BUILD_METADATA, OUTPUT_DIR
HEAD_SHA=$(git rev-parse HEAD || echo "unknown")
bash scripts/bundle-release-evidence.sh "$TAG" "summit-platform-pr" "$HEAD_SHA" "$TEMP_BUNDLE_DIR"

# Move artifacts to final destination
cp -r "$TEMP_BUNDLE_DIR"/* "$FINAL_OUTPUT_DIR/"
rm -rf "$TEMP_BUNDLE_DIR"

# 2. Run Release Verification (Dry Run)
echo "✅ Verifying Release State..."
# Pass args to verify-release if needed.
# Since version mismatch is a known issue in the repo, we allow failure for version check only?
# No, verify-release.sh exits 1 on error.
# We will run it and expect it to pass. If it fails due to existing repo issues, the gate will validly fail.
bash scripts/verify-release.sh --dry-run

# 3. Run Release Creation (Software Bundle)
echo "📦 Generating Software Release Bundle..."
# create-release.sh outputs to release/ directory relative to CWD.
# Warning: If release/ exists and is checked in, we should not delete it.
# We will create a temp dir and run create-release.sh there if possible, but the script hardcodes /tmp/release and then mv to release/.
# So we have to deal with release/ being created/modified.
# We will rename the output artifact immediately and not delete the directory if it wasn't empty.
# Actually, create-release.sh does `mkdir -p release/` then `mv /tmp/release.tar.gz release/`.
# So it puts the file into `release/`.
bash scripts/create-release.sh

# Move software bundle to final output directory
if [ -f "release/release.tar.gz" ]; then
    mv release/release.tar.gz "$FINAL_OUTPUT_DIR/summit-release-${TAG}.tar.gz"
    echo "   Moved release bundle to $FINAL_OUTPUT_DIR/summit-release-${TAG}.tar.gz"
    # Do NOT delete release/ directory as it may contain other files.
    # Just remove the artifact if it was still there (mv removed it).
fi

# 4. Summary
echo "🎉 Release Gate Complete!"
echo "   Artifacts available in $FINAL_OUTPUT_DIR"

if [ -n "$GITHUB_STEP_SUMMARY" ]; then
    echo "## 🚀 Release Gate: READY" >> "$GITHUB_STEP_SUMMARY"
    echo "" >> "$GITHUB_STEP_SUMMARY"
    echo "**Version:** \`$TAG\`" >> "$GITHUB_STEP_SUMMARY"
    echo "**Status:** ✅ Passed" >> "$GITHUB_STEP_SUMMARY"
    echo "" >> "$GITHUB_STEP_SUMMARY"
    echo "### Artifacts" >> "$GITHUB_STEP_SUMMARY"
    echo "- Evidence Bundle: \`summit-release-${TAG}-evidence.tar.gz\`" >> "$GITHUB_STEP_SUMMARY"
    echo "- Software Bundle: \`summit-release-${TAG}.tar.gz\`" >> "$GITHUB_STEP_SUMMARY"
fi
