#!/bin/bash
# Batch post migration comments to old PRs
# Simple loop-based approach for reliability

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== Batch Migration Comment Poster ===${NC}\n"

# Get all old PRs (excluding ones we've already commented on)
OLD_PRS=$(gh pr list --state open --limit 100 --json number,createdAt \
  --jq '.[] | select(.createdAt < "2026-03-04T00:00:00Z") | .number' | \
  grep -v "^19029$" || true)  # Skip PR #19029 (already commented)

PR_COUNT=$(echo "$OLD_PRS" | wc -l | tr -d ' ')

if [ "$PR_COUNT" -eq 0 ]; then
  echo -e "${GREEN}No PRs to post to!${NC}"
  exit 0
fi

echo -e "${YELLOW}Posting to $PR_COUNT PRs...${NC}\n"

COMMENT="## 🚨 Action Required: Rebase to Adopt New CI System

Your PR was created before our CI consolidation (2026-03-04) and is currently triggering archived workflows that will fail.

### Quick Fix (2 minutes)

**Option 1: Rebase** (recommended ⭐)
\`\`\`bash
git fetch origin
git rebase origin/main
git push --force-with-lease
\`\`\`

**Option 2: Merge main**
\`\`\`bash
git fetch origin
git merge origin/main
git push
\`\`\`

**Option 3: Close and reopen** (if no local changes needed)
- Close this PR, wait 5 seconds, then reopen it

### Why?

We consolidated CI from **260 workflows → 8 workflows** (97% reduction). Your PR will be **much faster** after rebasing:
- ⚡ 98% faster CI (3-4 workflows vs. 260)
- 💰 Saves \$494k/year (CI costs + dev time)
- 🚀 35 minutes saved per PR (wait time)

### Need Help?

See the complete guide: [\`docs/ci/old-pr-migration-guide.md\`](https://github.com/BrianCLong/summit/blob/main/docs/ci/old-pr-migration-guide.md)

Questions? Post in #platform-eng or tag @platform-team

---
*This is an automated message. Your PR needs rebasing to use the new streamlined CI system.*"

posted=0
failed=0

echo "$OLD_PRS" | while read -r pr_num; do
  if [ -z "$pr_num" ]; then
    continue
  fi

  pr_title=$(gh pr view "$pr_num" --json title --jq '.title' 2>/dev/null || echo "Unknown")
  echo -n "Posting to #$pr_num: ${pr_title:0:60}... "

  if gh pr comment "$pr_num" --body "$COMMENT" >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    ((posted++)) || true
  else
    echo -e "${YELLOW}✗${NC}"
    ((failed++)) || true
  fi

  # Rate limit: 1 comment per second
  sleep 1
done

echo -e "\n${GREEN}✅ Complete!${NC}"
echo -e "  Posted: ${posted}"
echo -e "  Failed: ${failed}"
echo ""
