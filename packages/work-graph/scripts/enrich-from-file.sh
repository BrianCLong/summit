#!/bin/bash
# Enrich issues from a file of issue numbers

REPO="BrianCLong/summit"
INPUT_FILE="${1:-/tmp/unenriched_issues.txt}"
BATCH_SIZE="${2:-50}"

count=0
while read -r issue_num; do
  [ -z "$issue_num" ] && continue

  # Get issue details
  title=$(gh issue view "$issue_num" --repo "$REPO" --json title -q .title 2>/dev/null)
  body=$(gh issue view "$issue_num" --repo "$REPO" --json body -q '.body // ""' 2>/dev/null)

  # Skip if already enriched
  if echo "$body" | grep -q "## Acceptance Criteria"; then
    gh issue edit "$issue_num" --repo "$REPO" --add-label "enriched" 2>/dev/null
    echo "Already enriched #$issue_num"
    continue
  fi

  # Determine type and points
  type="task"
  points=3

  lower_title=$(echo "$title" | tr '[:upper:]' '[:lower:]')
  case "$lower_title" in
    *security*|*cve*|*vuln*|*auth*|*encrypt*) type="security"; points=5;;
    *test*|*spec*|*coverage*) type="test";;
    *doc*|*readme*|*guide*) type="docs"; points=2;;
    *fix*|*bug*|*error*|*crash*) type="bug";;
    *feat*|*add*|*implement*|*create*) type="feature"; points=5;;
    *ci*|*cd*|*pipeline*|*deploy*) type="ci_cd";;
  esac

  # Write enriched body
  cat > "/tmp/issue_body_$issue_num.md" << ENDOFBODY
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
ENDOFBODY

  gh issue edit "$issue_num" --repo "$REPO" --body-file "/tmp/issue_body_$issue_num.md" 2>/dev/null
  gh issue edit "$issue_num" --repo "$REPO" --add-label "enriched" 2>/dev/null

  count=$((count + 1))
  echo "Enriched #$issue_num ($type) - $count done"

  if [ $count -ge "$BATCH_SIZE" ]; then
    break
  fi
done < "$INPUT_FILE"

echo ""
echo "✅ Enriched $count issues from file"
