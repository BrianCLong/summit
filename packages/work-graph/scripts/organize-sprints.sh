#!/bin/bash
# Organize backlog issues into proper sprints

REPO="BrianCLong/summit"

echo "=== Organizing Issues into Sprints ==="
echo ""

# Function to move issues matching a pattern to a milestone
move_issues() {
  local pattern="$1"
  local milestone="$2"
  local limit="${3:-30}"

  echo "Moving issues matching '$pattern' to '$milestone'..."

  issues=$(gh issue list --repo "$REPO" --milestone "Backlog" --limit 500 --json number,title | \
    jq -r ".[] | select(.title | test(\"$pattern\"; \"i\")) | .number" | head -$limit)

  count=0
  for num in $issues; do
    gh issue edit "$num" --repo "$REPO" --milestone "$milestone" 2>/dev/null
    count=$((count + 1))
  done

  echo "  Moved $count issues to $milestone"
  echo ""
}

# Security issues -> Sprint 4
move_issues "security|cve|vuln|auth|encrypt|audit|compliance|stig|rbac|abac|firewall|mfa|csrf|xss" "Sprint 4: Security Hardening" 40

# Graph/database issues -> Sprint 5
move_issues "graph|neo4j|cypher|query|index|cache|performance|optimize|latency" "Sprint 5: Graph Performance" 30

# AI/ML issues -> Sprint 6
move_issues "ai|ml|model|nlp|embedding|vector|llm|gpt|claude|inference|training" "Sprint 6: AI/ML Foundation" 30

# API/Integration issues -> Sprint 7
move_issues "api|rest|graphql|webhook|integration|connector|sdk|client" "Sprint 7: Integration & APIs" 30

# Testing issues -> Sprint 8
move_issues "test|spec|coverage|jest|cypress|e2e|unit|integration test|qa|quality" "Sprint 8: Testing & Quality" 30

echo "=== Sprint Organization Complete ==="

# Show updated counts
echo ""
echo "Updated Milestone Counts:"
for milestone in "Sprint 1: Governance & Critical Security" "Sprint 2: CI/CD & Release Ops" "Sprint 3: Docker & Containerization" "Sprint 4: Security Hardening" "Sprint 5: Graph Performance" "Sprint 6: AI/ML Foundation" "Sprint 7: Integration & APIs" "Sprint 8: Testing & Quality" "Backlog"; do
  count=$(gh issue list --repo "$REPO" --milestone "$milestone" --state open --limit 1000 --json number 2>/dev/null | jq length)
  echo "  $milestone: $count"
done
