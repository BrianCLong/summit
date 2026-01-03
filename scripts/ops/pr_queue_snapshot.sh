#!/usr/bin/env bash
#
# pr_queue_snapshot.sh - Generate PR queue triage report from GitHub
#
# Usage:
#   ./scripts/ops/pr_queue_snapshot.sh [--output FILE] [--limit N]
#
# Options:
#   --output FILE   Output file (default: docs/ops/PR_QUEUE.md)
#   --limit N       Max PRs to fetch (default: 200)
#   --json          Output raw JSON instead of markdown
#
# Requires:
#   - gh (GitHub CLI) authenticated
#
set -euo pipefail

# Configuration
OUTPUT_FILE="docs/ops/PR_QUEUE.md"
LIMIT=200
JSON_OUTPUT=false
REPO="${GITHUB_REPOSITORY:-BrianCLong/summit}"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --limit)
            LIMIT="$2"
            shift 2
            ;;
        --json)
            JSON_OUTPUT=true
            shift
            ;;
        -h|--help)
            head -15 "$0" | tail -12
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check for gh CLI
if ! command -v gh &> /dev/null; then
    echo "Error: gh (GitHub CLI) is required but not installed."
    echo "Install: https://cli.github.com/"
    echo ""
    echo "To proceed without gh, run these commands manually and save output:"
    echo "  gh pr list --repo $REPO --state open --json number,title,headRefName,isDraft,additions,deletions,updatedAt --limit $LIMIT"
    exit 1
fi

# Check gh auth
if ! gh auth status &> /dev/null 2>&1; then
    echo "Error: gh is not authenticated. Run: gh auth login"
    exit 1
fi

echo "Fetching open PRs from $REPO..."

# Fetch PR list with detailed info
PR_DATA=$(gh pr list --repo "$REPO" --state open --json number,title,headRefName,isDraft,additions,deletions,updatedAt,author,labels --limit "$LIMIT" 2>/dev/null || echo "[]")

if [[ "$PR_DATA" == "[]" ]] || [[ -z "$PR_DATA" ]]; then
    echo "No open PRs found or unable to fetch."
    exit 0
fi

# Get detailed info for each PR (checks, mergeable)
PR_COUNT=$(echo "$PR_DATA" | jq length)
echo "Found $PR_COUNT open PRs. Analyzing..."

# Create temp file for enriched data
ENRICHED_FILE=$(mktemp)
echo "[]" > "$ENRICHED_FILE"

# Function to classify PR priority
classify_pr() {
    local title="$1"
    local additions="$2"
    local deletions="$3"
    local labels="$4"
    local branch="$5"

    local total_lines=$((additions + deletions))

    # P0: GA gates, CI, security, release automation
    if echo "$title" | grep -qiE "(GA|release|ci|security|supply.?chain|SLSA|SOC|compliance|critical|urgent|hotfix)"; then
        echo "P0"
        return
    fi

    # P0: Has priority labels
    if echo "$labels" | grep -qiE "(P0|critical|urgent|blocker)"; then
        echo "P0"
        return
    fi

    # P2: Mega PRs (>500 files or >10k lines)
    if [[ $total_lines -gt 10000 ]]; then
        echo "P2"
        return
    fi

    # P1: High value but not gating
    if echo "$title" | grep -qiE "(feat|fix|perf|refactor)"; then
        echo "P1"
        return
    fi

    # P2: Everything else
    echo "P2"
}

# Process each PR
for i in $(seq 0 $((PR_COUNT - 1))); do
    PR=$(echo "$PR_DATA" | jq ".[$i]")
    NUMBER=$(echo "$PR" | jq -r '.number')
    TITLE=$(echo "$PR" | jq -r '.title')
    BRANCH=$(echo "$PR" | jq -r '.headRefName')
    IS_DRAFT=$(echo "$PR" | jq -r '.isDraft')
    ADDITIONS=$(echo "$PR" | jq -r '.additions')
    DELETIONS=$(echo "$PR" | jq -r '.deletions')
    UPDATED=$(echo "$PR" | jq -r '.updatedAt')
    AUTHOR=$(echo "$PR" | jq -r '.author.login // "unknown"')
    LABELS=$(echo "$PR" | jq -r '[.labels[].name] | join(",")')

    # Get check status (rate-limited, do for top 50 only)
    CHECK_STATUS="unknown"
    MERGEABLE="unknown"
    if [[ $i -lt 50 ]]; then
        PR_DETAIL=$(gh pr view "$NUMBER" --repo "$REPO" --json statusCheckRollup,mergeable 2>/dev/null || echo '{}')
        if [[ -n "$PR_DETAIL" ]] && [[ "$PR_DETAIL" != "{}" ]]; then
            CHECK_STATUS=$(echo "$PR_DETAIL" | jq -r '.statusCheckRollup | if . == null then "pending" elif (. | map(select(.conclusion != "SUCCESS")) | length) == 0 then "passing" else "failing" end')
            MERGEABLE=$(echo "$PR_DETAIL" | jq -r '.mergeable // "unknown"')
        fi
    fi

    TOTAL_LINES=$((ADDITIONS + DELETIONS))
    PRIORITY=$(classify_pr "$TITLE" "$ADDITIONS" "$DELETIONS" "$LABELS" "$BRANCH")

    # Determine recommended action
    ACTION="review"
    if [[ "$IS_DRAFT" == "true" ]]; then
        ACTION="draft-review"
    elif [[ "$MERGEABLE" == "CONFLICTING" ]]; then
        ACTION="rebase-needed"
    elif [[ $TOTAL_LINES -gt 10000 ]]; then
        ACTION="split-needed"
    elif [[ "$CHECK_STATUS" == "passing" ]] && [[ "$MERGEABLE" == "MERGEABLE" ]]; then
        ACTION="merge-ready"
    elif [[ "$CHECK_STATUS" == "failing" ]]; then
        ACTION="fix-checks"
    fi

    # Add to enriched data
    ENRICHED=$(jq -n \
        --argjson number "$NUMBER" \
        --arg title "$TITLE" \
        --arg branch "$BRANCH" \
        --arg isDraft "$IS_DRAFT" \
        --argjson additions "$ADDITIONS" \
        --argjson deletions "$DELETIONS" \
        --argjson totalLines "$TOTAL_LINES" \
        --arg updated "$UPDATED" \
        --arg author "$AUTHOR" \
        --arg labels "$LABELS" \
        --arg checkStatus "$CHECK_STATUS" \
        --arg mergeable "$MERGEABLE" \
        --arg priority "$PRIORITY" \
        --arg action "$ACTION" \
        '{number: $number, title: $title, branch: $branch, isDraft: ($isDraft == "true"), additions: $additions, deletions: $deletions, totalLines: $totalLines, updated: $updated, author: $author, labels: $labels, checkStatus: $checkStatus, mergeable: $mergeable, priority: $priority, action: $action}')

    jq ". += [$ENRICHED]" "$ENRICHED_FILE" > "${ENRICHED_FILE}.tmp" && mv "${ENRICHED_FILE}.tmp" "$ENRICHED_FILE"

    # Progress indicator
    echo -ne "\rProcessed $((i + 1))/$PR_COUNT PRs..."
done

echo ""

# Output JSON if requested
if $JSON_OUTPUT; then
    cat "$ENRICHED_FILE"
    rm "$ENRICHED_FILE"
    exit 0
fi

# Generate markdown report
mkdir -p "$(dirname "$OUTPUT_FILE")"

cat > "$OUTPUT_FILE" << 'HEADER'
# PR Queue Triage Report

> Auto-generated by `scripts/ops/pr_queue_snapshot.sh`
> Last updated: TIMESTAMP

## Priority Legend

- **P0**: Merge train blockers / GA gates / CI / release automation / security gates
- **P1**: High value features and fixes (not gating)
- **P2**: Nice-to-have / large / risky / needs work

## Action Legend

- `merge-ready`: Checks passing, mergeable - ready for merge train
- `review`: Needs review
- `rebase-needed`: Has conflicts
- `split-needed`: Too large (>10k lines), recommend splitting
- `fix-checks`: CI checks failing
- `draft-review`: Still in draft

HEADER

# Replace timestamp
sed -i '' "s/TIMESTAMP/$(date -u +"%Y-%m-%d %H:%M:%S UTC")/" "$OUTPUT_FILE" 2>/dev/null || \
sed -i "s/TIMESTAMP/$(date -u +"%Y-%m-%d %H:%M:%S UTC")/" "$OUTPUT_FILE"

# P0 Section
echo "## P0 - Critical / GA Blockers" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
P0_PRS=$(jq '[.[] | select(.priority == "P0")]' "$ENRICHED_FILE")
P0_COUNT=$(echo "$P0_PRS" | jq length)

if [[ $P0_COUNT -eq 0 ]]; then
    echo "_No P0 PRs found._" >> "$OUTPUT_FILE"
else
    echo "| PR | Title | Author | Size | Checks | Action |" >> "$OUTPUT_FILE"
    echo "|---|---|---|---|---|---|" >> "$OUTPUT_FILE"
    echo "$P0_PRS" | jq -r '.[] | "| [#\(.number)](https://github.com/'"$REPO"'/pull/\(.number)) | \(.title | .[0:60]) | @\(.author) | +\(.additions)/-\(.deletions) | \(.checkStatus) | **\(.action)** |"' >> "$OUTPUT_FILE"
fi

# P1 Section
echo "" >> "$OUTPUT_FILE"
echo "## P1 - High Value" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
P1_PRS=$(jq '[.[] | select(.priority == "P1")]' "$ENRICHED_FILE")
P1_COUNT=$(echo "$P1_PRS" | jq length)

if [[ $P1_COUNT -eq 0 ]]; then
    echo "_No P1 PRs found._" >> "$OUTPUT_FILE"
else
    echo "| PR | Title | Author | Size | Checks | Action |" >> "$OUTPUT_FILE"
    echo "|---|---|---|---|---|---|" >> "$OUTPUT_FILE"
    echo "$P1_PRS" | jq -r '.[] | "| [#\(.number)](https://github.com/'"$REPO"'/pull/\(.number)) | \(.title | .[0:60]) | @\(.author) | +\(.additions)/-\(.deletions) | \(.checkStatus) | \(.action) |"' >> "$OUTPUT_FILE"
fi

# P2 Section
echo "" >> "$OUTPUT_FILE"
echo "## P2 - Needs Work / Large / Defer" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
P2_PRS=$(jq '[.[] | select(.priority == "P2")]' "$ENRICHED_FILE")
P2_COUNT=$(echo "$P2_PRS" | jq length)

if [[ $P2_COUNT -eq 0 ]]; then
    echo "_No P2 PRs found._" >> "$OUTPUT_FILE"
else
    echo "| PR | Title | Author | Size | Checks | Action |" >> "$OUTPUT_FILE"
    echo "|---|---|---|---|---|---|" >> "$OUTPUT_FILE"
    echo "$P2_PRS" | jq -r '.[] | "| [#\(.number)](https://github.com/'"$REPO"'/pull/\(.number)) | \(.title | .[0:60]) | @\(.author) | +\(.additions)/-\(.deletions) | \(.checkStatus) | \(.action) |"' >> "$OUTPUT_FILE"
fi

# Mega-PR Warning Section
MEGA_PRS=$(jq '[.[] | select(.totalLines > 10000)]' "$ENRICHED_FILE")
MEGA_COUNT=$(echo "$MEGA_PRS" | jq length)

if [[ $MEGA_COUNT -gt 0 ]]; then
    echo "" >> "$OUTPUT_FILE"
    echo "## Mega-PR Warning" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "The following PRs exceed 10,000 lines and should be split before merging:" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "$MEGA_PRS" | jq -r '.[] | "- [#\(.number)](https://github.com/'"$REPO"'/pull/\(.number)) - \(.totalLines) lines (\(.title | .[0:50])...)"' >> "$OUTPUT_FILE"
fi

# Summary Stats
echo "" >> "$OUTPUT_FILE"
echo "## Summary" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "- **Total Open PRs**: $PR_COUNT" >> "$OUTPUT_FILE"
echo "- **P0 (Critical)**: $P0_COUNT" >> "$OUTPUT_FILE"
echo "- **P1 (High Value)**: $P1_COUNT" >> "$OUTPUT_FILE"
echo "- **P2 (Defer/Large)**: $P2_COUNT" >> "$OUTPUT_FILE"
echo "- **Mega PRs (>10k lines)**: $MEGA_COUNT" >> "$OUTPUT_FILE"

# Merge-ready count
MERGE_READY=$(jq '[.[] | select(.action == "merge-ready")] | length' "$ENRICHED_FILE")
echo "- **Merge Ready**: $MERGE_READY" >> "$OUTPUT_FILE"

# Save JSON alongside
JSON_FILE="${OUTPUT_FILE%.md}.json"
cp "$ENRICHED_FILE" "$JSON_FILE"

rm "$ENRICHED_FILE"

echo ""
echo "Report generated: $OUTPUT_FILE"
echo "JSON data saved: $JSON_FILE"
echo ""
echo "Summary:"
echo "  P0: $P0_COUNT | P1: $P1_COUNT | P2: $P2_COUNT | Mega: $MEGA_COUNT | Ready: $MERGE_READY"
