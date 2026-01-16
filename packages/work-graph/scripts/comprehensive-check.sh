#!/bin/bash
# Comprehensive status check for all PM work

REPO="BrianCLong/summit"

echo "=============================================="
echo "   COMPREHENSIVE PM STATUS CHECK"
echo "=============================================="
echo ""

echo "=== ISSUE COUNTS ==="
total=$(gh issue list --repo "$REPO" --state open --limit 2000 --json number | jq length)
echo "Total open issues: $total"

backlog=$(gh issue list --repo "$REPO" --milestone Backlog --limit 500 --json number | jq length)
echo "Backlog issues: $backlog"

no_milestone=$(gh issue list --repo "$REPO" --state open --limit 2000 --json number,milestone | jq '[.[] | select(.milestone == null)] | length')
echo "Issues without milestone: $no_milestone"

echo ""
echo "=== SPRINT BREAKDOWN ==="

declare -a sprints=(
  "Sprint 1: Governance & Critical Security"
  "Sprint 2: CI/CD & Release Ops"
  "Sprint 3: Docker & Containerization"
  "Sprint 4: Security Hardening"
  "Sprint 5: Graph Performance"
  "Sprint 6: AI/ML Foundation"
  "Sprint 7: Integration & APIs"
  "Sprint 8: Testing & Quality"
  "Sprint 9: Documentation"
  "Sprint 10: UI/UX Polish"
)

scheduled_total=0
for sprint in "${sprints[@]}"; do
  count=$(gh issue list --repo "$REPO" --milestone "$sprint" --limit 500 --json number | jq length)
  scheduled_total=$((scheduled_total + count))
  echo "$sprint: $count"
done

echo ""
echo "Total scheduled: $scheduled_total"

echo ""
echo "=== ENRICHMENT STATUS ==="
enriched=$(gh issue list --repo "$REPO" --label enriched --limit 2000 --json number | jq length)
echo "Enriched issues: $enriched"

# Check for unenriched issues in sprints
echo ""
echo "=== UNENRICHED ISSUES BY SPRINT ==="
unenriched_total=0
for sprint in "${sprints[@]}"; do
  unenriched=$(gh issue list --repo "$REPO" --milestone "$sprint" --limit 500 --json number,labels | \
    jq '[.[] | select(.labels | map(.name) | contains(["enriched"]) | not)] | length')
  if [ "$unenriched" -gt 0 ]; then
    echo "$sprint: $unenriched unenriched"
    unenriched_total=$((unenriched_total + unenriched))
  fi
done

if [ "$unenriched_total" -eq 0 ]; then
  echo "All sprint issues are enriched!"
else
  echo ""
  echo "Total unenriched in sprints: $unenriched_total"
fi

echo ""
echo "=== LABELS STATUS ==="
for i in 1 2 3 4 5 6 7 8 9 10; do
  labeled=$(gh issue list --repo "$REPO" --label "sprint:$i" --limit 500 --json number | jq length)
  echo "sprint:$i label: $labeled issues"
done

echo ""
echo "=== PROJECT BOARD STATUS ==="
project_items=$(gh project item-list 19 --owner BrianCLong --limit 2000 --format json 2>/dev/null | jq '.items | length' 2>/dev/null || echo "N/A")
echo "Items in Project #19: $project_items"

echo ""
echo "=============================================="
echo "   CHECK COMPLETE"
echo "=============================================="
