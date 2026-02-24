#!/usr/bin/env bash
# ga-merge-train.sh -- Tiered merge automation for Summit GA release
# Usage:
#   GH_TOKEN=ghp_xxx ./scripts/ga-merge-train.sh --assess
#   GH_TOKEN=ghp_xxx ./scripts/ga-merge-train.sh --merge-tier 1
#   GH_TOKEN=ghp_xxx ./scripts/ga-merge-train.sh --merge-all
#   GH_TOKEN=ghp_xxx ./scripts/ga-merge-train.sh --report
#
# Requires: bash 4+, curl, jq
# PR data: /tmp/all_prs.tsv  (number|title|draft/ready|base|head_branch|author|labels|created|updated)

set -euo pipefail

###############################################################################
# Configuration
###############################################################################
REPO="${GH_REPO:-BrianCLong/summit}"
TSV_FILE="${PR_TSV:-/tmp/all_prs.tsv}"
REPORT_DIR="${MERGE_REPORT_DIR:-/tmp/ga-merge-reports}"
BATCH_PAUSE_SIZE="${BATCH_PAUSE_SIZE:-50}"
MAX_RETRIES=5
INITIAL_BACKOFF=2  # seconds

# GitHub API base
API="https://api.github.com/repos/${REPO}"

###############################################################################
# Preflight
###############################################################################
if [[ -z "${GH_TOKEN:-}" ]]; then
  echo "ERROR: GH_TOKEN environment variable is required." >&2
  exit 1
fi

for cmd in curl jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: '$cmd' is required but not found in PATH." >&2
    exit 1
  fi
done

if [[ ! -f "$TSV_FILE" ]]; then
  echo "ERROR: PR data file not found at $TSV_FILE" >&2
  echo "Run the fetch step first to populate the TSV file." >&2
  exit 1
fi

mkdir -p "$REPORT_DIR"

###############################################################################
# Helpers
###############################################################################
log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
warn() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] WARN: $*" >&2; }
die()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] FATAL: $*" >&2; exit 1; }

# GitHub API call with rate-limit aware exponential backoff
gh_api() {
  local method="$1" url="$2"
  shift 2
  local body="${1:-}"
  local attempt=0 backoff=$INITIAL_BACKOFF status resp

  while (( attempt < MAX_RETRIES )); do
    if [[ -n "$body" ]]; then
      resp=$(curl -s -w "\n%{http_code}" -X "$method" \
        -H "Authorization: Bearer $GH_TOKEN" \
        -H "Accept: application/vnd.github+json" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        -H "Content-Type: application/json" \
        -d "$body" \
        "$url" 2>/dev/null) || true
    else
      resp=$(curl -s -w "\n%{http_code}" -X "$method" \
        -H "Authorization: Bearer $GH_TOKEN" \
        -H "Accept: application/vnd.github+json" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "$url" 2>/dev/null) || true
    fi

    status=$(echo "$resp" | tail -1)
    local resp_body
    resp_body=$(echo "$resp" | sed '$d')

    case "$status" in
      200|201|204)
        echo "$resp_body"
        return 0
        ;;
      403|429)
        local retry_after
        retry_after=$(curl -s -I -X HEAD \
          -H "Authorization: Bearer $GH_TOKEN" \
          -H "Accept: application/vnd.github+json" \
          "$url" 2>/dev/null | grep -i 'retry-after' | awk '{print $2}' | tr -d '\r' || echo "")
        if [[ -n "$retry_after" && "$retry_after" =~ ^[0-9]+$ ]]; then
          backoff=$retry_after
        fi
        warn "Rate limited (HTTP $status). Retrying in ${backoff}s (attempt $((attempt+1))/$MAX_RETRIES)"
        sleep "$backoff"
        backoff=$((backoff * 2))
        ;;
      409)
        echo "$resp_body"
        return 1
        ;;
      405)
        echo "$resp_body"
        return 2
        ;;
      422)
        echo "$resp_body"
        return 3
        ;;
      *)
        warn "Unexpected HTTP $status for $method $url"
        echo "$resp_body"
        return 4
        ;;
    esac
    attempt=$((attempt + 1))
  done

  warn "Max retries ($MAX_RETRIES) exceeded for $method $url"
  echo "$resp_body"
  return 5
}

###############################################################################
# Tier classification
###############################################################################
classify_pr() {
  local title="$1" labels="$2" branch="$3"
  local t_lower l_lower b_lower
  t_lower=$(echo "$title" | tr '[:upper:]' '[:lower:]')
  l_lower=$(echo "$labels" | tr '[:upper:]' '[:lower:]')
  b_lower=$(echo "$branch" | tr '[:upper:]' '[:lower:]')

  # Tier 7: Security / governance
  if echo "$t_lower" | grep -qE '(security|sentinel|cve-|vuln|harden.*auth|rbac|threat|permission|crypto)'; then
    echo 7; return
  fi
  if echo "$l_lower" | grep -qE '(security)'; then
    echo 7; return
  fi

  # Tier 1: Dependabot / dependency PRs
  if echo "$l_lower" | grep -qE '(dependencies)'; then
    echo 1; return
  fi
  if echo "$t_lower" | grep -qE '^bump |^chore\(deps\)|^build\(deps\)|update.*dependen'; then
    echo 1; return
  fi

  # Tier 2: Documentation-only PRs
  if echo "$t_lower" | grep -qE '^docs[:(]|^doc[:(]'; then
    echo 2; return
  fi

  # Tier 3: Test / coverage PRs
  if echo "$t_lower" | grep -qE '^test[:(s]|testing suite|coverage pipeline|^coverage'; then
    echo 3; return
  fi

  # Tier 4: Chore / CI / infra PRs
  if echo "$t_lower" | grep -qE '^chore[:(]|^ci[:(]|^ci/|^infra[:(]|^build[:(]'; then
    echo 4; return
  fi

  # Tier 5: Bug fixes
  if echo "$t_lower" | grep -qE '^fix[:(]|^bugfix|^hotfix'; then
    echo 5; return
  fi

  # Tier 6: Features (default)
  echo 6
}

tier_name() {
  case "$1" in
    1) echo "Dependabot/Dependencies" ;;
    2) echo "Documentation" ;;
    3) echo "Tests/Coverage" ;;
    4) echo "Chore/CI/Infra" ;;
    5) echo "Bug Fixes" ;;
    6) echo "Features" ;;
    7) echo "Security/Governance (manual review)" ;;
    *) echo "Unknown" ;;
  esac
}

###############################################################################
# Load and classify PRs
###############################################################################
declare -a PR_NUMBERS=() PR_TITLES=() PR_STATUSES=() PR_BRANCHES=() PR_LABELS=() PR_TIERS=() PR_DRAFTS=()

load_prs() {
  while IFS='|' read -r number title draft base branch author labels created updated || [[ -n "$number" ]]; do
    [[ -z "$number" ]] && continue
    number=$(echo "$number" | tr -d '[:space:]')
    [[ "$number" =~ ^[0-9]+$ ]] || continue

    local tier
    tier=$(classify_pr "$title" "$labels" "$branch")

    PR_NUMBERS+=("$number")
    PR_TITLES+=("$title")
    PR_DRAFTS+=("$draft")
    PR_BRANCHES+=("$branch")
    PR_LABELS+=("$labels")
    PR_TIERS+=("$tier")
  done < "$TSV_FILE"

  log "Loaded ${#PR_NUMBERS[@]} PRs from $TSV_FILE"
}

###############################################################################
# --assess: Show tier breakdown
###############################################################################
do_assess() {
  load_prs
  local total=${#PR_NUMBERS[@]}
  local draft_count=0 ready_count=0

  declare -A tier_counts=()
  declare -A tier_draft_counts=()
  for t in 1 2 3 4 5 6 7; do
    tier_counts[$t]=0
    tier_draft_counts[$t]=0
  done

  for i in "${!PR_NUMBERS[@]}"; do
    local tier="${PR_TIERS[$i]}"
    tier_counts[$tier]=$(( ${tier_counts[$tier]} + 1 ))
    if [[ "${PR_DRAFTS[$i]}" == "draft" ]]; then
      draft_count=$((draft_count + 1))
      tier_draft_counts[$tier]=$(( ${tier_draft_counts[$tier]} + 1 ))
    else
      ready_count=$((ready_count + 1))
    fi
  done

  echo ""
  echo "================================================================"
  echo "  GA Merge Train -- Assessment Report"
  echo "================================================================"
  echo ""
  printf "  Total PRs:   %d\n" "$total"
  printf "  Ready:       %d\n" "$ready_count"
  printf "  Draft:       %d (will be skipped)\n" "$draft_count"
  echo ""
  echo "  Tier Breakdown:"
  echo "  ---------------------------------------------------------------"
  printf "  %-5s %-40s %6s %6s\n" "Tier" "Category" "Ready" "Draft"
  echo "  ---------------------------------------------------------------"
  for t in 1 2 3 4 5 6 7; do
    local ready_t=$(( ${tier_counts[$t]} - ${tier_draft_counts[$t]} ))
    printf "  %-5d %-40s %6d %6d\n" "$t" "$(tier_name $t)" "$ready_t" "${tier_draft_counts[$t]}"
  done
  echo "  ---------------------------------------------------------------"
  echo ""
  echo "  Recommended merge order: Tier 1 -> 2 -> 3 -> 4 -> 5 -> 6"
  echo "  Tier 7 (Security/Governance) PRs flagged for manual review."
  echo "  CI validation pause every $BATCH_PAUSE_SIZE merges."
  echo ""
}

###############################################################################
# --merge-tier N: Merge all ready PRs in a given tier
###############################################################################
do_merge_tier() {
  local target_tier="$1"
  load_prs

  log "Starting merge for Tier $target_tier: $(tier_name "$target_tier")"

  if [[ "$target_tier" -eq 7 ]]; then
    warn "Tier 7 (Security/Governance) requires manual review."
    echo ""
    echo "The following Tier 7 PRs need manual review before merging:"
    echo ""
    for i in "${!PR_NUMBERS[@]}"; do
      if [[ "${PR_TIERS[$i]}" == "7" && "${PR_DRAFTS[$i]}" != "draft" ]]; then
        printf "  #%-6s %s\n" "${PR_NUMBERS[$i]}" "${PR_TITLES[$i]}"
      fi
    done
    echo ""
    echo "To force-merge Tier 7, set FORCE_TIER7=1 in the environment."
    if [[ "${FORCE_TIER7:-0}" != "1" ]]; then
      return 0
    fi
    warn "FORCE_TIER7=1 set. Proceeding with Tier 7 merges."
  fi

  local merged=0 failed=0 skipped=0 total_in_tier=0
  local merge_results=()
  local rollback_stack=()
  local batch_count=0
  local timestamp
  timestamp=$(date -u +%Y%m%dT%H%M%SZ)
  local result_file="${REPORT_DIR}/merge-tier${target_tier}-${timestamp}.json"

  # Collect PRs in this tier (ready only)
  local tier_prs=()
  for i in "${!PR_NUMBERS[@]}"; do
    if [[ "${PR_TIERS[$i]}" == "$target_tier" && "${PR_DRAFTS[$i]}" != "draft" ]]; then
      tier_prs+=("$i")
      total_in_tier=$((total_in_tier + 1))
    fi
  done

  # Reverse to get oldest-first (TSV is newest-first)
  local sorted_prs=()
  for (( idx=${#tier_prs[@]}-1; idx>=0; idx-- )); do
    sorted_prs+=("${tier_prs[$idx]}")
  done

  log "Found $total_in_tier ready PRs in Tier $target_tier"

  for i in "${sorted_prs[@]}"; do
    local pr_num="${PR_NUMBERS[$i]}"
    local pr_title="${PR_TITLES[$i]}"

    log "[$((merged + failed + skipped + 1))/$total_in_tier] Merging PR #$pr_num: $pr_title"

    local merge_body
    merge_body=$(jq -n \
      --arg title "$pr_title (#$pr_num)" \
      --arg method "squash" \
      '{"commit_title": $title, "merge_method": $method}')

    local merge_resp merge_rc=0
    merge_resp=$(gh_api PUT "${API}/pulls/${pr_num}/merge" "$merge_body") || merge_rc=$?

    local status_str sha_str message_str
    if [[ $merge_rc -eq 0 ]]; then
      sha_str=$(echo "$merge_resp" | jq -r '.sha // "unknown"')
      merged=$((merged + 1))
      batch_count=$((batch_count + 1))
      status_str="merged"
      message_str="Squash merged successfully"
      rollback_stack+=("$sha_str")
      log "  -> Merged (sha: ${sha_str:0:12})"
    else
      message_str=$(echo "$merge_resp" | jq -r '.message // "unknown error"' 2>/dev/null || echo "unknown error")
      sha_str=""
      case $merge_rc in
        1) status_str="conflict"    ; warn "  -> Merge conflict for #$pr_num: $message_str" ;;
        2) status_str="blocked"     ; warn "  -> Merge blocked for #$pr_num: $message_str" ;;
        3) status_str="validation"  ; warn "  -> Validation failed for #$pr_num: $message_str" ;;
        *) status_str="error"       ; warn "  -> Error merging #$pr_num: $message_str" ;;
      esac
      failed=$((failed + 1))
    fi

    merge_results+=("$(jq -n \
      --arg pr "$pr_num" \
      --arg title "$pr_title" \
      --arg status "$status_str" \
      --arg sha "$sha_str" \
      --arg message "$message_str" \
      --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      '{pr: ($pr|tonumber), title: $title, status: $status, sha: $sha, message: $message, timestamp: $ts}')")

    # Batch pause for CI validation
    if [[ $batch_count -ge $BATCH_PAUSE_SIZE && $merged -lt $total_in_tier ]]; then
      log ""
      log "=== BATCH PAUSE: $batch_count merges completed. ==="
      log "=== Pausing for CI validation. ==="
      log ""
      if [[ "${GA_MERGE_NONINTERACTIVE:-0}" != "1" ]]; then
        log "Press ENTER to continue, or Ctrl+C to abort..."
        read -r
      else
        log "(Non-interactive mode: continuing after 10s pause)"
        sleep 10
      fi
      batch_count=0
    fi
  done

  # Write JSON report
  {
    echo "{"
    echo "  \"tier\": $target_tier,"
    echo "  \"tier_name\": \"$(tier_name "$target_tier")\","
    echo "  \"timestamp\": \"$timestamp\","
    echo "  \"total_in_tier\": $total_in_tier,"
    echo "  \"merged\": $merged,"
    echo "  \"failed\": $failed,"
    echo "  \"skipped\": $skipped,"
    echo "  \"rollback_shas\": $(printf '%s\n' "${rollback_stack[@]:-}" | jq -R . | jq -s .),"
    echo "  \"results\": ["
    local first=1
    for r in "${merge_results[@]}"; do
      if [[ $first -eq 1 ]]; then first=0; else echo ","; fi
      printf "    %s" "$r"
    done
    echo ""
    echo "  ]"
    echo "}"
  } > "$result_file"

  echo ""
  log "================================================================"
  log "  Tier $target_tier Merge Summary"
  log "================================================================"
  log "  Total:   $total_in_tier"
  log "  Merged:  $merged"
  log "  Failed:  $failed"
  log "  Skipped: $skipped"
  log "  Report:  $result_file"
  log "================================================================"
  echo ""
}

###############################################################################
# --merge-all: Merge tiers 1 through 6 sequentially
###############################################################################
do_merge_all() {
  log "Starting full GA merge train (Tiers 1-6)"
  log "Tier 7 (Security/Governance) is excluded -- use --merge-tier 7 with FORCE_TIER7=1"
  echo ""

  for tier in 1 2 3 4 5 6; do
    log "============================================"
    log "  Processing Tier $tier: $(tier_name "$tier")"
    log "============================================"
    do_merge_tier "$tier"
    echo ""
    log "Tier $tier complete. Pausing 5s before next tier..."
    sleep 5
  done

  log "All tiers (1-6) processed. Run --report to generate consolidated report."
}

###############################################################################
# --report: Generate consolidated JSON report
###############################################################################
do_report() {
  load_prs

  local timestamp
  timestamp=$(date -u +%Y%m%dT%H%M%SZ)
  local consolidated="${REPORT_DIR}/ga-merge-consolidated-${timestamp}.json"

  local tier_files=()
  for f in "${REPORT_DIR}"/merge-tier*.json; do
    [[ -f "$f" ]] && tier_files+=("$f")
  done

  local total_merged=0 total_failed=0 total_prs=${#PR_NUMBERS[@]}

  declare -A tier_total=()
  for t in 1 2 3 4 5 6 7; do tier_total[$t]=0; done
  for i in "${!PR_NUMBERS[@]}"; do
    local t="${PR_TIERS[$i]}"
    tier_total[$t]=$(( ${tier_total[$t]} + 1 ))
  done

  local tier_summaries="["
  local first_tier=1
  for f in "${tier_files[@]}"; do
    local t_merged t_failed t_tier
    t_tier=$(jq -r '.tier' "$f" 2>/dev/null || echo "0")
    t_merged=$(jq -r '.merged' "$f" 2>/dev/null || echo "0")
    t_failed=$(jq -r '.failed' "$f" 2>/dev/null || echo "0")
    total_merged=$((total_merged + t_merged))
    total_failed=$((total_failed + t_failed))
    if [[ $first_tier -eq 1 ]]; then first_tier=0; else tier_summaries+=","; fi
    tier_summaries+=$(jq -c '{tier, tier_name, merged, failed, total_in_tier, timestamp}' "$f")
  done
  tier_summaries+="]"

  if [[ ${#tier_files[@]} -eq 0 ]]; then
    tier_summaries="[]"
    log "No merge tier reports found. Generating assessment-only consolidated report."
  fi

  jq -n \
    --arg ts "$timestamp" \
    --argjson total "$total_prs" \
    --argjson merged "$total_merged" \
    --argjson failed "$total_failed" \
    --argjson remaining "$((total_prs - total_merged))" \
    --argjson tier1 "${tier_total[1]}" \
    --argjson tier2 "${tier_total[2]}" \
    --argjson tier3 "${tier_total[3]}" \
    --argjson tier4 "${tier_total[4]}" \
    --argjson tier5 "${tier_total[5]}" \
    --argjson tier6 "${tier_total[6]}" \
    --argjson tier7 "${tier_total[7]}" \
    --argjson tier_reports "$tier_summaries" \
    '{
      report: "GA Merge Train Consolidated Report",
      generated: $ts,
      overview: {
        total_prs: $total,
        total_merged: $merged,
        total_failed: $failed,
        remaining: $remaining,
        completion_pct: (if $total > 0 then (($merged * 100) / $total | floor) else 0 end)
      },
      tier_breakdown: {
        "tier_1_dependencies": $tier1,
        "tier_2_documentation": $tier2,
        "tier_3_tests": $tier3,
        "tier_4_chore_ci_infra": $tier4,
        "tier_5_bugfixes": $tier5,
        "tier_6_features": $tier6,
        "tier_7_security_manual": $tier7
      },
      tier_reports: $tier_reports
    }' > "$consolidated"

  log "Consolidated report written to: $consolidated"
  echo ""
  jq . "$consolidated"
}

###############################################################################
# --fetch-prs: Fetch open PRs from GitHub API into TSV
###############################################################################
do_fetch_prs() {
  log "Fetching open PRs from GitHub API..."
  local page=1 total=0
  > "$TSV_FILE"

  while true; do
    local resp
    resp=$(gh_api GET "${API}/pulls?state=open&per_page=100&page=${page}") || break
    local count
    count=$(echo "$resp" | jq 'length')
    [[ "$count" -eq 0 ]] && break

    echo "$resp" | jq -r '.[] |
      [.number, .title[:80], (if .draft then "draft" else "ready" end),
       .base.ref, .head.ref, .user.login,
       ([.labels[].name] | join(",")),
       .created_at[:10], .updated_at[:10]] | join("|")' >> "$TSV_FILE"

    total=$((total + count))
    log "  Fetched page $page ($count PRs, $total total)"
    page=$((page + 1))
  done

  log "Fetched $total PRs to $TSV_FILE"
}

###############################################################################
# Main
###############################################################################
usage() {
  cat <<USAGE
Usage: $0 [OPTIONS]

Modes:
  --assess            Show tier breakdown and merge plan (read-only)
  --fetch-prs         Fetch open PRs from GitHub API into TSV file
  --merge-tier N      Merge all ready PRs in tier N (1-7)
  --merge-all         Merge tiers 1-6 sequentially (excludes tier 7)
  --report            Generate consolidated JSON report

Environment variables:
  GH_TOKEN            (required) GitHub personal access token
  GH_REPO             GitHub repo (default: BrianCLong/summit)
  PR_TSV              Path to PR TSV file (default: /tmp/all_prs.tsv)
  MERGE_REPORT_DIR    Report output dir (default: /tmp/ga-merge-reports)
  BATCH_PAUSE_SIZE    Pause after N merges for CI check (default: 50)
  GA_MERGE_NONINTERACTIVE  Set to 1 for non-interactive batch pauses
  FORCE_TIER7         Set to 1 to allow Tier 7 merges

Tiers:
  1  Dependabot / Dependency updates (lowest risk)
  2  Documentation-only changes
  3  Test / coverage changes
  4  Chore / CI / infrastructure
  5  Bug fixes
  6  Features
  7  Security / governance (flagged for manual review)

Safety:
  - Pauses every $BATCH_PAUSE_SIZE merges for CI validation
  - Rollback SHAs recorded in merge reports
  - Tier 7 blocked unless FORCE_TIER7=1
  - Exponential backoff on GitHub API rate limits

USAGE
  exit 0
}

main() {
  if [[ $# -eq 0 ]]; then
    usage
  fi

  case "$1" in
    --assess)      do_assess ;;
    --fetch-prs)   do_fetch_prs ;;
    --merge-tier)
      if [[ -z "${2:-}" ]] || ! [[ "$2" =~ ^[1-7]$ ]]; then
        die "Usage: $0 --merge-tier N  (N must be 1-7)"
      fi
      do_merge_tier "$2"
      ;;
    --merge-all)   do_merge_all ;;
    --report)      do_report ;;
    --help|-h)     usage ;;
    *)             die "Unknown option: $1. Use --help for usage." ;;
  esac
}

main "$@"
