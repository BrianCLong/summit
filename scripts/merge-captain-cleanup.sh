#!/bin/bash
# Branch Cleanup Automation Script
# Helps identify and close stale, merged, and superseded branches
# Safe to run - only analyzes, doesn't delete without confirmation

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
OUTPUT_DIR="${REPO_ROOT}/.merge-captain"
mkdir -p "$OUTPUT_DIR"

echo "🔍 Merge Captain: Branch Cleanup Analysis"
echo "=========================================="
echo ""

# Check if gh is available
if ! command -v gh &> /dev/null; then
    echo "⚠️  GitHub CLI (gh) not found. Install with:"
    echo "   curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg"
    echo "   sudo apt-get update && sudo apt-get install -y gh"
    echo ""
    echo "Continuing with git-only analysis..."
    USE_GH=false
else
    echo "✅ GitHub CLI found"
    USE_GH=true
fi

# Update main
echo ""
echo "📥 Fetching latest from origin..."
git fetch origin --quiet

# Analysis outputs
ALREADY_MERGED="${OUTPUT_DIR}/already-merged-branches.txt"
ANCIENT_BRANCHES="${OUTPUT_DIR}/ancient-branches.txt"
STALE_AUTO_REMEDIATION="${OUTPUT_DIR}/stale-auto-remediation.txt"
DISTANT_BRANCHES="${OUTPUT_DIR}/distant-branches.txt"

# Clear previous results
> "$ALREADY_MERGED"
> "$ANCIENT_BRANCHES"
> "$STALE_AUTO_REMEDIATION"
> "$DISTANT_BRANCHES"

echo "🔍 Analyzing branches..."
echo ""

# Counters
already_merged_count=0
ancient_count=0
stale_remediation_count=0
distant_count=0

# Analyze each remote branch
git branch -r | grep -v 'HEAD' | sed 's|origin/||' | while read -r branch; do
    # Skip main
    if [ "$branch" = "main" ]; then
        continue
    fi

    # Get ahead/behind counts
    ahead_behind=$(git rev-list --left-right --count "origin/main...origin/$branch" 2>/dev/null || echo "0 0")
    behind=$(echo "$ahead_behind" | awk '{print $1}')
    ahead=$(echo "$ahead_behind" | awk '{print $2}')

    # Check if already merged (0 commits ahead)
    if [ "$ahead" -eq 0 ]; then
        echo "$branch" >> "$ALREADY_MERGED"
        ((already_merged_count++))
        echo "  ✓ Already merged: $branch"
        continue
    fi

    # Check for ancient branches (7000+ commits ahead)
    if [ "$ahead" -gt 7000 ]; then
        echo "$branch (behind: $behind, ahead: $ahead)" >> "$ANCIENT_BRANCHES"
        ((ancient_count++))
        echo "  🚨 ANCIENT: $branch ($ahead commits ahead!)"
        continue
    fi

    # Check for stale auto-remediation (pattern match + old date)
    if [[ "$branch" =~ ^auto-remediation/state-update-202601(1[0-9]|2[01]) ]]; then
        echo "$branch (behind: $behind)" >> "$STALE_AUTO_REMEDIATION"
        ((stale_remediation_count++))
        echo "  🧹 Stale auto-remediation: $branch"
        continue
    fi

    # Check for distant branches (> 150 commits behind)
    if [ "$behind" -gt 150 ]; then
        echo "$branch (behind: $behind, ahead: $ahead)" >> "$DISTANT_BRANCHES"
        ((distant_count++))
    fi
done

echo ""
echo "📊 Analysis Complete"
echo "===================="
echo ""
echo "Already Merged (0 unique commits):     $already_merged_count branches"
echo "Ancient (7000+ commits ahead):         $ancient_count branches  🚨 DANGER"
echo "Stale Auto-Remediation (old):          $stale_remediation_count branches"
echo "Distant (> 150 commits behind):        $distant_count branches"
echo ""
echo "📁 Results saved to:"
echo "  $ALREADY_MERGED"
echo "  $ANCIENT_BRANCHES"
echo "  $STALE_AUTO_REMEDIATION"
echo "  $DISTANT_BRANCHES"
echo ""

# Generate cleanup commands
CLEANUP_SCRIPT="${OUTPUT_DIR}/cleanup-commands.sh"
cat > "$CLEANUP_SCRIPT" << 'CLEANUP_EOF'
#!/bin/bash
# Generated cleanup commands
# Review before executing!

set -euo pipefail

echo "🚨 BRANCH CLEANUP EXECUTION"
echo "==========================="
echo ""
echo "⚠️  This will close PRs and delete branches."
echo "Review the branch lists before proceeding."
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

CLEANUP_EOF

# Add ancient branches cleanup (PRIORITY 1)
if [ "$ancient_count" -gt 0 ]; then
    cat >> "$CLEANUP_SCRIPT" << 'CLEANUP_EOF'

echo ""
echo "🚨 Priority 1: Closing ANCIENT branches (catastrophic merge risk)..."
while IFS= read -r line; do
    branch=$(echo "$line" | awk '{print $1}')
    echo "  Closing: $branch"
    gh pr close $(gh pr list --head "$branch" --json number -q '.[0].number') \
        --comment "⚠️ CLOSING: Branch too diverged (7000+ commits ahead) - catastrophic merge risk. Please open fresh PR if still needed." \
        --delete-branch || echo "    ⚠️  Failed to close (may not have PR)"
done < .merge-captain/ancient-branches.txt
CLEANUP_EOF
fi

# Add already-merged cleanup
if [ "$already_merged_count" -gt 0 ]; then
    cat >> "$CLEANUP_SCRIPT" << 'CLEANUP_EOF'

echo ""
echo "✅ Closing already-merged branches..."
while IFS= read -r branch; do
    echo "  Closing: $branch"
    gh pr close $(gh pr list --head "$branch" --json number -q '.[0].number') \
        --comment "Closing: Changes already merged into main" \
        --delete-branch || echo "    ⚠️  Failed to close (may not have PR)"
done < .merge-captain/already-merged-branches.txt
CLEANUP_EOF
fi

# Add stale auto-remediation cleanup
if [ "$stale_remediation_count" -gt 0 ]; then
    cat >> "$CLEANUP_SCRIPT" << 'CLEANUP_EOF'

echo ""
echo "🧹 Closing stale auto-remediation branches..."
while IFS= read -r line; do
    branch=$(echo "$line" | awk '{print $1}')
    echo "  Closing: $branch"
    gh pr close $(gh pr list --head "$branch" --json number -q '.[0].number') \
        --comment "Superseded by newer state updates" \
        --delete-branch || echo "    ⚠️  Failed to close (may not have PR)"
done < .merge-captain/stale-auto-remediation.txt
CLEANUP_EOF
fi

cat >> "$CLEANUP_SCRIPT" << 'CLEANUP_EOF'

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary:"
echo "  - Check closed PRs: gh pr list --state closed --limit 20"
echo "  - Remaining branches: git branch -r | wc -l"
CLEANUP_EOF

chmod +x "$CLEANUP_SCRIPT"

echo "🚀 Cleanup script generated:"
echo "  $CLEANUP_SCRIPT"
echo ""
echo "To execute cleanup (with confirmation prompt):"
echo "  $CLEANUP_SCRIPT"
echo ""

# Summary with urgency
if [ "$ancient_count" -gt 0 ]; then
    echo "🚨 URGENT: $ancient_count ancient branches detected!"
    echo "   These pose a catastrophic merge risk."
    echo "   Recommend immediate closure."
    echo ""
fi

if [ "$already_merged_count" -gt 0 ]; then
    echo "✅ Quick win: $already_merged_count already-merged branches can be closed immediately"
    echo ""
fi

total_cleanup=$((already_merged_count + ancient_count + stale_remediation_count))
echo "📈 Total cleanup potential: $total_cleanup branches"
echo ""
echo "Next steps:"
echo "  1. Review the lists in $OUTPUT_DIR"
echo "  2. Run $CLEANUP_SCRIPT to execute cleanup"
echo "  3. Monitor with: git branch -r | wc -l"
