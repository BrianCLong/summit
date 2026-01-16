#!/bin/bash
# Enrich specifically unenriched backlog issues

REPO="BrianCLong/summit"

# Get issues from Backlog without 'enriched' label
issues=$(gh issue list --repo "$REPO" --milestone "Backlog" --limit 200 --json number,labels | \
  jq -r '.[] | select(.labels | map(.name) | contains(["enriched"]) | not) | .number')

count=0
for issue_num in $issues; do
  [ -z "$issue_num" ] && continue

  # Get issue details
  details=$(gh issue view "$issue_num" --repo "$REPO" --json title,body,labels 2>/dev/null)
  [ -z "$details" ] && continue

  title=$(echo "$details" | jq -r '.title')
  body=$(echo "$details" | jq -r '.body // ""')

  # Skip if already has acceptance criteria
  if echo "$body" | grep -q "## Acceptance Criteria"; then
    gh issue edit "$issue_num" --repo "$REPO" --add-label "enriched" 2>/dev/null
    echo "Already has AC, added label #$issue_num"
    continue
  fi

  # Determine type from title
  type="task"
  lower_title=$(echo "$title" | tr '[:upper:]' '[:lower:]')
  case "$lower_title" in
    *security*|*cve*|*vuln*|*auth*|*encrypt*) type="security";;
    *test*|*spec*|*coverage*) type="test";;
    *doc*|*readme*|*guide*) type="docs";;
    *fix*|*bug*|*error*|*crash*) type="bug";;
    *feat*|*add*|*implement*|*create*) type="feature";;
    *ci*|*cd*|*pipeline*|*deploy*) type="ci_cd";;
  esac

  # Story points by type
  case "$type" in
    security) points=5;;
    bug) points=3;;
    feature) points=5;;
    docs) points=2;;
    test) points=3;;
    ci_cd) points=3;;
    *) points=3;;
  esac

  # Build enriched body
  cat > /tmp/issue_body_$issue_num.md << EOFBODY
$body

## Acceptance Criteria
- [ ] Task completed per specification
- [ ] Quality standards met
- [ ] Tests passing (if applicable)
- [ ] Documentation updated

## Story Points
**Estimate:** $points points

## Definition of Done
- [ ] Code complete and tested
- [ ] PR reviewed and approved
- [ ] CI/CD pipeline passing

## Links
- GitHub Issue: #$issue_num
- Milestone: Backlog
EOFBODY

  # Update the issue
  gh issue edit "$issue_num" --repo "$REPO" --body-file "/tmp/issue_body_$issue_num.md" 2>/dev/null
  gh issue edit "$issue_num" --repo "$REPO" --add-label "enriched" 2>/dev/null

  count=$((count + 1))
  echo "Enriched #$issue_num ($type) - $count done"

  # Rate limit after 50
  if [ $count -ge 50 ]; then
    break
  fi
done

echo ""
echo "✅ Enriched $count backlog issues"
