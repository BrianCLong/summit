#!/bin/bash
# PR Analysis and Categorization Script for IntelGraph
# Analyzes open PRs and suggests actions for burn-down

set -e

echo "🔍 IntelGraph PR Analysis & Burn-Down Plan"
echo "=========================================="

# Check if gh CLI is available
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is required. Install: https://cli.github.com/"
    exit 1
fi

# Export PR data to CSV
echo "📊 Exporting PR inventory..."
gh pr list --limit 50 --json number,title,author,mergeable,reviewDecision,isDraft,labels,updatedAt,additions,deletions \
  | jq -r '.[] | [
      .number,
      .title,
      .author.login,
      (if .isDraft then "DRAFT" else "OPEN" end),
      (if .mergeable=="MERGEABLE" then "READY" else (.mergeable // "UNKNOWN") end),
      (.reviewDecision // "PENDING"),
      ([.labels[].name]|join("|")),
      .updatedAt,
      (.additions + .deletions)
    ] | @csv' > pr-inventory.csv

echo "✅ PR inventory saved to pr-inventory.csv"

# Analyze PR categories
echo ""
echo "📋 PR Categorization:"
echo "===================="

# Count PRs by status
READY_COUNT=$(gh pr list --search "is:open -is:draft" --json mergeable | jq '[.[] | select(.mergeable=="MERGEABLE")] | length')
CONFLICT_COUNT=$(gh pr list --search "is:open -is:draft" --json mergeable | jq '[.[] | select(.mergeable=="CONFLICTING")] | length')
DRAFT_COUNT=$(gh pr list --search "is:draft" --json number | jq 'length')
DEPENDABOT_COUNT=$(gh pr list --search "is:open author:app/dependabot" --json number | jq 'length')

echo "✅ Ready to merge: $READY_COUNT PRs"
echo "⚠️  Has conflicts: $CONFLICT_COUNT PRs"  
echo "📝 Draft PRs: $DRAFT_COUNT PRs"
echo "🤖 Dependabot PRs: $DEPENDABOT_COUNT PRs"

echo ""
echo "🎯 Recommended Actions:"
echo "======================"

# Ready to merge PRs
if [ "$READY_COUNT" -gt 0 ]; then
    echo "1. 🚀 Auto-merge ready PRs:"
    gh pr list --search "is:open -is:draft" --json number,title,mergeable \
      | jq -r '.[] | select(.mergeable=="MERGEABLE") | "   PR #\(.number): \(.title)"'
    echo "   Command: gh pr merge --squash --auto <PR_NUMBER>"
fi

# Conflict PRs  
if [ "$CONFLICT_COUNT" -gt 0 ]; then
    echo ""
    echo "2. 🔧 Resolve conflicts:"
    gh pr list --search "is:open -is:draft" --json number,title,mergeable \
      | jq -r '.[] | select(.mergeable=="CONFLICTING") | "   PR #\(.number): \(.title)"'
    echo "   Action: Rebase or merge main into feature branch"
fi

# Large PRs (> 500 LOC)
echo ""
echo "3. 📏 Large PRs requiring review:"
gh pr list --json number,title,additions,deletions \
  | jq -r '.[] | select((.additions + .deletions) > 500) | "   PR #\(.number): \(.title) (\(.additions + .deletions) LOC)"'

# Old PRs (> 7 days)
echo ""
echo "4. ⏰ Stale PRs (>7 days old):"
WEEK_AGO=$(date -d '7 days ago' --iso-8601 2>/dev/null || date -v-7d +%Y-%m-%d)
gh pr list --json number,title,updatedAt \
  | jq -r --arg week_ago "$WEEK_AGO" '.[] | select(.updatedAt < $week_ago) | "   PR #\(.number): \(.title)"'

echo ""
echo "🛠️  Quick Actions:"
echo "================="
echo "• Label dependabot PRs for automerge:"
echo "  gh pr list --search 'author:app/dependabot is:open' --json number | jq -r '.[].number' | xargs -I {} gh pr edit {} --add-label automerge"
echo ""
echo "• Enable automerge for all ready PRs:"
echo "  gh pr list --search 'is:open -is:draft' --json number,mergeable | jq -r '.[] | select(.mergeable==\"MERGEABLE\") | .number' | xargs -I {} gh pr merge {} --squash --auto"
echo ""
echo "• Bulk close stale draft PRs:"
echo "  gh pr list --search 'is:draft' --json number,updatedAt | jq -r --arg week_ago '$WEEK_AGO' '.[] | select(.updatedAt < \$week_ago) | .number' | xargs -I {} gh pr close {}"

echo ""
echo "📈 Next Steps:"
echo "=============="
echo "1. Review pr-inventory.csv for detailed analysis"
echo "2. Run suggested quick actions above"
echo "3. Set up branch protection with merge queue"
echo "4. Enable auto-labeling and CODEOWNERS"
echo "5. Monitor PR flow metrics daily"

echo ""
echo "✅ Analysis complete! Check pr-inventory.csv for full data."