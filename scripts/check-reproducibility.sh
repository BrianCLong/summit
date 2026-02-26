#!/bin/bash
# Build Reproducibility Check for Summit Platform
# Verifies that builds are deterministic and reproducible

set -e

echo "🔄 Starting Build Reproducibility Check..."

# Configuration
ARTIFACT_NAME=${1:-"summit-platform"}
BUILD_COMMAND=${2:-"npm run build"}
BUILD_ENV=${3:-"production"}
NUM_BUILDS=${4:-2}
TEMP_DIR=${5:-"build-test"} # Changed default from ./build-test to build-test to avoid rsync exclude issues
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Normalize TEMP_DIR
# If it starts with ./, strip it for the rsync exclude pattern
EXCLUDE_DIR=${TEMP_DIR#./}

# Create temporary directory for builds
mkdir -p "$TEMP_DIR"

echo "⚙️  Configuration:"
echo "   Artifact: $ARTIFACT_NAME"
echo "   Command: $BUILD_COMMAND"
echo "   Environment: $BUILD_ENV"
echo "   Test builds: $NUM_BUILDS"
echo "   Temp Dir: $TEMP_DIR"

# Function to perform a single build
perform_build() {
    local build_number=$1
    local build_dir="$TEMP_DIR/build-$build_number"
    
    echo "📦 Performing build #$build_number..."
    
    # Create isolated build directory
    mkdir -p "$build_dir"
    
    # Copy source to build directory to isolate
    # We exclude the temp dir itself to prevent infinite recursion if it's inside the source tree
    rsync -a --exclude="$EXCLUDE_DIR" --exclude="node_modules" --exclude=".git" . "$build_dir/"
    
    # Change to build directory
    cd "$build_dir"
    
    # Set reproducible environment variables
    export SOURCE_DATE_EPOCH=$(date +%s)
    export LC_ALL=C
    export TZ=UTC
    
    # Run the build command
    eval "$BUILD_COMMAND"
    
    # Calculate checksum of build output
    # We need to go back to the original directory to find the checksum file relative to TEMP_DIR
    # or use absolute paths. Here we stay in build_dir but write checksums there.

    if [ -d "dist" ]; then
        find "dist" -type f -exec sha256sum {} \; | sort -k2 > "checksums.txt"
    elif [ -f "$ARTIFACT_NAME" ]; then
        sha256sum "$ARTIFACT_NAME" > "checksums.txt"
    else
        # If no standard output directory, checksum all files in dist if it exists, or common build artifacts
        if [ -d "dist" ]; then
             find "dist" -type f -exec sha256sum {} \; | sort -k2 > "checksums.txt"
        else
             # Fallback: look for likely build artifacts in current dir
             find . -maxdepth 2 -not -path '*/.*' -name "*.js" -o -name "*.ts" -o -name "*.json" -o -name "*.html" -o -name "*.css" | grep -v "node_modules" | xargs sha256sum | sort -k2 > "checksums.txt"
        fi
    fi
    
    echo "✅ Build #$build_number completed, checksums calculated"
    # Return to original directory
    cd - > /dev/null
}

# Perform multiple builds
for i in $(seq 1 $NUM_BUILDS); do
    perform_build $i
done

# Compare checksums between builds
echo "🔍 Comparing build outputs..."

# Get the first build's checksum file
FIRST_CHECKSUM_FILE="$TEMP_DIR/build-1/checksums.txt"

if [ ! -f "$FIRST_CHECKSUM_FILE" ]; then
    echo "❌ Error: First build checksum file not found at $FIRST_CHECKSUM_FILE"
    exit 1
fi

# Compare each subsequent build with the first
ALL_MATCH=true
FAILURE_DETAILS=""

for i in $(seq 2 $NUM_BUILDS); do
    BUILD_CHECKSUM_FILE="$TEMP_DIR/build-$i/checksums.txt"
    
    if [ ! -f "$BUILD_CHECKSUM_FILE" ]; then
        echo "❌ Error: Build #$i checksum file not found"
        exit 1
    fi
    
    echo "  - Comparing build #1 with build #$i..."
    
    if diff -q "$FIRST_CHECKSUM_FILE" "$BUILD_CHECKSUM_FILE" >/dev/null; then
        echo "  ✅ Build #1 and #$i checksums match"
    else
        echo "  ❌ Build #1 and #$i checksums do NOT match"
        ALL_MATCH=false
        FAILURE_DETAILS="$FAILURE_DETAILS
Build #1 vs #$i mismatch:
$(diff "$FIRST_CHECKSUM_FILE" "$BUILD_CHECKSUM_FILE" || echo "Diff command failed")"
    fi
done

# Create reproducibility report
REPORT_FILE="$TEMP_DIR/reproducibility-report-$TIMESTAMP.json"
cat > "$REPORT_FILE" << EOF
{
  "testTimestamp": "$TIMESTAMP",
  "artifactName": "$ARTIFACT_NAME",
  "buildCommand": "$BUILD_COMMAND",
  "environment": "$BUILD_ENV",
  "numBuilds": $NUM_BUILDS,
  "allChecksumsMatch": $ALL_MATCH,
  "builds": [
EOF

for i in $(seq 1 $NUM_BUILDS); do
    CHECKSUM_FILE="$TEMP_DIR/build-$i/checksums.txt"
    if [ -f "$CHECKSUM_FILE" ]; then
        CHECKSUM_COUNT=$(wc -l < "$CHECKSUM_FILE")
        echo "    {
      \"buildNumber\": $i,
      \"checksumCount\": $CHECKSUM_COUNT,
      \"checksumFile\": \"$CHECKSUM_FILE\"
    }$(if [ $i -lt $NUM_BUILDS ]; then echo ","; fi)" >> "$REPORT_FILE"
    fi
done

cat >> "$REPORT_FILE" << EOF
  ],
  "failureDetails": $(if [ "$ALL_MATCH" = true ]; then echo "null"; else echo "\"$FAILURE_DETAILS\""; fi)
}
EOF

# Cleanup unless keeping for debugging
if [ "${KEEP_BUILD_OUTPUTS:-false}" = false ]; then
    echo "🧹 Cleaning up build outputs..."
    rm -rf "$TEMP_DIR/build-"*
fi

# Output result
if [ "$ALL_MATCH" = true ]; then
    echo "✅ Build Reproducibility Check PASSED"
    echo "   All $NUM_BUILDS builds produced identical outputs"
    echo "   Report: $REPORT_FILE"
    exit 0
else
    echo "❌ Build Reproducibility Check FAILED"
    echo "   Build outputs were not identical"
    echo "   Report: $REPORT_FILE"
    echo "   $FAILURE_DETAILS"
    exit 1
fi
