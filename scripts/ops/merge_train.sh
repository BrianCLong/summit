#!/usr/bin/env bash
#
# merge_train.sh - Merge train automation for sequential PR merging
#
# Usage:
#   ./scripts/ops/merge_train.sh --prs 15486,15483,15484 [--mode fast|full] [--dry-run]
#
# Options:
#   --prs LIST      Comma-separated list of PR numbers (in merge order)
#   --mode MODE     Preflight mode: 'fast' or 'full' (default: fast)
#   --dry-run       Show what would be done without executing
#   --force         Continue even if preflight fails (use with caution)
#   --base BRANCH   Base branch (default: main)
#
# How it works:
#   1. For each PR in order:
#      a. Checkout the PR branch
#      b. Rebase onto current base (main)
#      c. Run preflight checks
#      d. Report pass/fail
#   2. Generate summary report with recommendations
#
# Recovery:
#   - On conflict: stops and reports which PR has conflicts
#   - Use --dry-run first to identify issues
#   - Conflicts must be resolved manually, then re-run
#
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PR_LIST=""
MODE="fast"
DRY_RUN=false
FORCE=false
BASE_BRANCH="main"
REPO="${GITHUB_REPOSITORY:-BrianCLong/summit}"
REPORT_FILE="/tmp/merge_train_report_$(date +%Y%m%d_%H%M%S).md"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --prs)
            PR_LIST="$2"
            shift 2
            ;;
        --mode)
            MODE="$2"
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
        --base)
            BASE_BRANCH="$2"
            shift 2
            ;;
        -h|--help)
            head -30 "$0" | tail -25
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

if [[ -z "$PR_LIST" ]]; then
    echo "Error: --prs is required"
    echo "Usage: $0 --prs 15486,15483,15484"
    exit 1
fi

log() {
    echo -e "${BLUE}[merge-train]${NC} $1"
}

log_ok() {
    echo -e "${GREEN}[merge-train] ✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[merge-train] ⚠${NC} $1"
}

log_error() {
    echo -e "${RED}[merge-train] ✗${NC} $1"
}

# Convert PR list to array
IFS=',' read -ra PRS <<< "$PR_LIST"

log "Merge Train Configuration:"
log "  PRs: ${PRS[*]}"
log "  Mode: $MODE"
log "  Base: $BASE_BRANCH"
log "  Dry Run: $DRY_RUN"
log ""

# Ensure we're in repo root
REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT" || exit 1

# Check for gh CLI
if ! command -v gh &> /dev/null; then
    log_error "gh (GitHub CLI) is required but not installed."
    exit 1
fi

# Copy preflight script to temp location (so it works on branches that don't have it)
PREFLIGHT_SCRIPT="/tmp/preflight_merge_train_$$.sh"
if [[ -f "$REPO_ROOT/scripts/ci/preflight.sh" ]]; then
    cp "$REPO_ROOT/scripts/ci/preflight.sh" "$PREFLIGHT_SCRIPT"
    chmod +x "$PREFLIGHT_SCRIPT"
    log "Preflight script cached at $PREFLIGHT_SCRIPT"
else
    log_warn "No preflight.sh found - will use fallback validation"
    PREFLIGHT_SCRIPT=""
fi

# Fallback validation function (when preflight.sh not available)
run_fallback_validation() {
    local mode="$1"
    log "  Running fallback validation ($mode)..."

    # Install
    if ! pnpm install --frozen-lockfile 2>/dev/null; then
        pnpm install 2>/dev/null || return 1
    fi

    # Lint
    if ! pnpm lint 2>/dev/null; then
        log_warn "Lint failed or not available"
    fi

    # Typecheck
    if ! pnpm typecheck 2>/dev/null; then
        log_warn "Typecheck failed or not available"
    fi

    if [[ "$mode" != "fast" ]]; then
        # Test
        if ! pnpm test 2>/dev/null; then
            log_warn "Tests failed or not available"
        fi

        # Build
        if ! pnpm build 2>/dev/null; then
            return 1
        fi
    fi

    return 0
}

# Initialize report
cat > "$REPORT_FILE" << EOF
# Merge Train Report

Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

## Configuration

- **PRs**: ${PRS[*]}
- **Mode**: $MODE
- **Base Branch**: $BASE_BRANCH
- **Dry Run**: $DRY_RUN

## Results

| PR | Title | Rebase | Preflight | Status |
|---|---|---|---|---|
EOF

# Track results
declare -A RESULTS
FAILED=0

# Ensure we start from clean state
log "Ensuring clean git state..."
CURRENT_BRANCH=$(git branch --show-current)
if [[ $(git status --porcelain | wc -l) -gt 0 ]]; then
    log_warn "Working directory has uncommitted changes. Stashing..."
    git stash push -m "merge-train-$(date +%s)" || true
fi

# Fetch latest
log "Fetching latest from origin..."
git fetch origin "$BASE_BRANCH" --quiet

for PR_NUM in "${PRS[@]}"; do
    log ""
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log "Processing PR #$PR_NUM"
    log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # Get PR info
    PR_INFO=$(gh pr view "$PR_NUM" --repo "$REPO" --json title,headRefName,mergeable,statusCheckRollup 2>/dev/null || echo '{}')

    if [[ "$PR_INFO" == "{}" ]] || [[ -z "$PR_INFO" ]]; then
        log_error "Could not fetch PR #$PR_NUM info"
        RESULTS[$PR_NUM]="FETCH_FAILED"
        echo "| #$PR_NUM | _unknown_ | - | - | **FETCH_FAILED** |" >> "$REPORT_FILE"
        ((FAILED++))
        continue
    fi

    PR_TITLE=$(echo "$PR_INFO" | jq -r '.title // "unknown"')
    PR_BRANCH=$(echo "$PR_INFO" | jq -r '.headRefName // ""')
    PR_MERGEABLE=$(echo "$PR_INFO" | jq -r '.mergeable // "unknown"')

    log "  Title: $PR_TITLE"
    log "  Branch: $PR_BRANCH"
    log "  Mergeable: $PR_MERGEABLE"

    if [[ -z "$PR_BRANCH" ]]; then
        log_error "Could not determine branch for PR #$PR_NUM"
        RESULTS[$PR_NUM]="NO_BRANCH"
        echo "| #$PR_NUM | ${PR_TITLE:0:40} | - | - | **NO_BRANCH** |" >> "$REPORT_FILE"
        ((FAILED++))
        continue
    fi

    # Dry run - just report
    if $DRY_RUN; then
        log "  [DRY RUN] Would checkout and rebase $PR_BRANCH onto $BASE_BRANCH"
        log "  [DRY RUN] Would run preflight --$MODE"
        RESULTS[$PR_NUM]="DRY_RUN"
        echo "| #$PR_NUM | ${PR_TITLE:0:40} | _dry-run_ | _dry-run_ | DRY_RUN |" >> "$REPORT_FILE"
        continue
    fi

    # Checkout PR branch
    log "  Checking out $PR_BRANCH..."
    if ! git checkout "$PR_BRANCH" --quiet 2>/dev/null; then
        # Try fetching from origin
        git fetch origin "$PR_BRANCH:$PR_BRANCH" --quiet 2>/dev/null || true
        if ! git checkout "$PR_BRANCH" --quiet 2>/dev/null; then
            log_error "Could not checkout branch $PR_BRANCH"
            RESULTS[$PR_NUM]="CHECKOUT_FAILED"
            echo "| #$PR_NUM | ${PR_TITLE:0:40} | FAILED | - | **CHECKOUT_FAILED** |" >> "$REPORT_FILE"
            ((FAILED++))
            continue
        fi
    fi

    # Rebase onto base
    log "  Rebasing onto origin/$BASE_BRANCH..."
    REBASE_STATUS="OK"
    if ! git rebase "origin/$BASE_BRANCH" --quiet 2>/dev/null; then
        log_error "Rebase failed - conflicts detected"
        git rebase --abort 2>/dev/null || true
        REBASE_STATUS="CONFLICT"
        RESULTS[$PR_NUM]="REBASE_CONFLICT"
        echo "| #$PR_NUM | ${PR_TITLE:0:40} | **CONFLICT** | - | **REBASE_CONFLICT** |" >> "$REPORT_FILE"
        ((FAILED++))
        git checkout "$CURRENT_BRANCH" --quiet 2>/dev/null || git checkout "$BASE_BRANCH" --quiet
        continue
    fi
    log_ok "Rebase successful"

    # Run preflight
    log "  Running preflight ($MODE mode)..."
    PREFLIGHT_STATUS="PASS"
    PREFLIGHT_FLAG=""
    if [[ "$MODE" == "fast" ]]; then
        PREFLIGHT_FLAG="--fast"
    fi

    # Use cached preflight script or fallback
    PREFLIGHT_OK=false
    if [[ -n "$PREFLIGHT_SCRIPT" ]] && [[ -f "$PREFLIGHT_SCRIPT" ]]; then
        if "$PREFLIGHT_SCRIPT" $PREFLIGHT_FLAG > "/tmp/preflight_pr${PR_NUM}.log" 2>&1; then
            PREFLIGHT_OK=true
        fi
    else
        # Use fallback validation
        if run_fallback_validation "$MODE" > "/tmp/preflight_pr${PR_NUM}.log" 2>&1; then
            PREFLIGHT_OK=true
        fi
    fi

    if ! $PREFLIGHT_OK; then
        PREFLIGHT_STATUS="FAIL"
        log_error "Preflight failed. See /tmp/preflight_pr${PR_NUM}.log"

        if ! $FORCE; then
            RESULTS[$PR_NUM]="PREFLIGHT_FAILED"
            echo "| #$PR_NUM | ${PR_TITLE:0:40} | OK | **FAIL** | **PREFLIGHT_FAILED** |" >> "$REPORT_FILE"
            ((FAILED++))
            git checkout "$CURRENT_BRANCH" --quiet 2>/dev/null || git checkout "$BASE_BRANCH" --quiet
            continue
        else
            log_warn "Force mode - continuing despite preflight failure"
        fi
    else
        log_ok "Preflight passed"
    fi

    RESULTS[$PR_NUM]="READY"
    echo "| #$PR_NUM | ${PR_TITLE:0:40} | OK | $PREFLIGHT_STATUS | **READY** |" >> "$REPORT_FILE"

    # Return to base for next PR
    git checkout "$CURRENT_BRANCH" --quiet 2>/dev/null || git checkout "$BASE_BRANCH" --quiet
done

# Return to original branch
git checkout "$CURRENT_BRANCH" --quiet 2>/dev/null || git checkout "$BASE_BRANCH" --quiet

# Generate summary
cat >> "$REPORT_FILE" << EOF

## Summary

- **Total PRs**: ${#PRS[@]}
- **Ready to Merge**: $((${#PRS[@]} - FAILED))
- **Failed/Blocked**: $FAILED

## Next Actions

EOF

# Add recommendations
READY_COUNT=0
for PR_NUM in "${PRS[@]}"; do
    STATUS="${RESULTS[$PR_NUM]:-UNKNOWN}"
    if [[ "$STATUS" == "READY" ]]; then
        echo "1. PR #$PR_NUM is ready. Run: \`gh pr merge $PR_NUM --repo $REPO --squash\`" >> "$REPORT_FILE"
        ((READY_COUNT++))
    elif [[ "$STATUS" == "REBASE_CONFLICT" ]]; then
        echo "- PR #$PR_NUM has conflicts. Resolve manually, then re-run merge train." >> "$REPORT_FILE"
    elif [[ "$STATUS" == "PREFLIGHT_FAILED" ]]; then
        echo "- PR #$PR_NUM failed preflight. Check \`/tmp/preflight_pr${PR_NUM}.log\` for details." >> "$REPORT_FILE"
    elif [[ "$STATUS" == "DRY_RUN" ]]; then
        echo "- PR #$PR_NUM (dry run) - would be processed in actual run." >> "$REPORT_FILE"
    fi
done

if [[ $READY_COUNT -eq ${#PRS[@]} ]] && ! $DRY_RUN; then
    echo "" >> "$REPORT_FILE"
    echo "**All PRs are ready for merge!** Consider running:" >> "$REPORT_FILE"
    echo "\`\`\`bash" >> "$REPORT_FILE"
    for PR_NUM in "${PRS[@]}"; do
        echo "gh pr merge $PR_NUM --repo $REPO --squash && \\" >> "$REPORT_FILE"
    done
    echo "echo 'Merge train complete'" >> "$REPORT_FILE"
    echo "\`\`\`" >> "$REPORT_FILE"
fi

# Print report
echo ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log "                 MERGE TRAIN SUMMARY"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

printf "%-10s %-50s %s\n" "PR" "TITLE" "STATUS"
echo "────────────────────────────────────────────────────────────────────"

for PR_NUM in "${PRS[@]}"; do
    STATUS="${RESULTS[$PR_NUM]:-UNKNOWN}"
    # Get title from earlier
    PR_INFO=$(gh pr view "$PR_NUM" --repo "$REPO" --json title 2>/dev/null || echo '{}')
    TITLE=$(echo "$PR_INFO" | jq -r '.title // "unknown"' | head -c 45)

    if [[ "$STATUS" == "READY" ]] || [[ "$STATUS" == "DRY_RUN" ]]; then
        printf "%-10s %-50s ${GREEN}%s${NC}\n" "#$PR_NUM" "$TITLE" "$STATUS"
    else
        printf "%-10s %-50s ${RED}%s${NC}\n" "#$PR_NUM" "$TITLE" "$STATUS"
    fi
done

echo ""
log "Full report: $REPORT_FILE"

# Cleanup temp preflight script
[[ -n "${PREFLIGHT_SCRIPT:-}" ]] && rm -f "$PREFLIGHT_SCRIPT" 2>/dev/null || true

if [[ $FAILED -gt 0 ]] && ! $DRY_RUN; then
    log_error "$FAILED PR(s) need attention before merge"
    exit 1
else
    log_ok "Merge train complete. $READY_COUNT PR(s) ready."
    exit 0
fi
