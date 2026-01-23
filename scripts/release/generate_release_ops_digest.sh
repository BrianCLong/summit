#!/usr/bin/env bash
# generate_release_ops_digest.sh v1.0.0
# Generates a daily release ops summary digest
#
# This script aggregates all active release blockers into a single
# consolidated digest with strict rate-limiting to avoid noise.
#
# Usage: ./generate_release_ops_digest.sh [OPTIONS]
#
# See docs/ci/RELEASE_OPS_DIGEST.md for full documentation.

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Default paths
DEFAULT_POLICY="${REPO_ROOT}/docs/ci/RELEASE_OPS_DIGEST_POLICY.yml"
DEFAULT_STATE="${REPO_ROOT}/docs/releases/_state/digest_state.json"
DEFAULT_OUT="${REPO_ROOT}/artifacts/release-train/release_ops_digest.md"

# --- Color output ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $*" >&2; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $*"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*" >&2; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

print_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Generates a daily release ops summary digest.

OPTIONS:
    --policy PATH       Path to digest policy YAML (default: ${DEFAULT_POLICY})
    --state PATH        Path to digest state JSON (default: ${DEFAULT_STATE})
    --out PATH          Output path for digest (default: ${DEFAULT_OUT})
    --repo OWNER/REPO   GitHub repository (default: from git remote)
    --dry-run           Generate digest but skip posting/state update
    --force             Force digest generation even if rate-limited
    --help              Show this help message

EXAMPLES:
    $0 --dry-run
    $0 --force
    $0 --out /tmp/digest.md

EOF
}

# --- Time helpers ---
now_epoch() {
    date +%s
}

iso_to_epoch() {
    local iso="$1"
    if [[ -z "$iso" || "$iso" == "null" ]]; then
        echo "0"
    else
        date -d "$iso" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%SZ" "$iso" +%s 2>/dev/null || echo "0"
    fi
}

epoch_to_iso() {
    local epoch="$1"
    date -u -d "@$epoch" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -r "$epoch" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo ""
}

minutes_since() {
    local start_epoch="$1"
    local now
    now=$(now_epoch)
    echo $(( (now - start_epoch) / 60 ))
}

format_age() {
    local minutes="$1"
    if (( minutes < 60 )); then
        echo "${minutes}m"
    elif (( minutes < 1440 )); then
        echo "$((minutes / 60))h $((minutes % 60))m"
    else
        echo "$((minutes / 1440))d $((minutes % 1440 / 60))h"
    fi
}

# --- Content hash for deduplication ---
compute_content_hash() {
    local content="$1"
    echo "$content" | sha256sum | cut -c1-16
}

# --- Main logic ---
main() {
    local policy_file="${DEFAULT_POLICY}"
    local state_file="${DEFAULT_STATE}"
    local out_file="${DEFAULT_OUT}"
    local repo=""
    local dry_run="false"
    local force="false"

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --policy)
                policy_file="$2"
                shift 2
                ;;
            --state)
                state_file="$2"
                shift 2
                ;;
            --out)
                out_file="$2"
                shift 2
                ;;
            --repo)
                repo="$2"
                shift 2
                ;;
            --dry-run)
                dry_run="true"
                shift
                ;;
            --force)
                force="true"
                shift
                ;;
            --help)
                print_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                print_usage
                exit 2
                ;;
        esac
    done

    # Get repo from git if not provided
    if [[ -z "$repo" ]]; then
        repo=$(git remote get-url origin 2>/dev/null | sed -E 's|.*github.com[:/](.+/.+)\.git|\1|' || echo "")
        if [[ -z "$repo" ]]; then
            log_error "Could not determine repository. Use --repo flag."
            exit 2
        fi
    fi

    # Ensure output directory exists
    mkdir -p "$(dirname "$out_file")"

    # Ensure state file exists
    if [[ ! -f "$state_file" ]]; then
        mkdir -p "$(dirname "$state_file")"
        echo '{"version":"1.0.0","last_digest_at":null,"last_digest_hash":null,"last_comment_id":null}' > "$state_file"
    fi

    echo ""
    log_info "═══════════════════════════════════════════════════════════════"
    log_info "  Release Ops Digest Generator"
    log_info "═══════════════════════════════════════════════════════════════"
    log_info "Script version: ${SCRIPT_VERSION}"
    log_info "Repository: ${repo}"
    log_info "Output: ${out_file}"
    log_info "Dry run: ${dry_run}"
    log_info "Force: ${force}"
    echo ""

    # Read state
    local state_json
    state_json=$(cat "$state_file")
    local last_digest_at last_digest_hash
    last_digest_at=$(echo "$state_json" | jq -r '.last_digest_at // ""')
    last_digest_hash=$(echo "$state_json" | jq -r '.last_digest_hash // ""')

    # Check rate limit (24 hours = 1440 minutes)
    local cadence_minutes=1440
    local should_post="true"

    if [[ "$force" != "true" && -n "$last_digest_at" && "$last_digest_at" != "null" ]]; then
        local last_epoch
        last_epoch=$(iso_to_epoch "$last_digest_at")
        local minutes_since_last
        minutes_since_last=$(minutes_since "$last_epoch")

        if (( minutes_since_last < cadence_minutes )); then
            log_info "Rate limit active: last digest was ${minutes_since_last}m ago (< ${cadence_minutes}m)"
            should_post="false"
        fi
    fi

    # Fetch open release-blocker issues
    log_info "Fetching open release-blocker issues..."
    local issues_json
    issues_json=$(gh api "repos/${repo}/issues" \
        --method GET \
        -f labels="release-blocker" \
        -f state="open" \
        -f per_page="100" \
        --jq '[.[] | {
            number: .number,
            title: .title,
            url: .html_url,
            created_at: .created_at,
            updated_at: .updated_at,
            labels: [.labels[].name]
        }]' 2>/dev/null || echo "[]")

    local issue_count
    issue_count=$(echo "$issues_json" | jq 'length')
    log_info "Found ${issue_count} open release-blocker issues"

    # Read blockers state for additional context
    local blockers_state_file="${REPO_ROOT}/docs/releases/_state/blockers_state.json"
    local blockers_state="{}"
    if [[ -f "$blockers_state_file" ]]; then
        blockers_state=$(cat "$blockers_state_file")
    fi

    # Compute statistics
    local now
    now=$(now_epoch)
    local timestamp
    timestamp=$(epoch_to_iso "$now")

    local p0_count=0
    local p1_count=0
    local escalated_count=0
    local oldest_age=0

    # Process issues for statistics
    while IFS= read -r issue; do
        local labels created_at
        labels=$(echo "$issue" | jq -r '.labels | join(",")')
        created_at=$(echo "$issue" | jq -r '.created_at')

        local created_epoch age_minutes
        created_epoch=$(iso_to_epoch "$created_at")
        age_minutes=$(minutes_since "$created_epoch")

        if (( age_minutes > oldest_age )); then
            oldest_age=$age_minutes
        fi

        if echo "$labels" | grep -qE "severity:P0|blocked|escalation:P0"; then
            p0_count=$((p0_count + 1))
        elif echo "$labels" | grep -qE "severity:P1|escalation:P1"; then
            p1_count=$((p1_count + 1))
        fi

        if echo "$labels" | grep -q "escalation:"; then
            escalated_count=$((escalated_count + 1))
        fi
    done < <(echo "$issues_json" | jq -c '.[]')

    # Get queue status (optional)
    local queued_count=0
    local in_progress_count=0

    log_info "Fetching workflow queue status..."
    local runs_json
    runs_json=$(gh api "repos/${repo}/actions/runs" \
        --method GET \
        -f per_page="50" \
        --jq '{queued: [.workflow_runs[] | select(.status == "queued")] | length, in_progress: [.workflow_runs[] | select(.status == "in_progress")] | length}' \
        2>/dev/null || echo '{"queued":0,"in_progress":0}')

    queued_count=$(echo "$runs_json" | jq -r '.queued // 0')
    in_progress_count=$(echo "$runs_json" | jq -r '.in_progress // 0')

    # Generate digest content
    log_info "Generating digest..."

    local digest_content
    digest_content=$(cat <<EOF
# Release Ops Daily Digest

**Generated:** ${timestamp}
**Repository:** [${repo}](https://github.com/${repo})

---

## Overview

| Metric | Count |
|--------|-------|
| **Open Blockers** | ${issue_count} |
| **P0 (Critical)** | ${p0_count} |
| **P1 (Queued/Pending)** | ${p1_count} |
| **Escalated** | ${escalated_count} |
| **Oldest Blocker Age** | $(format_age $oldest_age) |

### CI Queue Status

| Status | Count |
|--------|-------|
| Queued | ${queued_count} |
| In Progress | ${in_progress_count} |

---

## Promotable Candidates

EOF
)

    # Check for promotable candidates (simplified - would need dashboard integration)
    digest_content+=$'\n*No dashboard data available. Run release-train-dashboard.yml for promotability status.*\n\n'

    # Add blocked items section
    digest_content+="---

## Blocked Items (P0)

"

    if (( p0_count > 0 )); then
        digest_content+="| Issue | Age | Labels | Title |
|-------|-----|--------|-------|
"
        echo "$issues_json" | jq -c '.[]' | while read -r issue; do
            local number title url labels created_at
            number=$(echo "$issue" | jq -r '.number')
            title=$(echo "$issue" | jq -r '.title')
            url=$(echo "$issue" | jq -r '.url')
            labels=$(echo "$issue" | jq -r '.labels | join(", ")')
            created_at=$(echo "$issue" | jq -r '.created_at')

            if echo "$labels" | grep -qE "severity:P0|blocked|escalation:P0"; then
                local created_epoch age_minutes
                created_epoch=$(iso_to_epoch "$created_at")
                age_minutes=$(minutes_since "$created_epoch")

                echo "| [#${number}](${url}) | $(format_age $age_minutes) | \`${labels}\` | ${title:0:50}... |"
            fi
        done >> /dev/stdout
    else
        digest_content+="*No P0 blockers at this time.*
"
    fi

    # Add P1 items section
    digest_content+="
---

## Queued/Pending Items (P1)

"

    if (( p1_count > 0 )); then
        digest_content+="| Issue | Age | Labels | Title |
|-------|-----|--------|-------|
"
        echo "$issues_json" | jq -c '.[]' | while read -r issue; do
            local number title url labels created_at
            number=$(echo "$issue" | jq -r '.number')
            title=$(echo "$issue" | jq -r '.title')
            url=$(echo "$issue" | jq -r '.url')
            labels=$(echo "$issue" | jq -r '.labels | join(", ")')
            created_at=$(echo "$issue" | jq -r '.created_at')

            if echo "$labels" | grep -qE "severity:P1|escalation:P1" && ! echo "$labels" | grep -qE "severity:P0|blocked|escalation:P0"; then
                local created_epoch age_minutes
                created_epoch=$(iso_to_epoch "$created_at")
                age_minutes=$(minutes_since "$created_epoch")

                echo "| [#${number}](${url}) | $(format_age $age_minutes) | \`${labels}\` | ${title:0:50}... |"
            fi
        done >> /dev/stdout
    else
        digest_content+="*No P1 items at this time.*
"
    fi

    # Add aging summary
    digest_content+="
---

## Aging Summary

| Age Bucket | Count |
|------------|-------|
"

    local age_lt1h=0 age_1to4h=0 age_4to12h=0 age_12to24h=0 age_gt24h=0

    echo "$issues_json" | jq -c '.[]' | while read -r issue; do
        local created_at
        created_at=$(echo "$issue" | jq -r '.created_at')
        local created_epoch age_minutes
        created_epoch=$(iso_to_epoch "$created_at")
        age_minutes=$(minutes_since "$created_epoch")

        if (( age_minutes < 60 )); then
            age_lt1h=$((age_lt1h + 1))
        elif (( age_minutes < 240 )); then
            age_1to4h=$((age_1to4h + 1))
        elif (( age_minutes < 720 )); then
            age_4to12h=$((age_4to12h + 1))
        elif (( age_minutes < 1440 )); then
            age_12to24h=$((age_12to24h + 1))
        else
            age_gt24h=$((age_gt24h + 1))
        fi
    done

    digest_content+="| < 1 hour | ${age_lt1h} |
| 1-4 hours | ${age_1to4h} |
| 4-12 hours | ${age_4to12h} |
| 12-24 hours | ${age_12to24h} |
| > 24 hours | ${age_gt24h} |
"

    # Add recommended actions
    digest_content+="
---

## Recommended Actions

"

    if (( p0_count > 0 )); then
        digest_content+="1. **Triage P0 blockers** - ${p0_count} critical issues require immediate attention
"
    fi

    if (( queued_count > 10 )); then
        digest_content+="2. **Drain CI queue** - ${queued_count} runs queued; consider cancelling stale runs
"
    fi

    if (( oldest_age > 480 )); then
        digest_content+="3. **Investigate stale blockers** - Oldest blocker is $(format_age $oldest_age) old
"
    fi

    if (( p0_count == 0 && p1_count == 0 )); then
        digest_content+="✅ **No active blockers** - Release lines are clear for promotion
"
    fi

    # Add footer
    digest_content+="
---

## Notes

- This digest is generated automatically every 24 hours
- For real-time status, check the [Actions dashboard](https://github.com/${repo}/actions)
- Rate-limited: $([ "$should_post" == "true" ] && echo "Eligible for posting" || echo "Rate-limited, artifact only")

---

*Generated by generate_release_ops_digest.sh v${SCRIPT_VERSION}*
"

    # Write digest
    echo "$digest_content" > "$out_file"
    log_success "Digest written to: ${out_file}"

    # Compute content hash
    local content_hash
    content_hash=$(compute_content_hash "$digest_content")
    log_info "Content hash: ${content_hash}"

    # Check if content changed
    if [[ "$content_hash" == "$last_digest_hash" ]]; then
        log_info "Content unchanged from last digest"
        should_post="false"
    fi

    # Update state (if not dry-run and should post)
    if [[ "$dry_run" != "true" && "$should_post" == "true" ]]; then
        local new_state
        new_state=$(jq --arg ts "$timestamp" --arg hash "$content_hash" \
            '.last_digest_at = $ts | .last_digest_hash = $hash' <<< "$state_json")
        echo "$new_state" | jq '.' > "$state_file"
        log_success "State updated"
    elif [[ "$dry_run" == "true" ]]; then
        log_info "[DRY-RUN] Would update state with timestamp: ${timestamp}"
    else
        log_info "Rate-limited or unchanged - state not updated"
    fi

    echo ""
    log_success "═══════════════════════════════════════════════════════════════"
    log_success "  Digest Generation Complete"
    log_success "═══════════════════════════════════════════════════════════════"
    echo ""
    log_info "Output: ${out_file}"
    log_info "Blockers: ${issue_count} (P0: ${p0_count}, P1: ${p1_count})"
    log_info "Queue: ${queued_count} queued, ${in_progress_count} in progress"
    log_info "Should post: ${should_post}"
    echo ""
}

main "$@"
