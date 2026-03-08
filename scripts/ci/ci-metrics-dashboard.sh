#!/bin/bash
# CI Metrics Dashboard
# Shows real-time metrics and tracks progress of CI stabilization

set -euo pipefail

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

# Metric thresholds
HEALTHY_QUEUE=100
CRITICAL_QUEUE=200
GRIDLOCK_QUEUE=300

echo -e "${BOLD}${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║           CI SYSTEM HEALTH DASHBOARD                       ║"
echo "║           $(date '+%Y-%m-%d %H:%M:%S %Z')                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# ==================== SYSTEM STATUS ====================
echo -e "${BOLD}${BLUE}═══ SYSTEM STATUS ═══${NC}\n"

# Queue metrics
queued=$(gh run list --status queued --limit 500 --json databaseId | jq 'length')
in_progress=$(gh run list --status in_progress --limit 100 --json databaseId | jq 'length')

# Determine status
if [ "$queued" -lt "$HEALTHY_QUEUE" ]; then
  status="${GREEN}✅ HEALTHY${NC}"
  status_icon="✅"
elif [ "$queued" -lt "$CRITICAL_QUEUE" ]; then
  status="${YELLOW}⚠️  ELEVATED${NC}"
  status_icon="⚠️"
elif [ "$queued" -lt "$GRIDLOCK_QUEUE" ]; then
  status="${RED}🚨 CRITICAL${NC}"
  status_icon="🚨"
else
  status="${RED}❌ GRIDLOCK${NC}"
  status_icon="❌"
fi

echo -e "  Status:          $status"
echo -e "  Queue Depth:     $queued queued"
echo -e "  Active Runners:  $in_progress running"

# MERGE_SURGE status
merge_surge=$(gh variable list --json name,value --jq '.[] | select(.name == "MERGE_SURGE") | .value' 2>/dev/null || echo "false")
if [ "$merge_surge" = "true" ]; then
  echo -e "  MERGE_SURGE:     ${YELLOW}Enabled${NC}"
else
  echo -e "  MERGE_SURGE:     ${GREEN}Disabled${NC}"
fi

# ==================== WORKFLOW ANALYSIS ====================
echo -e "\n${BOLD}${BLUE}═══ WORKFLOW ANALYSIS ═══${NC}\n"

# New vs Archived workflows in queue
NEW_PATTERNS="pr-gate|docs-ci|server-ci|client-ci|infra-ci|main-validation"
ARCHIVED_PATTERNS="Jet-RL CI|nds-ci|SLSA Provenance|CI Core.*Primary|Compliance.*Governance|Evidence Bundle|summit-skill-gates"

new_queued=$(gh run list --status queued --limit 200 --json workflowName \
  --jq ".[] | select(.workflowName | test(\"$NEW_PATTERNS\")) | .workflowName" | wc -l | tr -d ' ')

archived_queued=$(gh run list --status queued --limit 200 --json workflowName \
  --jq ".[] | select(.workflowName | test(\"$ARCHIVED_PATTERNS\")) | .workflowName" | wc -l | tr -d ' ')

total_analyzed=$((new_queued + archived_queued))

if [ "$total_analyzed" -gt 0 ]; then
  new_percent=$(echo "scale=1; $new_queued * 100 / $total_analyzed" | bc)
  archived_percent=$(echo "scale=1; $archived_queued * 100 / $total_analyzed" | bc)
else
  new_percent=0
  archived_percent=0
fi

echo -e "  ${GREEN}New System:      $new_queued workflows (${new_percent}%)${NC}"
echo -e "  ${YELLOW}Archived:        $archived_queued workflows (${archived_percent}%)${NC}"
echo -e "  Total Analyzed:  $total_analyzed workflows"

# Active workflow count
active_workflows=$(ls .github/workflows/*.yml 2>/dev/null | wc -l | tr -d ' ')
workflow_budget=12
budget_used_percent=$(echo "scale=1; $active_workflows * 100 / $workflow_budget" | bc)

echo -e "\n  Active Workflows: $active_workflows / $workflow_budget (${budget_used_percent}% budget used)"

# ==================== PR MIGRATION ====================
echo -e "\n${BOLD}${BLUE}═══ PR MIGRATION STATUS ═══${NC}\n"

# Count old PRs
old_prs=$(gh pr list --state open --limit 100 --json createdAt \
  --jq '.[] | select(.createdAt < "2026-03-04T00:00:00Z")' | wc -l | tr -d ' ')

# Count total open PRs
total_prs=$(gh pr list --state open --limit 100 --json number | jq 'length')

new_prs=$((total_prs - old_prs))

echo -e "  ${GREEN}New PRs:         $new_prs${NC} (using 8-workflow system)"
echo -e "  ${YELLOW}Old PRs:         $old_prs${NC} (need rebase)"
echo -e "  Total Open:      $total_prs PRs"

if [ "$old_prs" -gt 0 ]; then
  migration_percent=$(echo "scale=1; $new_prs * 100 / $total_prs" | bc)
  echo -e "\n  Migration Rate:  ${migration_percent}% (PRs using new system)"
fi

# ==================== RECENT ACTIVITY ====================
echo -e "\n${BOLD}${BLUE}═══ RECENT ACTIVITY (Last Hour) ═══${NC}\n"

# Recent completions (using updatedAt since completedAt not available)
one_hour_ago=$(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ)

recent_completed=$(gh run list --status completed --limit 100 --json conclusion,updatedAt \
  --jq ".[] | select(.updatedAt > \"$one_hour_ago\")" | jq -s 'length')

recent_success=$(gh run list --status completed --limit 100 --json conclusion,updatedAt \
  --jq ".[] | select(.updatedAt > \"$one_hour_ago\") | select(.conclusion == \"success\")" | jq -s 'length')

recent_failed=$(gh run list --status completed --limit 100 --json conclusion,updatedAt \
  --jq ".[] | select(.updatedAt > \"$one_hour_ago\") | select(.conclusion == \"failure\")" | jq -s 'length')

echo -e "  Completed:       $recent_completed runs"
echo -e "  ${GREEN}Successful:      $recent_success runs${NC}"
echo -e "  ${RED}Failed:          $recent_failed runs${NC}"

if [ "$recent_completed" -gt 0 ]; then
  success_rate=$(echo "scale=1; $recent_success * 100 / $recent_completed" | bc)
  echo -e "\n  Success Rate:    ${success_rate}%"
fi

# ==================== TOP QUEUED WORKFLOWS ====================
echo -e "\n${BOLD}${BLUE}═══ TOP QUEUED WORKFLOWS ═══${NC}\n"

gh run list --status queued --limit 100 --json workflowName \
  --jq -r '.[] | .workflowName' | sort | uniq -c | sort -rn | head -10 | \
  awk '{printf "  %-4s %s\n", $1, substr($0, index($0,$2))}'

# ==================== COST IMPACT ====================
echo -e "\n${BOLD}${BLUE}═══ COST IMPACT ESTIMATE ═══${NC}\n"

# Daily savings based on reduced workflow runs
WORKFLOWS_BEFORE=260
WORKFLOWS_AFTER=3.5
AVG_PRS_PER_DAY=20
AVG_DURATION_MIN=5
COST_PER_MIN=0.008

runs_before=$((WORKFLOWS_BEFORE * AVG_PRS_PER_DAY))
runs_after=$(echo "$WORKFLOWS_AFTER * $AVG_PRS_PER_DAY" | bc)
runs_saved=$(echo "$runs_before - $runs_after" | bc)

cost_before=$(echo "$runs_before * $AVG_DURATION_MIN * $COST_PER_MIN" | bc)
cost_after=$(echo "$runs_after * $AVG_DURATION_MIN * $COST_PER_MIN" | bc)
cost_saved=$(echo "$cost_before - $cost_after" | bc)

echo -e "  ${GREEN}Daily Savings:   \$$cost_saved${NC}"
echo -e "  Monthly:         \$$(echo "$cost_saved * 30" | bc)"
echo -e "  Yearly:          \$$(echo "$cost_saved * 365" | bc)"

# ==================== RECOMMENDATIONS ====================
echo -e "\n${BOLD}${BLUE}═══ RECOMMENDATIONS ═══${NC}\n"

if [ "$queued" -lt "$HEALTHY_QUEUE" ]; then
  echo -e "  ${GREEN}✅ System healthy. No action needed.${NC}"
elif [ "$queued" -lt "$CRITICAL_QUEUE" ]; then
  echo -e "  ${YELLOW}⚠️  Elevated queue. Monitor closely.${NC}"
elif [ "$queued" -lt "$GRIDLOCK_QUEUE" ]; then
  echo -e "  ${RED}🚨 Critical! Consider enabling MERGE_SURGE mode.${NC}"
  echo -e "  Command: gh variable set MERGE_SURGE --body 'true'"
else
  echo -e "  ${RED}❌ GRIDLOCK! Immediate action required.${NC}"
  echo -e "  1. Enable MERGE_SURGE: gh variable set MERGE_SURGE --body 'true'"
  echo -e "  2. Cancel archived runs: bash scripts/ci/cancel-archived-workflow-runs.sh"
fi

if [ "$old_prs" -gt 30 ]; then
  echo -e "  ${YELLOW}ℹ️  $old_prs old PRs need rebasing. Consider reminder comments.${NC}"
fi

if [ "$archived_queued" -gt 50 ]; then
  echo -e "  ${YELLOW}ℹ️  $archived_queued archived workflows queued. Will clear naturally.${NC}"
fi

# ==================== FOOTER ====================
echo -e "\n${BOLD}${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Last Updated: $(date '+%Y-%m-%d %H:%M:%S %Z')                      ║"
echo "║  Dashboard: scripts/ci/ci-metrics-dashboard.sh             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}\n"

# Save metrics to log (optional)
METRICS_LOG="$HOME/.summit-ci-monitoring/metrics.log"
if [ -d "$(dirname "$METRICS_LOG")" ]; then
  echo "$(date +%s),$queued,$in_progress,$new_queued,$archived_queued,$old_prs,$new_prs" >> "$METRICS_LOG"
fi
