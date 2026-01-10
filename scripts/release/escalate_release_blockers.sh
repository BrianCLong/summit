#!/usr/bin/env bash
# escalate_release_blockers.sh v1.0.0
# Implements SLO-style escalation for release blocker issues
#
# This script:
# - Reads current blocker status from dashboard or computed state
# - Applies escalation labels based on age thresholds
# - Updates issues with escalation status (rate-limited)
# - Manages state to prevent spam and track escalation levels
#
# Usage: ./escalate_release_blockers.sh [OPTIONS]
#
# See docs/ci/BLOCKER_ESCALATION.md for full documentation.

set -euo pipefail

# --- Configuration ---
SCRIPT_VERSION="1.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Default paths
DEFAULT_POLICY="${REPO_ROOT}/docs/ci/BLOCKER_ESCALATION_POLICY.yml"
DEFAULT_STATE="${REPO_ROOT}/docs/releases/_state/blockers_state.json"
DEFAULT_REPORT="${REPO_ROOT}/artifacts/release-train/escalation_report.md"

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

Implements SLO-style escalation for release blocker issues.

OPTIONS:
    --policy PATH       Path to escalation policy YAML (default: ${DEFAULT_POLICY})
    --state PATH        Path to blockers state JSON (default: ${DEFAULT_STATE})
    --report PATH       Path for escalation report (default: ${DEFAULT_REPORT})
    --repo OWNER/REPO   GitHub repository (default: from git remote)
    --dry-run           Print actions without modifying issues
    --enable-notify     Enable team notifications (default: disabled)
    --help              Show this help message

EXAMPLES:
    $0 --dry-run
    $0 --policy docs/ci/BLOCKER_ESCALATION_POLICY.yml
    $0 --repo myorg/myrepo --enable-notify

EOF
}

# --- Parse YAML helper (basic) ---
# Note: For production, consider using yq or a proper YAML parser
parse_yaml_value() {
    local file="$1"
    local key="$2"
    grep -E "^\s*${key}:" "$file" 2>/dev/null | head -1 | sed -E 's/.*:\s*//' | tr -d '"' || echo ""
}

parse_yaml_int() {
    local file="$1"
    local key="$2"
    local val
    val=$(parse_yaml_value "$file" "$key")
    echo "${val:-0}"
}

# --- Time calculations ---
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
    local now_epoch
    now_epoch=$(now_epoch)
    echo $(( (now_epoch - start_epoch) / 60 ))
}

# --- Fingerprint generation ---
compute_fingerprint() {
    local release_line="$1"
    local sha="$2"
    local workflow="$3"
    local job="$4"
    local category="$5"

    echo "${release_line}:${sha}:${workflow}:${job}:${category}" | sha256sum | cut -c1-16
}

# --- Escalation level calculation ---
compute_escalation_level() {
    local severity="$1"  # P0 or P1
    local age_minutes="$2"
    local policy_file="$3"

    local warn_threshold escalate_threshold page_threshold

    if [[ "$severity" == "P0" ]]; then
        warn_threshold=$(parse_yaml_int "$policy_file" "warn" | head -1)
        escalate_threshold=$(parse_yaml_int "$policy_file" "escalate" | head -1)
        page_threshold=$(parse_yaml_int "$policy_file" "page" | head -1)

        # Use defaults if not found
        warn_threshold=${warn_threshold:-60}
        escalate_threshold=${escalate_threshold:-240}
        page_threshold=${page_threshold:-480}

        if (( age_minutes >= page_threshold )); then
            echo "page"
        elif (( age_minutes >= escalate_threshold )); then
            echo "escalate"
        elif (( age_minutes >= warn_threshold )); then
            echo "warn"
        else
            echo "none"
        fi
    else
        # P1 thresholds
        warn_threshold=${warn_threshold:-240}
        escalate_threshold=${escalate_threshold:-720}

        if (( age_minutes >= escalate_threshold )); then
            echo "escalate"
        elif (( age_minutes >= warn_threshold )); then
            echo "warn"
        else
            echo "none"
        fi
    fi
}

# --- Get labels for escalation level ---
get_escalation_labels() {
    local severity="$1"
    local level="$2"

    case "${severity}:${level}" in
        "P0:warn")
            echo "escalation:warn needs-triage"
            ;;
        "P0:escalate")
            echo "escalation:P0 escalation:4h+ needs-attention"
            ;;
        "P0:page")
            echo "escalation:P0 escalation:8h+ needs-immediate-attention on-call"
            ;;
        "P1:warn")
            echo "escalation:warn"
            ;;
        "P1:escalate")
            echo "escalation:P1 escalation:12h+ needs-attention"
            ;;
        *)
            echo ""
            ;;
    esac
}

# --- Apply labels to issue ---
apply_labels() {
    local repo="$1"
    local issue_number="$2"
    local labels="$3"
    local dry_run="$4"

    if [[ -z "$labels" ]]; then
        return 0
    fi

    # Convert space-separated labels to JSON array
    local labels_json="["
    local first=true
    for label in $labels; do
        if [[ "$first" != "true" ]]; then
            labels_json+=","
        fi
        labels_json+="\"${label}\""
        first=false
    done
    labels_json+="]"

    if [[ "$dry_run" == "true" ]]; then
        log_info "[DRY-RUN] Would apply labels to issue #${issue_number}: ${labels}"
    else
        gh api "repos/${repo}/issues/${issue_number}/labels" \
            --method POST \
            --input - <<< "{\"labels\": ${labels_json}}" \
            > /dev/null 2>&1 || log_warn "Failed to apply labels to issue #${issue_number}"
    fi
}

# --- Update issue body with escalation section ---
update_issue_escalation_section() {
    local repo="$1"
    local issue_number="$2"
    local escalation_level="$3"
    local age_minutes="$4"
    local first_seen="$5"
    local run_urls="$6"
    local dry_run="$7"

    local timestamp
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    local escalation_section
    escalation_section=$(cat <<EOF

---

## Escalation Status

| Field | Value |
|-------|-------|
| **Level** | ${escalation_level} |
| **Age** | ${age_minutes} minutes |
| **First Seen** | ${first_seen} |
| **Last Updated** | ${timestamp} |

### Latest Run Links

${run_urls:-"No run URLs available"}

---

*This section is automatically updated by the Release Blocker Escalation workflow.*
EOF
)

    if [[ "$dry_run" == "true" ]]; then
        log_info "[DRY-RUN] Would update issue #${issue_number} with escalation section"
        log_info "  Level: ${escalation_level}, Age: ${age_minutes}m"
    else
        # Get current issue body
        local current_body
        current_body=$(gh api "repos/${repo}/issues/${issue_number}" --jq '.body' 2>/dev/null || echo "")

        # Remove existing escalation section if present
        local new_body
        new_body=$(echo "$current_body" | sed '/^---$/,/\*This section is automatically updated/d')

        # Append new escalation section
        new_body="${new_body}${escalation_section}"

        # Update issue
        gh api "repos/${repo}/issues/${issue_number}" \
            --method PATCH \
            --field body="$new_body" \
            > /dev/null 2>&1 || log_warn "Failed to update issue #${issue_number}"
    fi
}

# --- Main logic ---
main() {
    local policy_file="${DEFAULT_POLICY}"
    local state_file="${DEFAULT_STATE}"
    local report_file="${DEFAULT_REPORT}"
    local repo=""
    local dry_run="false"
    local enable_notify="false"

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
            --report)
                report_file="$2"
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
            --enable-notify)
                enable_notify="true"
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

    # Validate policy file exists
    if [[ ! -f "$policy_file" ]]; then
        log_error "Policy file not found: ${policy_file}"
        exit 2
    fi

    # Get repo from git if not provided
    if [[ -z "$repo" ]]; then
        repo=$(git remote get-url origin 2>/dev/null | sed -E 's|.*github.com[:/](.+/.+)\.git|\1|' || echo "")
        if [[ -z "$repo" ]]; then
            log_error "Could not determine repository. Use --repo flag."
            exit 2
        fi
    fi

    # Ensure state file exists
    if [[ ! -f "$state_file" ]]; then
        mkdir -p "$(dirname "$state_file")"
        echo '{"version":"1.0.0","last_updated":null,"blockers":{}}' > "$state_file"
    fi

    # Ensure report directory exists
    mkdir -p "$(dirname "$report_file")"

    echo ""
    log_info "═══════════════════════════════════════════════════════════════"
    log_info "  Release Blocker Escalation"
    log_info "═══════════════════════════════════════════════════════════════"
    log_info "Script version: ${SCRIPT_VERSION}"
    log_info "Repository: ${repo}"
    log_info "Policy: ${policy_file}"
    log_info "State: ${state_file}"
    log_info "Dry run: ${dry_run}"
    echo ""

    # Read current state
    local state_json
    state_json=$(cat "$state_file")

    # Get open release-blocker issues
    log_info "Fetching open release-blocker issues..."
    local issues_json
    issues_json=$(gh api "repos/${repo}/issues" \
        --method GET \
        -f labels="release-blocker" \
        -f state="open" \
        --jq '[.[] | {number: .number, title: .title, created_at: .created_at, labels: [.labels[].name]}]' \
        2>/dev/null || echo "[]")

    local issue_count
    issue_count=$(echo "$issues_json" | jq 'length')
    log_info "Found ${issue_count} open release-blocker issues"

    # Initialize report
    local report_content
    report_content=$(cat <<EOF
# Release Blocker Escalation Report

**Generated:** $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**Repository:** ${repo}
**Mode:** $([ "$dry_run" == "true" ] && echo "Dry Run" || echo "Live")

## Summary

| Metric | Value |
|--------|-------|
| Open Blockers | ${issue_count} |
| Escalated | 0 |
| Updated | 0 |

## Blocker Details

EOF
)

    local escalated_count=0
    local updated_count=0
    local now
    now=$(now_epoch)

    # Process each issue
    echo "$issues_json" | jq -c '.[]' | while read -r issue; do
        local issue_number title created_at labels
        issue_number=$(echo "$issue" | jq -r '.number')
        title=$(echo "$issue" | jq -r '.title')
        created_at=$(echo "$issue" | jq -r '.created_at')
        labels=$(echo "$issue" | jq -r '.labels | join(", ")')

        log_info "Processing issue #${issue_number}: ${title}"

        # Determine severity from labels
        local severity="P1"
        if echo "$labels" | grep -q "severity:P0\|blocked"; then
            severity="P0"
        fi

        # Calculate age
        local created_epoch age_minutes
        created_epoch=$(iso_to_epoch "$created_at")
        age_minutes=$(minutes_since "$created_epoch")

        log_info "  Severity: ${severity}, Age: ${age_minutes} minutes"

        # Compute fingerprint (simplified - using issue number as identifier)
        local fingerprint="issue:${issue_number}"

        # Get previous state for this blocker
        local prev_level prev_update
        prev_level=$(echo "$state_json" | jq -r ".blockers[\"${fingerprint}\"].escalation_level // \"none\"")
        prev_update=$(echo "$state_json" | jq -r ".blockers[\"${fingerprint}\"].last_issue_update // \"\"")

        # Compute new escalation level
        local new_level
        new_level=$(compute_escalation_level "$severity" "$age_minutes" "$policy_file")

        log_info "  Previous level: ${prev_level}, New level: ${new_level}"

        # Determine if we should update
        local should_update="false"
        local reason=""

        if [[ "$new_level" != "$prev_level" && "$new_level" != "none" ]]; then
            should_update="true"
            reason="escalation_changed"
            escalated_count=$((escalated_count + 1))
        elif [[ "$new_level" != "none" ]]; then
            # Check cadence
            local cadence_minutes=60
            if [[ -n "$prev_update" && "$prev_update" != "null" ]]; then
                local prev_update_epoch
                prev_update_epoch=$(iso_to_epoch "$prev_update")
                local minutes_since_update
                minutes_since_update=$(minutes_since "$prev_update_epoch")
                if (( minutes_since_update >= cadence_minutes )); then
                    should_update="true"
                    reason="cadence_update"
                fi
            else
                should_update="true"
                reason="first_update"
            fi
        fi

        # Apply escalation
        if [[ "$should_update" == "true" ]]; then
            log_info "  Updating issue (reason: ${reason})"

            # Get labels to apply
            local new_labels
            new_labels=$(get_escalation_labels "$severity" "$new_level")

            if [[ -n "$new_labels" ]]; then
                apply_labels "$repo" "$issue_number" "$new_labels" "$dry_run"
            fi

            # Update issue body
            local run_urls="- [Latest workflow runs](https://github.com/${repo}/actions)"
            update_issue_escalation_section "$repo" "$issue_number" "$new_level" "$age_minutes" "$created_at" "$run_urls" "$dry_run"

            updated_count=$((updated_count + 1))

            # Update state
            local update_time
            update_time=$(epoch_to_iso "$now")
            state_json=$(echo "$state_json" | jq ".blockers[\"${fingerprint}\"] = {
                \"issue_number\": ${issue_number},
                \"first_seen\": \"${created_at}\",
                \"last_seen\": \"${update_time}\",
                \"last_issue_update\": \"${update_time}\",
                \"escalation_level\": \"${new_level}\",
                \"severity\": \"${severity}\"
            }")
        else
            log_info "  No update needed"
        fi

        # Add to report
        report_content+=$(cat <<EOF

### Issue #${issue_number}

**Title:** ${title}
**Severity:** ${severity}
**Age:** ${age_minutes} minutes
**Escalation Level:** ${new_level}
**Updated:** $([ "$should_update" == "true" ] && echo "Yes (${reason})" || echo "No")

EOF
)
    done

    # Update summary in report
    report_content=$(echo "$report_content" | sed "s/| Escalated | 0 |/| Escalated | ${escalated_count} |/")
    report_content=$(echo "$report_content" | sed "s/| Updated | 0 |/| Updated | ${updated_count} |/")

    # Add footer
    report_content+=$(cat <<EOF

---

## Configuration

- **Policy File:** ${policy_file}
- **State File:** ${state_file}
- **Dry Run:** ${dry_run}
- **Notifications Enabled:** ${enable_notify}

---

*Generated by escalate_release_blockers.sh v${SCRIPT_VERSION}*
EOF
)

    # Write report
    echo "$report_content" > "$report_file"
    log_success "Report written to: ${report_file}"

    # Update state file
    if [[ "$dry_run" != "true" ]]; then
        local update_time
        update_time=$(epoch_to_iso "$(now_epoch)")
        state_json=$(echo "$state_json" | jq ".last_updated = \"${update_time}\"")
        echo "$state_json" | jq '.' > "$state_file"
        log_success "State updated: ${state_file}"
    else
        log_info "[DRY-RUN] State file would be updated"
    fi

    echo ""
    log_success "═══════════════════════════════════════════════════════════════"
    log_success "  Escalation Complete"
    log_success "═══════════════════════════════════════════════════════════════"
    echo ""
    log_info "Processed: ${issue_count} issues"
    log_info "Escalated: ${escalated_count}"
    log_info "Updated: ${updated_count}"
    echo ""
}

main "$@"
