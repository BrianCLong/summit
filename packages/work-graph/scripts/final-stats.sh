#!/bin/bash
# Get final sprint statistics

REPO="BrianCLong/summit"

echo "=============================================="
echo "       FINAL SPRINT STATISTICS"
echo "=============================================="
echo ""

total_scheduled=0

# Sprint milestones
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

for sprint in "${sprints[@]}"; do
  count=$(gh issue list --repo "$REPO" --milestone "$sprint" --limit 500 --json number | jq length)
  total_scheduled=$((total_scheduled + count))
  echo "$sprint: $count issues"
done

echo ""
echo "----------------------------------------------"
backlog=$(gh issue list --repo "$REPO" --milestone "Backlog" --limit 1000 --json number | jq length)
echo "Backlog: $backlog issues"
echo "Total Scheduled: $total_scheduled issues"
echo ""
echo "=============================================="
echo "       ENRICHMENT STATUS"
echo "=============================================="
enriched=$(gh issue list --repo "$REPO" --label enriched --limit 1000 --json number | jq length)
echo "Enriched issues: $enriched"
echo ""
echo "=============================================="
echo "       PROJECT BOARD STATUS"
echo "=============================================="
project_items=$(gh project item-list 19 --owner BrianCLong --limit 1000 --format json 2>/dev/null | jq '.items | length' 2>/dev/null || echo "N/A")
echo "Items in Project #19: $project_items"
