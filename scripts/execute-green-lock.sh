#!/usr/bin/env bash
# EXECUTE GREEN-LOCK: Complete automation with rate-limiting
# Takes 30 PRs + 461 branches → 0 PRs + green main

set -euo pipefail

# Configuration
MAX_CONCURRENT=3
RETRY_DELAY=5
RATE_LIMIT_THRESHOLD=100

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging
log() { echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date +'%H:%M:%S')]${NC} ⚠️  $*"; }
error() { echo -e "${RED}[$(date +'%H:%M:%S')]${NC} ❌ $*"; }

# Rate limiting check
check_rate_limit() {
  local remaining=$(gh api rate_limit --jq '.resources.core.remaining' 2>/dev/null || echo "1000")
  local reset=$(gh api rate_limit --jq '.resources.core.reset' 2>/dev/null || echo "0")

  if [ "$remaining" -lt "$RATE_LIMIT_THRESHOLD" ]; then
    local now=$(date +%s)
    local wait=$((reset - now + 2))
    [ $wait -lt 0 ] && wait=60

    warn "Rate limit low ($remaining remaining). Waiting ${wait}s..."
    sleep $wait
  fi
}

# Retry with exponential backoff
retry_command() {
  local max_attempts=3
  local delay=$RETRY_DELAY
  local attempt=1

  while [ $attempt -le $max_attempts ]; do
    if "$@"; then
      return 0
    else
      if [ $attempt -lt $max_attempts ]; then
        warn "Command failed (attempt $attempt/$max_attempts). Retrying in ${delay}s..."
        sleep $delay
        delay=$((delay * 2))
        attempt=$((attempt + 1))
      else
        error "Command failed after $max_attempts attempts"
        return 1
      fi
    fi
  done
}

echo "🚀 GREEN-LOCK EXECUTION"
echo "======================"
echo ""

# =============================================================================
# PHASE 0: VERIFY PREREQUISITES
# =============================================================================

log "PHASE 0: Verifying prerequisites..."

# Check merge queue
MERGE_QUEUE_RUNS=$(gh run list --event merge_group --limit 5 --json databaseId --jq 'length' 2>/dev/null || echo "0")
if [ "$MERGE_QUEUE_RUNS" -eq 0 ]; then
  warn "Merge queue not active. PRs will not auto-merge."
  warn "Enable at: https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner)/settings/branches"
fi

# Get current state
PR_COUNT=$(gh pr list --state open --json number --jq 'length')
log "Current open PRs: $PR_COUNT"

if [ "$PR_COUNT" -eq 0 ]; then
  log "✅ No open PRs - mission accomplished!"
  exit 0
fi

echo ""

# =============================================================================
# PHASE 1: INVENTORY & CATEGORIZE
# =============================================================================

log "PHASE 1: Inventorying and categorizing all PRs..."

REPORT_DIR="green-lock-execution-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$REPORT_DIR"

# Get all open PRs
gh pr list --state open --limit 1000 --json number,title,author --jq '.[] | "\(.number),\(.title),\(.author.login)"' > "$REPORT_DIR/all-prs.csv"

log "Analyzing failure counts for each PR..."

# Check failures for each PR
while IFS=',' read -r pr_num title author; do
  check_rate_limit

  # Count failing checks (use REST to avoid rate limits)
  FAIL_COUNT=$(retry_command gh pr checks "$pr_num" --json bucket --jq '[.[] | select(.bucket=="fail")] | length' 2>/dev/null || echo "999")

  # Categorize
  if [ "$FAIL_COUNT" -eq 0 ]; then
    CATEGORY="GREEN"
    PRIORITY=1
  elif [ "$FAIL_COUNT" -le 3 ]; then
    CATEGORY="LOW_FAIL"
    PRIORITY=2
  elif [ "$FAIL_COUNT" -le 10 ]; then
    CATEGORY="MEDIUM_FAIL"
    PRIORITY=3
  else
    CATEGORY="HIGH_FAIL"
    PRIORITY=4
  fi

  echo "$pr_num,$FAIL_COUNT,$CATEGORY,$PRIORITY,$title" >> "$REPORT_DIR/pr-analysis.csv"

  log "  PR #$pr_num: $FAIL_COUNT failures ($CATEGORY)"
done < "$REPORT_DIR/all-prs.csv"

# Summary
log ""
log "Summary by category:"
awk -F',' '{print $3}' "$REPORT_DIR/pr-analysis.csv" | sort | uniq -c

echo ""

# =============================================================================
# PHASE 2: BATCH RERUN FAILED JOBS (Priority 2-3 only)
# =============================================================================

log "PHASE 2: Batch rerunning failed jobs for LOW_FAIL and MEDIUM_FAIL PRs..."

RERUN_COUNT=0
while IFS=',' read -r pr_num fail_count category priority rest; do
  # Only rerun for priority 2-3 (LOW_FAIL, MEDIUM_FAIL)
  if [ "$priority" -ne 2 ] && [ "$priority" -ne 3 ]; then
    continue
  fi

  check_rate_limit

  log "Processing PR #$pr_num ($category)..."

  # Get unique run IDs
  RUN_IDS=$(retry_command gh pr checks "$pr_num" --json link --jq '.[].link' 2>/dev/null | grep -oE 'runs/[0-9]+' | cut -d'/' -f2 | sort -u || echo "")

  if [ -z "$RUN_IDS" ]; then
    warn "  No run IDs found for PR #$pr_num"
    continue
  fi

  # Rerun each failed job
  for run_id in $RUN_IDS; do
    check_rate_limit

    if retry_command gh run rerun "$run_id" --failed 2>&1 | grep -q "successfully queued\|Cannot rerun"; then
      log "  ✅ Requeued run $run_id"
      RERUN_COUNT=$((RERUN_COUNT + 1))
      echo "$pr_num,$run_id,success" >> "$REPORT_DIR/reruns.csv"
    else
      warn "  ⚠️  Could not rerun $run_id (may be too old or already running)"
      echo "$pr_num,$run_id,skipped" >> "$REPORT_DIR/reruns.csv"
    fi

    # Small delay between reruns
    sleep 2
  done
done < "$REPORT_DIR/pr-analysis.csv"

log "Requeued $RERUN_COUNT failed jobs"
log "⏳ Wait 30-60 minutes for reruns to complete, then run this script again"

echo ""

# =============================================================================
# PHASE 3: MERGE GREEN PRS
# =============================================================================

log "PHASE 3: Attempting to merge GREEN PRs..."

MERGE_COUNT=0
MERGE_BLOCKED=0

while IFS=',' read -r pr_num fail_count category priority rest; do
  if [ "$category" != "GREEN" ]; then
    continue
  fi

  check_rate_limit

  log "Merging PR #$pr_num..."

  # Try to merge
  if retry_command gh pr merge "$pr_num" --squash --delete-branch 2>&1; then
    log "  ✅ Merged PR #$pr_num"
    MERGE_COUNT=$((MERGE_COUNT + 1))
    echo "$pr_num,merged" >> "$REPORT_DIR/merges.csv"
  else
    warn "  ⚠️  Merge blocked (may need approval or branch protection)"
    MERGE_BLOCKED=$((MERGE_BLOCKED + 1))
    echo "$pr_num,blocked" >> "$REPORT_DIR/merges.csv"
  fi

  sleep 2
done < "$REPORT_DIR/pr-analysis.csv"

log "Merged: $MERGE_COUNT PRs"
log "Blocked: $MERGE_BLOCKED PRs"

echo ""

# =============================================================================
# PHASE 4: IDENTIFY PHANTOM FAILURES
# =============================================================================

log "PHASE 4: Identifying phantom failures..."

echo "pr_num,phantom_count,real_count" > "$REPORT_DIR/phantom-analysis.csv"

while IFS=',' read -r pr_num fail_count category priority rest; do
  if [ "$fail_count" -eq 0 ]; then
    continue
  fi

  check_rate_limit

  # Count phantom vs real failures
  PHANTOM_COUNT=$(retry_command gh pr checks "$pr_num" --json link,bucket --jq '[.[] | select(.bucket=="fail" and .link == null)] | length' 2>/dev/null || echo "0")
  REAL_COUNT=$(retry_command gh pr checks "$pr_num" --json link,bucket --jq '[.[] | select(.bucket=="fail" and .link != null)] | length' 2>/dev/null || echo "$fail_count")

  if [ "$PHANTOM_COUNT" -gt 0 ]; then
    log "  PR #$pr_num: $PHANTOM_COUNT phantom, $REAL_COUNT real failures"
    echo "$pr_num,$PHANTOM_COUNT,$REAL_COUNT" >> "$REPORT_DIR/phantom-analysis.csv"
  fi
done < "$REPORT_DIR/pr-analysis.csv"

echo ""

# =============================================================================
# PHASE 5: GENERATE REPORT
# =============================================================================

log "PHASE 5: Generating execution report..."

cat > "$REPORT_DIR/EXECUTION_REPORT.md" << EOF
# GREEN-LOCK EXECUTION REPORT
**Date:** $(date)
**Report Directory:** $REPORT_DIR

## Summary

**Initial PR Count:** $PR_COUNT
**Green PRs Merged:** $MERGE_COUNT
**Merge Blocked:** $MERGE_BLOCKED
**Failed Jobs Requeued:** $RERUN_COUNT

## Next Actions

### If Reruns Complete (1 hour)
Re-run this script to check updated PR states:
\`\`\`bash
./scripts/execute-green-lock.sh
\`\`\`

### If Merge Blocked
PRs may need:
1. Manual approval (cannot self-approve)
2. Branch protection changes
3. Merge queue enabled

### Phantom Failures
$(wc -l < "$REPORT_DIR/phantom-analysis.csv") PRs have phantom failures (null workflow checks).

Options:
- Remove checks from branch protection
- Merge with --admin flag
- Close/archive if stale

## Files Generated

- \`all-prs.csv\` - All open PRs
- \`pr-analysis.csv\` - PR categorization
- \`reruns.csv\` - Rerun tracking
- \`merges.csv\` - Merge attempts
- \`phantom-analysis.csv\` - Phantom failures

## PR Categories

\`\`\`
$(awk -F',' '{print $3}' "$REPORT_DIR/pr-analysis.csv" | sort | uniq -c)
\`\`\`

## Rate Limiting

$(gh api rate_limit --jq '.resources.core | "Remaining: \(.remaining)/\(.limit), Resets: \(.reset | strftime("%H:%M:%S"))"')

---

**Next:** Wait 1 hour → Re-run script → Repeat until PR count = 0
EOF

cat "$REPORT_DIR/EXECUTION_REPORT.md"

echo ""
log "✅ Execution complete"
log "📁 Report saved to: $REPORT_DIR/EXECUTION_REPORT.md"
echo ""

# Final status
REMAINING_PRS=$(gh pr list --state open --json number --jq 'length')
log "Remaining open PRs: $REMAINING_PRS"

if [ "$REMAINING_PRS" -eq 0 ]; then
  log "🎉 SUCCESS: All PRs processed!"
else
  log "🔄 Re-run this script in 1 hour to continue processing"
fi