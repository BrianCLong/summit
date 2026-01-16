#!/bin/bash
# Enrich backlog issues in batch

REPO="BrianCLong/summit"

# Get issues from Backlog milestone without the 'enriched' label
issues=$(gh issue list --repo "$REPO" --milestone "Backlog" --limit 100 --json number,title,labels | \
  jq -r '.[] | select(.labels | map(.name) | contains(["enriched"]) | not) | .number')

count=0
for issue_num in $issues; do
  # Get issue details
  details=$(gh issue view "$issue_num" --repo "$REPO" --json title,body,labels)
  title=$(echo "$details" | jq -r '.title')
  body=$(echo "$details" | jq -r '.body // ""')
  
  # Skip if already has acceptance criteria
  if echo "$body" | grep -q "## Acceptance Criteria"; then
    continue
  fi
  
  # Determine type from title/labels
  type="task"
  if echo "$title" | grep -qi "security\|cve\|vuln\|auth\|encrypt"; then
    type="security"
  elif echo "$title" | grep -qi "test\|spec\|coverage"; then
    type="test"
  elif echo "$title" | grep -qi "doc\|readme\|guide"; then
    type="docs"
  elif echo "$title" | grep -qi "fix\|bug\|error\|crash"; then
    type="bug"
  elif echo "$title" | grep -qi "feat\|add\|implement\|create"; then
    type="feature"
  elif echo "$title" | grep -qi "ci\|cd\|pipeline\|deploy\|github action"; then
    type="ci_cd"
  elif echo "$title" | grep -qi "ai\|ml\|model\|nlp\|embedding"; then
    type="ai_ml"
  fi
  
  # Generate acceptance criteria based on type
  case "$type" in
    security)
      ac="## Acceptance Criteria
- [ ] Security issue identified and documented
- [ ] Fix implemented and verified
- [ ] Security scan passes
- [ ] No regression in existing functionality"
      points=5
      ;;
    bug)
      ac="## Acceptance Criteria
- [ ] Root cause identified
- [ ] Fix implemented
- [ ] Regression test added
- [ ] QA verification passed"
      points=3
      ;;
    feature)
      ac="## Acceptance Criteria
- [ ] Feature implemented per specification
- [ ] Unit tests written with >80% coverage
- [ ] Integration tests passing
- [ ] Documentation updated"
      points=5
      ;;
    docs)
      ac="## Acceptance Criteria
- [ ] Documentation written/updated
- [ ] Examples provided
- [ ] Technical review passed
- [ ] Published to docs site"
      points=2
      ;;
    test)
      ac="## Acceptance Criteria
- [ ] Tests implemented
- [ ] Coverage threshold met
- [ ] CI integration verified
- [ ] Test documentation added"
      points=3
      ;;
    ci_cd)
      ac="## Acceptance Criteria
- [ ] Pipeline configuration updated
- [ ] All stages passing
- [ ] Performance acceptable
- [ ] Rollback tested"
      points=3
      ;;
    ai_ml)
      ac="## Acceptance Criteria
- [ ] Model/algorithm implemented
- [ ] Accuracy metrics validated
- [ ] Performance benchmarked
- [ ] Integration tested"
      points=8
      ;;
    *)
      ac="## Acceptance Criteria
- [ ] Task completed per specification
- [ ] Quality standards met
- [ ] Documentation updated
- [ ] Stakeholder sign-off"
      points=3
      ;;
  esac
  
  # Build enriched body
  enriched_body="$body

$ac

## Story Points
**Estimate:** $points points

## Definition of Done
- [ ] Code complete and tested
- [ ] PR reviewed and approved
- [ ] CI/CD pipeline passing
- [ ] Product sign-off

## Links
- GitHub Issue: #$issue_num
- Milestone: Backlog"
  
  # Update the issue
  echo "$enriched_body" > /tmp/issue_body_$issue_num.md
  gh issue edit "$issue_num" --repo "$REPO" --body-file "/tmp/issue_body_$issue_num.md" 2>/dev/null
  gh issue edit "$issue_num" --repo "$REPO" --add-label "enriched" 2>/dev/null
  
  count=$((count + 1))
  echo "Enriched #$issue_num ($type) - $count done"
  
  # Rate limit
  if [ $count -ge 50 ]; then
    break
  fi
done

echo ""
echo "✅ Enriched $count backlog issues"
