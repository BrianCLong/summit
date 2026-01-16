#!/bin/bash
# Add sprint:N labels to all issues in each sprint

REPO="BrianCLong/summit"

echo "=============================================="
echo "   ADDING SPRINT LABELS TO ALL ISSUES"
echo "=============================================="
echo ""

declare -a sprints=(
  "Sprint 1: Governance & Critical Security|sprint:1"
  "Sprint 2: CI/CD & Release Ops|sprint:2"
  "Sprint 3: Docker & Containerization|sprint:3"
  "Sprint 4: Security Hardening|sprint:4"
  "Sprint 5: Graph Performance|sprint:5"
  "Sprint 6: AI/ML Foundation|sprint:6"
  "Sprint 7: Integration & APIs|sprint:7"
  "Sprint 8: Testing & Quality|sprint:8"
  "Sprint 9: Documentation|sprint:9"
  "Sprint 10: UI/UX Polish|sprint:10"
)

total_labeled=0

for sprint_info in "${sprints[@]}"; do
  IFS='|' read -r milestone label <<< "$sprint_info"
  echo "Processing $milestone..."

  # Get issues in this sprint without the sprint label
  issues=$(gh issue list --repo "$REPO" --milestone "$milestone" --limit 500 --json number,labels | \
    jq -r ".[] | select(.labels | map(.name) | contains([\"$label\"]) | not) | .number")

  count=0
  for num in $issues; do
    gh issue edit "$num" --repo "$REPO" --add-label "$label" 2>/dev/null && count=$((count + 1))
  done

  if [ $count -gt 0 ]; then
    echo "  Added $label to $count issues"
    total_labeled=$((total_labeled + count))
  else
    echo "  All issues already labeled"
  fi
done

echo ""
echo "=============================================="
echo "   LABELING COMPLETE"
echo "=============================================="
echo "Total issues labeled: $total_labeled"
