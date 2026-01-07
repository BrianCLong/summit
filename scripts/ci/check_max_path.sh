#!/bin/bash
# Checks if any file in the current directory (recursively) exceeds a max path length
# Used in CI to prevent artifacts from breaking download actions

MAX_LEN=${1:-250}
ROOT_DIR=${2:-.}

echo "Checking for paths longer than $MAX_LEN in $ROOT_DIR..."

found=0
while read -r file; do
    len=${#file}
    if [ "$len" -gt "$MAX_LEN" ]; then
        echo "❌ Path too long ($len chars): $file"
        found=1
    fi
done < <(find "$ROOT_DIR" -type f)

if [ "$found" -eq 1 ]; then
    echo "Fail: Found paths exceeding max length."
    exit 1
else
    echo "✅ No path length violations found."
    exit 0
fi
