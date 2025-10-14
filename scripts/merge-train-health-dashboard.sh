#!/usr/bin/env bash
set -euo pipefail

# Merge Train Health Dashboard
# Generates comprehensive health report for merge train operations
# Can be run manually or scheduled via cron for nightly reports

REPORT_DATE=$(date +%Y-%m-%d)
REPORT_TIME=$(date +%H:%M:%S)
REPORT_FILE="/tmp/merge-train-health-${REPORT_DATE}.md"

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
RESET='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BLUE}║       Merge Train Health Dashboard - ${REPORT_DATE}       ║${RESET}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${RESET}"
echo ""

# Start markdown report
cat > "$REPORT_FILE" <<EOF
# Merge Train Health Report

**Date:** ${REPORT_DATE} ${REPORT_TIME}
**Repository:** $(git remote get-url origin | sed 's/.*://;s/\.git$//')

---

EOF

# Function to add section to both terminal and report
log_section() {
    local title="$1"
    echo -e "${YELLOW}## ${title}${RESET}"
    echo "" >> "$REPORT_FILE"
    echo "## ${title}" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
}

log_metric() {
    local label="$1"
    local value="$2"
    local color="${3:-$GREEN}"
    echo -e "${color}  ${label}:${RESET} ${value}"
    echo "- **${label}:** ${value}" >> "$REPORT_FILE"
}

# 1. Queue Metrics
log_section "Queue Metrics"

TOTAL_OPEN=$(gh pr list --state open --limit 500 --json number | jq 'length')
TOTAL_CONFLICTING=$(gh pr list --state open --limit 500 --json number,mergeable | \
    jq '[.[] | select(.mergeable == "CONFLICTING")] | length')
TOTAL_MERGEABLE=$(gh pr list --state open --limit 500 --json number,mergeable | \
    jq '[.[] | select(.mergeable == "MERGEABLE")] | length')
TOTAL_DRAFT=$(gh pr list --state open --draft --limit 500 --json number | jq 'length')

if [ "$TOTAL_OPEN" -eq 0 ]; then
    CONFLICT_RATE=0
else
    CONFLICT_RATE=$(echo "scale=1; $TOTAL_CONFLICTING * 100 / $TOTAL_OPEN" | bc)
fi

log_metric "Total Open PRs" "$TOTAL_OPEN"
log_metric "Conflicting PRs" "$TOTAL_CONFLICTING ($CONFLICT_RATE%)" "$RED"
log_metric "Mergeable PRs" "$TOTAL_MERGEABLE"
log_metric "Draft PRs" "$TOTAL_DRAFT"

# Alert if thresholds exceeded
if [ "$TOTAL_OPEN" -gt 300 ]; then
    log_metric "⚠️ ALERT" "Open PR count exceeds 300 threshold" "$RED"
fi
if [ "${CONFLICT_RATE%.*}" -gt 40 ]; then
    log_metric "⚠️ ALERT" "Conflict rate exceeds 40% threshold" "$RED"
fi

# 2. Age Analysis
log_section "Age Analysis"

AVG_AGE=$(gh pr list --state open --limit 500 --json createdAt,number | \
    jq 'if length == 0 then 0 else (map((now - (.createdAt | fromdateiso8601)) / 86400) | add / length) end' | \
    awk '{printf "%.1f", $1}')

OLD_PRS=$(gh pr list --state open --limit 500 --json number,createdAt | \
    jq '[.[] | select(((now - (.createdAt | fromdateiso8601)) / 86400) > 90)] | length')

STALE_DRAFTS=$(gh pr list --state open --draft --limit 500 --json number,createdAt | \
    jq '[.[] | select(((now - (.createdAt | fromdateiso8601)) / 86400) > 30)] | length')

log_metric "Average PR age" "${AVG_AGE} days"
log_metric "PRs older than 90 days" "$OLD_PRS" "$YELLOW"
log_metric "Stale draft PRs (>30 days)" "$STALE_DRAFTS" "$YELLOW"

# 3. Merge Velocity
log_section "Merge Velocity"

MERGES_TODAY=$(gh pr list --state merged --search "merged:>=$(date +%Y-%m-%d)" --limit 500 --json number | jq 'length')
MERGES_WEEK=$(gh pr list --state merged --search "merged:>=$(date -d '7 days ago' +%Y-%m-%d 2>/dev/null || date -v-7d +%Y-%m-%d)" --limit 500 --json number | jq 'length')
MERGES_MONTH=$(gh pr list --state merged --search "merged:>=$(date -d '30 days ago' +%Y-%m-%d 2>/dev/null || date -v-30d +%Y-%m-%d)" --limit 500 --json number | jq 'length')

DAILY_AVG=$(echo "scale=1; $MERGES_WEEK / 7" | bc)
WEEKLY_AVG=$(echo "scale=1; $MERGES_MONTH / 4" | bc)

log_metric "Merged today" "$MERGES_TODAY"
log_metric "Merged this week" "$MERGES_WEEK (avg ${DAILY_AVG}/day)"
log_metric "Merged this month" "$MERGES_MONTH (avg ${WEEKLY_AVG}/week)"

# 4. CI Status
log_section "CI Status"

CI_PASSING=$(gh pr list --state open --limit 100 --json number,statusCheckRollup | \
    jq '[.[] | select(.statusCheckRollup[]? | select(.name == "fast / fast" and .conclusion == "SUCCESS"))] | length')

CI_FAILING=$(gh pr list --state open --limit 100 --json number,statusCheckRollup | \
    jq '[.[] | select(.statusCheckRollup[]? | select(.name == "fast / fast" and .conclusion == "FAILURE"))] | length')

CI_QUEUED=$(gh pr list --state open --limit 100 --json number,statusCheckRollup | \
    jq '[.[] | select(.statusCheckRollup[]? | select(.name == "fast / fast" and .status == "QUEUED"))] | length')

log_metric "CI passing (fast lane)" "$CI_PASSING" "$GREEN"
log_metric "CI failing (fast lane)" "$CI_FAILING" "$RED"
log_metric "CI queued" "$CI_QUEUED"

# 5. Lane Distribution
log_section "Lane Distribution"

EXPRESS_READY=$(gh pr list --state open --limit 200 --json number,additions,deletions,mergeable,statusCheckRollup | \
    jq '[.[] | select(.mergeable == "MERGEABLE" and (.additions + .deletions) < 100 and (.statusCheckRollup[]? | select(.name == "fast / fast" and .conclusion == "SUCCESS")))] | length')

STANDARD_READY=$(gh pr list --state open --limit 200 --json number,additions,deletions,mergeable,statusCheckRollup | \
    jq '[.[] | select(.mergeable == "MERGEABLE" and (.additions + .deletions) >= 100 and (.additions + .deletions) < 500 and (.statusCheckRollup[]? | select(.name == "fast / fast" and .conclusion == "SUCCESS")))] | length')

MANUAL_NEEDED=$(gh pr list --state open --limit 200 --json number,additions,deletions,mergeable | \
    jq '[.[] | select((.additions + .deletions) >= 500 or .mergeable != "MERGEABLE")] | length')

log_metric "Express lane ready (<100 LOC)" "$EXPRESS_READY" "$GREEN"
log_metric "Standard lane ready (<500 LOC)" "$STANDARD_READY" "$YELLOW"
log_metric "Manual lane (>500 LOC or conflicts)" "$MANUAL_NEEDED" "$RED"

# 6. Health Score
log_section "Health Score"

# Calculate composite health score (0-100)
HEALTH_SCORE=100

# Deduct for high open PR count
if [ "$TOTAL_OPEN" -gt 300 ]; then
    HEALTH_SCORE=$((HEALTH_SCORE - 20))
elif [ "$TOTAL_OPEN" -gt 200 ]; then
    HEALTH_SCORE=$((HEALTH_SCORE - 10))
fi

# Deduct for high conflict rate
if [ "${CONFLICT_RATE%.*}" -gt 50 ]; then
    HEALTH_SCORE=$((HEALTH_SCORE - 25))
elif [ "${CONFLICT_RATE%.*}" -gt 30 ]; then
    HEALTH_SCORE=$((HEALTH_SCORE - 15))
fi

# Deduct for low merge velocity
if [ "$MERGES_TODAY" -lt 5 ]; then
    HEALTH_SCORE=$((HEALTH_SCORE - 15))
fi

# Deduct for old PRs
if [ "$OLD_PRS" -gt 50 ]; then
    HEALTH_SCORE=$((HEALTH_SCORE - 20))
elif [ "$OLD_PRS" -gt 30 ]; then
    HEALTH_SCORE=$((HEALTH_SCORE - 10))
fi

# Determine health status
if [ "$HEALTH_SCORE" -ge 80 ]; then
    HEALTH_STATUS="${GREEN}HEALTHY ✓${RESET}"
    HEALTH_COLOR="green"
elif [ "$HEALTH_SCORE" -ge 60 ]; then
    HEALTH_STATUS="${YELLOW}NEEDS ATTENTION ⚠${RESET}"
    HEALTH_COLOR="yellow"
else
    HEALTH_STATUS="${RED}CRITICAL ✗${RESET}"
    HEALTH_COLOR="red"
fi

echo -e "\n${BLUE}════════════════════════════════════════════════════════════${RESET}"
echo -e "${HEALTH_STATUS} Score: ${HEALTH_SCORE}/100"
echo -e "${BLUE}════════════════════════════════════════════════════════════${RESET}\n"

cat >> "$REPORT_FILE" <<EOF

---

## Overall Health Score

**Score:** ${HEALTH_SCORE}/100
**Status:** $(echo $HEALTH_STATUS | sed 's/\x1b\[[0-9;]*m//g')

### Thresholds
- **80-100:** Healthy (green)
- **60-79:** Needs Attention (yellow)
- **0-59:** Critical (red)

EOF

# 7. Recommendations
log_section "Recommendations"

echo "Based on current metrics:" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ "$TOTAL_CONFLICTING" -gt 50 ]; then
    echo -e "${YELLOW}  • Run triage on $TOTAL_CONFLICTING conflicting PRs${RESET}"
    echo "- Run \`make mt-triage\` to process conflicting PRs" >> "$REPORT_FILE"
fi

if [ "$STALE_DRAFTS" -gt 10 ]; then
    echo -e "${YELLOW}  • Close $STALE_DRAFTS stale draft PRs${RESET}"
    echo "- Run \`make mt-close-stale\` to clean up drafts" >> "$REPORT_FILE"
fi

if [ "$EXPRESS_READY" -gt 0 ]; then
    echo -e "${GREEN}  • $EXPRESS_READY PRs ready for express lane merge${RESET}"
    echo "- Merge $EXPRESS_READY express lane PRs (auto-merge eligible)" >> "$REPORT_FILE"
fi

if [ "$STANDARD_READY" -gt 5 ]; then
    echo -e "${YELLOW}  • $STANDARD_READY PRs waiting in standard lane${RESET}"
    echo "- Review and merge $STANDARD_READY standard lane PRs" >> "$REPORT_FILE"
fi

if [ "$OLD_PRS" -gt 30 ]; then
    echo -e "${RED}  • $OLD_PRS PRs older than 90 days need attention${RESET}"
    echo "- Review and close/update old PRs" >> "$REPORT_FILE"
fi

# 8. Report footer
cat >> "$REPORT_FILE" <<EOF

---

**Generated:** ${REPORT_DATE} ${REPORT_TIME}
**Tool:** merge-train-health-dashboard.sh
**Repository:** $(git remote get-url origin | sed 's/.*://;s/\.git$//')

EOF

echo ""
echo -e "${GREEN}✓ Health report generated: ${REPORT_FILE}${RESET}"
echo ""
echo -e "${BLUE}View report: ${YELLOW}cat ${REPORT_FILE}${RESET}"
echo -e "${BLUE}Send to Slack: ${YELLOW}./scripts/send-to-slack.sh ${REPORT_FILE}${RESET}"
echo ""
