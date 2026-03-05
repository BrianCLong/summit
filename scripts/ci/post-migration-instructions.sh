#!/bin/bash
# Post migration instructions to old PRs
# PRs created before 2026-03-04 need rebasing to adopt new CI system

set -euo pipefail

DRY_RUN=${DRY_RUN:-true}  # Default to dry run for safety

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== CI Migration Guide Poster ===${NC}\n"

# Find PRs created before consolidation date
CUTOFF_DATE="2026-03-04"
OLD_PRS=$(gh pr list --state open --limit 100 --json number,createdAt,title,author \
  --jq ".[] | select(.createdAt < \"$CUTOFF_DATE\") | .number")

PR_COUNT=$(echo "$OLD_PRS" | wc -l | tr -d ' ')

if [ "$PR_COUNT" -eq 0 ]; then
  echo -e "${GREEN}No old PRs found. All PRs are using new CI system!${NC}"
  exit 0
fi

echo -e "${YELLOW}Found $PR_COUNT PRs needing migration guidance${NC}\n"

# Migration comment template
read -r -d '' COMMENT << 'EOF' || true
## 🚨 Action Required: Rebase to Adopt New CI System

Your PR was created before our CI consolidation (2026-03-04) and is currently triggering archived workflows that will fail.

### Quick Fix (2 minutes)

**Option 1: Rebase** (recommended ⭐)
```bash
git fetch origin
git checkout YOUR_BRANCH
git rebase origin/main
git push --force-with-lease
```

**Option 2: Merge main**
```bash
git fetch origin
git merge origin/main
git push
```

**Option 3: Close and reopen** (if no local changes needed)
- Close this PR, wait 5 seconds, then reopen it

### Why?

We consolidated CI from **260 workflows → 8 workflows** (97% reduction). Your PR will be **much faster** after rebasing:
- ⚡ 98% faster CI (3-4 workflows vs. 260)
- 💰 Saves $494k/year (CI costs + dev time)
- 🚀 35 minutes saved per PR (wait time)

### Need Help?

See the complete guide: [`docs/ci/old-pr-migration-guide.md`](https://github.com/BrianCLong/summit/blob/main/docs/ci/old-pr-migration-guide.md)

Questions? Post in #platform-eng or tag @platform-team

---
*This is an automated message. Your PR needs rebasing to use the new streamlined CI system.*
EOF

if [ "$DRY_RUN" = "true" ]; then
  echo -e "${YELLOW}DRY RUN MODE - No comments will be posted${NC}\n"
  echo -e "${BLUE}Would post to these PRs:${NC}"
  echo "$OLD_PRS" | while read -r pr_num; do
    pr_info=$(gh pr view "$pr_num" --json number,title,author --jq '"\(.number): \(.title) (@\(.author.login))"')
    echo -e "  #$pr_info"
  done
  echo -e "\n${BLUE}Comment preview:${NC}"
  echo "$COMMENT"
  echo -e "\n${YELLOW}To actually post comments, run:${NC}"
  echo -e "${GREEN}DRY_RUN=false bash scripts/ci/post-migration-instructions.sh${NC}"
else
  echo -e "${GREEN}Posting migration instructions to $PR_COUNT PRs...${NC}\n"

  posted=0
  failed=0

  echo "$OLD_PRS" | while read -r pr_num; do
    pr_info=$(gh pr view "$pr_num" --json number,title --jq '"\(.number): \(.title)"')
    echo -e "Posting to #$pr_info"

    if gh pr comment "$pr_num" --body "$COMMENT" 2>&1; then
      ((posted++)) || true
      echo -e "${GREEN}  ✓ Posted${NC}"
    else
      ((failed++)) || true
      echo -e "${YELLOW}  ✗ Failed${NC}"
    fi
  done

  echo -e "\n${GREEN}✅ Complete!${NC}"
  echo -e "  Posted: $posted"
  echo -e "  Failed: $failed"
fi

echo ""
