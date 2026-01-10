#!/usr/bin/env bash
# rollback_release.sh
#
# Automates safe rollback of a failed GA release. Provides step-by-step
# guidance and safeguards to ensure clean rollback.
#
# Usage:
#   ./scripts/release/rollback_release.sh [OPTIONS]
#
# Options:
#   --tag <tag>          GA tag to rollback (e.g., v4.1.2)
#   --reason <reason>    Reason for rollback (required)
#   --dry-run            Show what would happen without executing
#   --force              Skip confirmation prompts
#   --create-issue       Create GitHub issue for tracking
#   --help               Show this help message
#
# Exit codes:
#   0 - Rollback completed successfully
#   1 - Rollback failed or was aborted
#   2 - Invalid arguments or configuration error

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
STATE_DIR="${REPO_ROOT}/docs/releases/_state"
STATE_FILE="${STATE_DIR}/rollback_state.json"

# Defaults
TAG=""
REASON=""
DRY_RUN=false
FORCE=false
CREATE_ISSUE=false

# Timestamp
ROLLBACK_TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $*" >&2; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $*" >&2; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $*" >&2; }
log_error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --tag)
      TAG="$2"
      shift 2
      ;;
    --reason)
      REASON="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    --create-issue)
      CREATE_ISSUE=true
      shift
      ;;
    --help)
      head -25 "$0" | tail -21
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 2
      ;;
  esac
done

# Validate GA tag format
validate_ga_tag() {
  local tag="$1"
  if ! [[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    log_error "Invalid GA tag format: $tag"
    log_error "Expected format: vX.Y.Z (e.g., v4.1.2)"
    exit 2
  fi
}

# Find previous stable tag
find_previous_tag() {
  local current_tag="$1"

  # Get all GA tags sorted by version, find the one before current
  git tag -l 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | \
    grep -v -E '\-rc\.' | \
    grep -A1 "^${current_tag}$" | \
    tail -1
}

# Check if tag exists
tag_exists() {
  local tag="$1"
  git rev-parse "$tag" >/dev/null 2>&1
}

# Check if release exists on GitHub
github_release_exists() {
  local tag="$1"
  if [[ -n "${GITHUB_TOKEN:-}" ]]; then
    gh release view "$tag" >/dev/null 2>&1
    return $?
  fi
  return 1
}

# Delete Git tag
delete_git_tag() {
  local tag="$1"

  log_info "Deleting local tag: $tag"
  if [[ "$DRY_RUN" == "true" ]]; then
    log_warn "[DRY-RUN] Would run: git tag -d $tag"
  else
    git tag -d "$tag" 2>/dev/null || log_warn "Local tag not found"
  fi

  log_info "Deleting remote tag: $tag"
  if [[ "$DRY_RUN" == "true" ]]; then
    log_warn "[DRY-RUN] Would run: git push origin :refs/tags/$tag"
  else
    git push origin ":refs/tags/$tag" 2>/dev/null || log_warn "Remote tag not found or already deleted"
  fi
}

# Delete GitHub release
delete_github_release() {
  local tag="$1"

  if [[ -z "${GITHUB_TOKEN:-}" ]]; then
    log_warn "GITHUB_TOKEN not set, skipping GitHub release deletion"
    return 0
  fi

  log_info "Deleting GitHub release: $tag"
  if [[ "$DRY_RUN" == "true" ]]; then
    log_warn "[DRY-RUN] Would run: gh release delete $tag --yes"
  else
    gh release delete "$tag" --yes 2>/dev/null || log_warn "GitHub release not found or already deleted"
  fi
}

# Create rollback tracking issue
create_rollback_issue() {
  local tag="$1"
  local reason="$2"
  local previous_tag="$3"

  if [[ -z "${GITHUB_TOKEN:-}" ]]; then
    log_warn "GITHUB_TOKEN not set, skipping issue creation"
    return 0
  fi

  log_info "Creating rollback tracking issue"

  local issue_body="## Release Rollback: $tag

**Rolled Back At:** ${ROLLBACK_TIMESTAMP}
**Previous Stable:** $previous_tag
**Reason:** $reason

---

## Rollback Actions Taken

- [x] Deleted GA tag: \`$tag\`
- [x] Deleted GitHub release (if existed)
- [ ] Verified production is running previous stable version
- [ ] Notified stakeholders
- [ ] Root cause analysis started

## Post-Rollback Checklist

- [ ] Confirm production health
- [ ] Review error logs
- [ ] Identify root cause
- [ ] Create fix PR
- [ ] Schedule new release attempt

## Related

- Previous stable: \`$previous_tag\`
- Rollback timestamp: ${ROLLBACK_TIMESTAMP}

---

/label release-rollback,severity:P0
"

  if [[ "$DRY_RUN" == "true" ]]; then
    log_warn "[DRY-RUN] Would create issue with title: Rollback: $tag - $reason"
    echo "$issue_body"
  else
    local issue_url
    issue_url=$(gh issue create \
      --title "Rollback: $tag - $reason" \
      --body "$issue_body" \
      --label "release-rollback,severity:P0" 2>/dev/null || echo "")

    if [[ -n "$issue_url" ]]; then
      log_success "Created tracking issue: $issue_url"
      echo "$issue_url"
    else
      log_warn "Could not create tracking issue"
    fi
  fi
}

# Update state file
update_state() {
  local tag="$1"
  local reason="$2"
  local previous_tag="$3"
  local status="$4"

  mkdir -p "$(dirname "$STATE_FILE")"

  local state
  state=$(cat "$STATE_FILE" 2>/dev/null || echo '{"version":"1.0.0","rollbacks":[]}')

  state=$(echo "$state" | jq \
    --arg time "$ROLLBACK_TIMESTAMP" \
    --arg tag "$tag" \
    --arg reason "$reason" \
    --arg previous "$previous_tag" \
    --arg status "$status" \
    '.last_rollback = $time |
     .last_result = {
       tag: $tag,
       reason: $reason,
       previous_tag: $previous,
       status: $status,
       timestamp: $time
     } |
     .rollbacks = ([{
       timestamp: $time,
       tag: $tag,
       reason: $reason,
       previous_tag: $previous,
       status: $status
     }] + .rollbacks[:49])')

  echo "$state" > "$STATE_FILE"
}

# Generate rollback report
generate_report() {
  local tag="$1"
  local reason="$2"
  local previous_tag="$3"

  local report_dir="${REPO_ROOT}/artifacts/reports"
  mkdir -p "$report_dir"

  local report_file="${report_dir}/rollback-${tag}-$(date +%Y%m%d-%H%M%S).md"

  cat > "$report_file" <<EOF
# Release Rollback Report

**Tag:** ${tag}
**Timestamp:** ${ROLLBACK_TIMESTAMP}
**Previous Stable:** ${previous_tag}
**Reason:** ${reason}

---

## Actions Taken

1. ✅ Validated rollback request
2. ✅ Identified previous stable tag: ${previous_tag}
3. ✅ Deleted GA tag: ${tag}
4. ✅ Deleted GitHub release (if existed)
5. ✅ Updated rollback state

---

## Recovery Steps

### Immediate

\`\`\`bash
# Verify current deployed version
kubectl get deployments -o jsonpath='{.items[*].spec.template.spec.containers[*].image}'

# If needed, manually deploy previous version
kubectl set image deployment/app app=${previous_tag}
\`\`\`

### Follow-up

1. **Root Cause Analysis**: Investigate why the release failed
2. **Fix Development**: Create PR to address the issue
3. **Re-release**: After fix is merged and tested

---

## Contacts Notified

- [ ] Engineering Lead
- [ ] SRE Team
- [ ] Product Manager

---

## Next Steps

1. Complete root cause analysis within 24 hours
2. Document findings in postmortem
3. Schedule fix release

---

**Report generated by:** rollback_release.sh
**Dry Run:** ${DRY_RUN}
EOF

  echo "$report_file"
}

# Confirm rollback
confirm_rollback() {
  local tag="$1"
  local previous_tag="$2"

  if [[ "$FORCE" == "true" ]]; then
    return 0
  fi

  echo "" >&2
  echo "╔════════════════════════════════════════════════════════════════╗" >&2
  echo "║                    ⚠️  ROLLBACK CONFIRMATION                    ║" >&2
  echo "╠════════════════════════════════════════════════════════════════╣" >&2
  echo "║                                                                ║" >&2
  echo "║  This will DELETE the following:                               ║" >&2
  echo "║                                                                ║" >&2
  echo "║  • Git tag: $tag                                        ║" >&2
  echo "║  • GitHub release: $tag                                 ║" >&2
  echo "║                                                                ║" >&2
  echo "║  Previous stable version: $previous_tag                 ║" >&2
  echo "║                                                                ║" >&2
  echo "╚════════════════════════════════════════════════════════════════╝" >&2
  echo "" >&2

  read -p "Are you sure you want to proceed? (type 'ROLLBACK' to confirm): " confirmation

  if [[ "$confirmation" != "ROLLBACK" ]]; then
    log_error "Rollback aborted by user"
    exit 1
  fi
}

# Main function
main() {
  echo "========================================" >&2
  echo "RELEASE ROLLBACK" >&2
  echo "========================================" >&2
  echo "" >&2

  # Validate required arguments
  if [[ -z "$TAG" ]]; then
    log_error "Missing required argument: --tag"
    exit 2
  fi

  if [[ -z "$REASON" ]]; then
    log_error "Missing required argument: --reason"
    exit 2
  fi

  # Validate tag format
  validate_ga_tag "$TAG"

  # Check if tag exists
  if ! tag_exists "$TAG"; then
    log_error "Tag $TAG does not exist"
    exit 2
  fi

  # Find previous stable tag
  PREVIOUS_TAG=$(find_previous_tag "$TAG")
  if [[ -z "$PREVIOUS_TAG" || "$PREVIOUS_TAG" == "$TAG" ]]; then
    log_error "Could not find previous stable tag"
    exit 2
  fi

  log_info "Tag to rollback: $TAG"
  log_info "Reason: $REASON"
  log_info "Previous stable: $PREVIOUS_TAG"
  log_info "Dry run: $DRY_RUN"
  echo "" >&2

  # Confirm rollback
  if [[ "$DRY_RUN" != "true" ]]; then
    confirm_rollback "$TAG" "$PREVIOUS_TAG"
  fi

  # Execute rollback steps
  log_info "Step 1: Deleting Git tag..."
  delete_git_tag "$TAG"

  log_info "Step 2: Deleting GitHub release..."
  delete_github_release "$TAG"

  # Create tracking issue if requested
  local issue_url=""
  if [[ "$CREATE_ISSUE" == "true" ]]; then
    log_info "Step 3: Creating tracking issue..."
    issue_url=$(create_rollback_issue "$TAG" "$REASON" "$PREVIOUS_TAG")
  fi

  # Generate report
  log_info "Generating rollback report..."
  local report_file
  report_file=$(generate_report "$TAG" "$REASON" "$PREVIOUS_TAG")
  log_info "Report: $report_file"

  # Update state
  if [[ "$DRY_RUN" != "true" ]]; then
    update_state "$TAG" "$REASON" "$PREVIOUS_TAG" "completed"
  fi

  # Print summary
  echo "" >&2
  echo "========================================" >&2
  if [[ "$DRY_RUN" == "true" ]]; then
    log_warn "DRY RUN COMPLETE - No changes made"
  else
    log_success "ROLLBACK COMPLETE"
  fi
  echo "========================================" >&2
  echo "  Tag:           $TAG" >&2
  echo "  Previous:      $PREVIOUS_TAG" >&2
  echo "  Reason:        $REASON" >&2
  echo "  Report:        $report_file" >&2
  [[ -n "$issue_url" ]] && echo "  Issue:         $issue_url" >&2
  echo "========================================" >&2
  echo "" >&2

  # Output JSON for CI integration
  cat <<EOF
{
  "timestamp": "${ROLLBACK_TIMESTAMP}",
  "tag": "${TAG}",
  "previous_tag": "${PREVIOUS_TAG}",
  "reason": "${REASON}",
  "status": "completed",
  "dry_run": ${DRY_RUN},
  "report": "${report_file}",
  "issue_url": "${issue_url:-null}"
}
EOF
}

main "$@"
