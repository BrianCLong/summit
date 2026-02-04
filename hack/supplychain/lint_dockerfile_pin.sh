#!/usr/bin/env bash
set -e

# Lint Dockerfile for pinning
# Rules:
# 1. No :latest tag
# 2. External FROM images must include @sha256:

FAILED=0

# Find all Dockerfiles if no args provided
if [ "$#" -eq 0 ]; then
    FILES=$(find . -name "Dockerfile*" -not -path "*/node_modules/*" -not -path "*/.git/*")
else
    FILES="$@"
fi

for f in $FILES; do
    echo "Linting $f..."

    if [ ! -f "$f" ]; then
        echo "WARN: File not found: $f"
        continue
    fi

    # Check for :latest
    if grep -q ":latest" "$f"; then
        echo "FAIL: $f uses :latest tag"
        grep -n ":latest" "$f"
        FAILED=1
    fi

    # Check for FROM lines
    while IFS= read -r line; do
        line=$(echo "$line" | sed 's/^[ \t]*//')

        # Check if line contains : but no @sha256:
        if [[ "$line" =~ : ]] && [[ ! "$line" =~ @sha256: ]]; then
            echo "FAIL: Unpinned image in $f: $line"
            FAILED=1
        fi

    done < <(grep "^FROM" "$f")
done

if [ $FAILED -eq 1 ]; then
    echo "Dockerfile lint failed. Please pin all external images by digest (@sha256:...). "
    exit 1
else
    echo "Dockerfile lint passed."
fi
