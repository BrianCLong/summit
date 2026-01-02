#!/bin/bash
# tools/update-query-allowlist.sh
# Updates the GraphQL query allowlist by extracting queries from client code

set -e

echo "🚀 Starting GraphQL Query Allowlist Update Process..."

# Configuration
CLIENT_DIR=${1:-"./client/src"}
OUTPUT_FILE=${2:-"./server/query-allowlist.json"}
TEMP_DIR="./temp-extraction"
TIMESTAMP=$(date -u +"%Y%m%d-%H%M%S")
EXTRACT_ONLY=${3:-false}

echo "⚙️  Configuration:"
echo "   Client Directory: $CLIENT_DIR"
echo "   Output File: $OUTPUT_FILE"
echo "   Temp Directory: $TEMP_DIR"

# Check if node is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

# Create temp directory
mkdir -p "$TEMP_DIR"

# Extract queries using the extraction tool
echo "🔍 Extracting GraphQL queries from $CLIENT_DIR..."
node tools/extract-graphql-queries.js "$CLIENT_DIR" "$TEMP_DIR/extracted-queries-$TIMESTAMP.json" --env "${NODE_ENV:-development}"

# Verify that extraction was successful
if [ ! -f "$TEMP_DIR/extracted-queries-$TIMESTAMP.json" ]; then
    echo "❌ Query extraction failed - no output file created"
    exit 1
fi

EXTRACTED_COUNT=$(jq -r 'length' "$TEMP_DIR/extracted-queries-$TIMESTAMP.json" 2>/dev/null || echo "0")

if [ "$EXTRACTED_COUNT" -eq 0 ]; then
    echo "⚠️  No queries were extracted - check the source directory"
    echo "   Directory checked: $CLIENT_DIR"
    exit 0
fi

echo "✅ Successfully extracted $EXTRACTED_COUNT queries"

# If extract-only mode, skip updating the main allowlist
if [ "$EXTRACT_ONLY" = "true" ] || [ "$EXTRACT_ONLY" = "--dry-run" ]; then
    echo "📋 Extract only mode - saving to: $TEMP_DIR/extracted-queries-$TIMESTAMP.json"
    echo "✨ Query extraction completed (dry run)"
    exit 0
fi

# Update the main allowlist file
echo "📝 Updating main allowlist file: $OUTPUT_FILE"

# If the output file exists, merge with existing queries
if [ -f "$OUTPUT_FILE" ]; then
    echo "🔄 Merging with existing allowlist..."
    
    # Create a backup of the current allowlist
    cp "$OUTPUT_FILE" "$OUTPUT_FILE.backup-$TIMESTAMP"
    echo "   Backup created: $OUTPUT_FILE.backup-$TIMESTAMP"
    
    # Combine existing and new queries, removing duplicates
    TEMP_EXISTING="$TEMP_DIR/existing-queries-$TIMESTAMP.json"
    TEMP_NEW="$TEMP_DIR/new-queries-$TIMESTAMP.json"
    TEMP_MERGED="$TEMP_DIR/merged-queries-$TIMESTAMP.json"
    
    # Extract existing and new queries
    jq -c '.[]' "$OUTPUT_FILE" > "$TEMP_EXISTING" || echo "[]"
    jq -c '.[]' "$TEMP_DIR/extracted-queries-$TIMESTAMP.json" > "$TEMP_NEW" || echo "[]"
    
    # Combine and remove duplicates
    cat "$TEMP_EXISTING" "$TEMP_NEW" | sort | uniq > "$TEMP_MERGED"
    
    # Convert back to array format
    jq -ncR '[inputs]' "$TEMP_MERGED" > "$OUTPUT_FILE" || echo "[]" > "$OUTPUT_FILE"
else
    # First time creation - just copy the extracted queries
    cp "$TEMP_DIR/extracted-queries-$TIMESTAMP.json" "$OUTPUT_FILE"
fi

# Validate the output file
MERGED_COUNT=$(jq -r 'length' "$OUTPUT_FILE" 2>/dev/null || echo "0")

echo "✅ Allowlist updated successfully!"
echo "   Total queries in allowlist: $MERGED_COUNT"
echo "   Updated file: $OUTPUT_FILE"

# Create summary report
SUMMARY_FILE="$TEMP_DIR/allowlist-update-summary-$TIMESTAMP.json"
cat > "$SUMMARY_FILE" << EOF
{
  "timestamp": "$TIMESTAMP",
  "clientDirectory": "$CLIENT_DIR",
  "outputFile": "$OUTPUT_FILE",
  "newlyExtracted": $EXTRACTED_COUNT,
  "totalInAllowlist": $MERGED_COUNT,
  "previousCount": $(($MERGED_COUNT - $EXTRACTED_COUNT < 0 ? 0 : $MERGED_COUNT - $EXTRACTED_COUNT)),
  "updateMode": "merge"
}
EOF

echo "📊 Update summary: $SUMMARY_FILE"

# Cleanup unless keeping temp files
if [ "${KEEP_TEMP_FILES:-false}" = false ]; then
    echo "🧹 Cleaning up temporary files..."
    rm -rf "$TEMP_DIR"
else
    echo "📁 Keeping temporary files in: $TEMP_DIR"
fi

# Verification
if [ -f "$OUTPUT_FILE" ]; then
    FINAL_COUNT=$(jq -r 'length' "$OUTPUT_FILE" 2>/dev/null || echo "0")
    if [ "$FINAL_COUNT" -ge "$EXTRACTED_COUNT" ]; then
        echo "🎉 GraphQL query allowlist update completed successfully!"
        echo "   Total queries in final allowlist: $FINAL_COUNT"
        echo "   Output file: $OUTPUT_FILE"
    else
        echo "❌ Something went wrong - final count is less than expected"
        exit 1
    fi
else
    echo "❌ Output allowlist file was not created"
    exit 1
fi