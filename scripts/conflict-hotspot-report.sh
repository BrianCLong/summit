#!/usr/bin/env bash
set -euo pipefail

# Generate a report of files with the most change contention
# Helps identify candidates for CODEOWNERS and edit queues

DAYS="${1:-90}"
LIMIT="${2:-20}"

echo "=== Conflict Hotspot Report ===" >&2
echo "Analyzing commits from the last ${DAYS} days" >&2
echo "Showing top ${LIMIT} files by change frequency" >&2
echo "" >&2

RANGE="${DAYS} days ago"

echo "File,Changes,% of Total" > /tmp/hotspot-report.csv

# Get total commit count for percentage calculation
TOTAL_COMMITS=$(git log --all --oneline --since="$RANGE" | wc -l | tr -d ' ')

echo "Total commits in period: ${TOTAL_COMMITS}" >&2
echo "" >&2

git log --all --oneline --since="$RANGE" --name-only \
 | grep -v '^[a-f0-9]' \
 | sed '/^$/d' \
 | sort \
 | uniq -c \
 | sort -rn \
 | head -"$LIMIT" \
 | while read -r count file; do
    # Calculate percentage
    pct=$(awk "BEGIN {printf \"%.1f\", ($count / $TOTAL_COMMITS) * 100}")
    echo "${file},${count},${pct}%" >> /tmp/hotspot-report.csv
    printf "%4d  %-6s  %s\n" "$count" "(${pct}%)" "$file"
  done

echo "" >&2
echo "Detailed CSV saved to: /tmp/hotspot-report.csv" >&2
echo "" >&2
echo "=== Recommendations ===" >&2
echo "1. Add top 10 files to .github/CODEOWNERS" >&2
echo "2. Consider edit queues for files changed >50 times" >&2
echo "3. Use feature flags instead of direct edits to hot paths" >&2
