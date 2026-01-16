#!/bin/bash
# Enrich all remaining unenriched issues across all sprints

REPO="BrianCLong/summit"

echo "=============================================="
echo "   ENRICHING ALL REMAINING ISSUES"
echo "=============================================="
echo ""

# Get all issues NOT labeled as enriched, across all sprints
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

total_enriched=0

for sprint in "${sprints[@]}"; do
  echo "Processing $sprint..."

  # Get unenriched issues in this sprint
  issues=$(gh issue list --repo "$REPO" --milestone "$sprint" --limit 500 --json number,title,labels | \
    jq -r '.[] | select(.labels | map(.name) | contains(["enriched"]) | not) | "\(.number)|\(.title)"')

  count=0
  while IFS='|' read -r num title; do
    [ -z "$num" ] && continue

    # Determine story points based on title keywords
    points=3
    if echo "$title" | grep -qiE "security|CVE|vuln|auth|encrypt"; then
      points=5
    elif echo "$title" | grep -qiE "test|spec|lint"; then
      points=3
    elif echo "$title" | grep -qiE "doc|readme|comment"; then
      points=2
    elif echo "$title" | grep -qiE "refactor|cleanup|fix"; then
      points=3
    elif echo "$title" | grep -qiE "feature|implement|add|create"; then
      points=5
    fi

    # Create enriched body
    body="## Acceptance Criteria
- [ ] Implementation meets requirements
- [ ] Code reviewed and approved
- [ ] Tests written and passing
- [ ] Documentation updated if needed
- [ ] No regressions introduced

## Story Points
**Estimate:** $points points

## Definition of Done
- [ ] Code complete and tested
- [ ] PR reviewed and approved
- [ ] CI/CD pipeline passing
- [ ] Deployed to staging and verified

## Links
- Sprint: $sprint
- GitHub: https://github.com/$REPO/issues/$num"

    # Update the issue
    gh issue edit "$num" --repo "$REPO" --body "$body" --add-label "enriched" 2>/dev/null && {
      count=$((count + 1))
      echo -n "."
    }

    # Rate limit
    sleep 0.3
  done <<< "$issues"

  if [ $count -gt 0 ]; then
    echo " enriched $count"
    total_enriched=$((total_enriched + count))
  else
    echo " (none needed)"
  fi
done

echo ""
echo "=============================================="
echo "   ENRICHMENT COMPLETE"
echo "=============================================="
echo "Total newly enriched: $total_enriched"
echo "Total enriched issues: $(gh issue list --repo "$REPO" --label enriched --limit 1500 --json number | jq length)"
