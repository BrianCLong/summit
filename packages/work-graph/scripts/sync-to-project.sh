#!/bin/bash
# Sync all sprint items to GitHub Project #19

REPO="BrianCLong/summit"
PROJECT_NUM=19

echo "=== Adding New Sprint Items to Project #$PROJECT_NUM ==="

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
  echo "Adding items from $sprint..."

  # Get issues in this sprint
  issues=$(gh issue list --repo "$REPO" --milestone "$sprint" --limit 500 --json number | jq -r '.[].number')

  for num in $issues; do
    gh project item-add $PROJECT_NUM --owner BrianCLong --url "https://github.com/$REPO/issues/$num" 2>/dev/null
  done

  echo "  Done"
done

echo ""
echo "Project sync complete"
