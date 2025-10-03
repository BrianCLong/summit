#!/usr/bin/env bash
# Final verification for Oct 2025 delivery
set -euo pipefail

echo "🔍 Final Verification Suite"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# A. Get stable count with retries
echo "A. Project #8 count (with retries)..."
retries=5
delay=2
count=0

for i in $(seq 1 $retries); do
  count=$(gh project item-list 8 --owner BrianCLong --limit 500 --format json 2>/dev/null | jq '.items | length' 2>/dev/null || echo "0")
  if [ "$count" -gt 0 ]; then
    echo "   Attempt $i: $count items"
    break
  fi
  sleep $delay
done

csv_expected=$(($(wc -l < project_management/october2025_sprint_tracker.csv) - 1))
echo "   Target: $csv_expected"
echo "   Actual: $count"
gap=$((csv_expected - count))

if [ "$gap" -eq 0 ]; then
  echo "   ✅ 104/104 COMPLETE"
else
  echo "   ⚠️  Gap: $gap remaining"
fi

# B. Snapshot projects
echo ""
echo "B. Creating snapshots..."
mkdir -p artifacts
gh project item-list 7 --owner BrianCLong --limit 500 --format json > artifacts/project7_final_$(date +%Y%m%d).json 2>/dev/null
gh project item-list 8 --owner BrianCLong --limit 500 --format json > artifacts/project8_final_$(date +%Y%m%d).json 2>/dev/null
echo "   ✅ Snapshots saved"

# C. Check for orphans
echo ""
echo "C. Orphan detection..."
gh issue list --state open --limit 1000 --json url,title 2>/dev/null | \
  jq -r '.[] | select(.title|startswith("[")) | .url' | \
  sort > /tmp/all_sprint.txt

gh project item-list 7 --owner BrianCLong --limit 500 --format json 2>/dev/null | \
  jq -r '.items[]?.content?.url // empty' > /tmp/p7.txt
gh project item-list 8 --owner BrianCLong --limit 500 --format json 2>/dev/null | \
  jq -r '.items[]?.content?.url // empty' > /tmp/p8.txt

cat /tmp/p7.txt /tmp/p8.txt | sort -u > /tmp/both.txt

orphans=$(comm -23 /tmp/all_sprint.txt /tmp/both.txt | wc -l | tr -d ' ')
echo "   Orphans: $orphans"

if [ "$orphans" -eq 0 ]; then
  echo "   ✅ Zero orphans"
else
  echo "   ⚠️  Found orphans:"
  comm -23 /tmp/all_sprint.txt /tmp/both.txt | head -5
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary:"
echo "  Project #7: $(jq '.items | length' artifacts/project7_final_$(date +%Y%m%d).json 2>/dev/null || echo '?') items"
echo "  Project #8: $count/$csv_expected items"
echo "  Orphans: $orphans"
echo "  Gap: $gap"
echo ""

if [ "$gap" -eq 0 ] && [ "$orphans" -eq 0 ]; then
  echo "✅ VERIFICATION PASSED - Ready for execution"
  exit 0
else
  echo "⚠️  VERIFICATION INCOMPLETE - See details above"
  exit 1
fi
