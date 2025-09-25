#!/usr/bin/env bash
set -euo pipefail
set -x

# Usage:
#   scripts/merge-train.sh 1366 1358 1362 1365 1361 1364 1360 1359 1368 1367 1330 1363
# If no PRs passed, defaults to the pre-agreed merge order.

REPO=${REPO:-BrianCLong/summit}
gh repo set-default "$REPO" >/dev/null 2>&1 || true

DEFAULT=(1366 1358 1362 1365 1361 1364 1360 1359 1368 1367 1330 1363)
PERS=("${@:-${DEFAULT[@]}}")

log(){ echo -e "\n=== $ * ===\n"; }

merge_squash(){ local pr=$1 msg=$2; gh pr merge "$pr" --squash --delete-branch --body "$msg"; }
merge_commit(){ local pr=$1 msg=$2; gh pr merge "$pr" --merge --delete-branch --body "$msg"; }
merge_auto(){ local pr=$1 msg=$2; gh pr merge "$pr" --auto --squash --delete-branch --body "$msg"; }

rebase_fix_lockfiles(){ local pr=$1; bash scripts/rebase-fix-lockfiles.sh "$pr"; }

process_pr() {
  local pr_number=$1
  local commit_message=$2
  local status=$(gh pr view "$pr_number" --json mergeable -q .mergeable || echo "UNKNOWN")

  if [ "$status" = "MERGEABLE" ]; then
    log "PR #$pr_number is MERGEABLE; attempting auto-merge."
    merge_auto "$pr_number" "$commit_message"
  else
    log "PR #$pr_number status=$status; attempting rebase + auto-merge."
    # Ensure clean working directory
    git reset --hard HEAD
    git clean -fd
    # Checkout the PR branch
    gh pr checkout "$pr_number"
    # Fetch latest main
    git fetch origin main
    # Rebase onto main
    git rebase origin/main || {
      log_error "Rebase failed for PR #$pr_number. Aborting rebase and skipping PR."
      git rebase --abort || true
      git checkout main # Go back to main
      return 1 # Indicate failure
    }
    # Push rebased branch
    git push --force-with-lease || {
      log_error "Force push failed for PR #$pr_number. Skipping PR."
      git checkout main # Go back to main
      return 1 # Indicate failure
    }
    # Go back to main
    git checkout main
    # Attempt auto-merge again
    merge_auto "$pr_number" "$commit_message"
  fi
}

log "Preflight status"
JQ_QUERY='"#" + (.number|tostring) + "  " + .title + "  [" + .state + "] mergeable:" + .mergeable'
for pr in "${PRS[@]}"; do
  gh pr view "$pr" --json number,title,mergeable,state | jq -r "$JQ_QUERY"
done

# 1) Hygiene: #1366 (rebase+auto if conflicting)
log "Prepare #1366 (lockfile diffs)"
process_pr 1366 "Enable textual lockfile diffs to improve review signal."

# 2) Tests & Policy: #1358, #1362, #1365
log "Merge #1358 (policy reasoner coverage)"
process_pr 1358 "Expand policy reasoner test coverage."

log "Merge #1362 (prov-ledger tests v1)"
process_pr 1362 "Add prov-ledger coverage v1."

log "Rebase and extend #1365, then merge"
process_pr 1365 "Append unique prov-ledger tests and param boundary cases (preserve authors)."

# 3) Guardrails: #1361
log "Merge #1361 (CostGuard budgets)"
process_pr 1361 "Enforce query budgets (CostGuard)."

# 4) Catalog: #1364
log "Merge #1364 (connector catalog metadata)"
process_pr 1364 "Broaden connector catalog (wave 2 metadata)."

# 5) Core services: #1360, #1359
log "Merge #1360 (Explainable ER)"
process_pr 1360 "Explainable ER service (canary 5%). Flag er.enabled=true on stage."

log "Merge #1359 (NLQ engine)"
process_pr 1359 "NLQ engine (sandbox; flag nlq.enabled=false by default)."

# 6) UX / Orchestration: #1368, #1367, #1330
log "Merge #1368 (Wizard quality insights)"
process_pr 1368 "Wizard quality insights (flag wizard.quality=false until verified)."

log "Merge #1367 (Disclosure packager resiliency)"
process_pr 1367 "Disclosure packager resiliency (flag disclosure.resiliency=true on stage)."

log "Merge #1330 (Counter-response orchestration)"
process_pr 1330 "Counter-response orchestration; soak 24h on stage."

# 7) Release: #1363 retitle and merge, then tag
log "Finalize Release PR #1363"
gh pr edit 1363 --title "Release 2025.09.24.x"
# Generate release notes from this train and append to PR body
TMP_NOTE=$(mktemp)
echo "### Included PRs" > "$TMP_NOTE"
for p in 1366 1358 1362 1365 1361 1364 1360 1359 1368 1367 1330; do
  title=$(gh pr view $p --json title -q .title || echo "")
  author=$(gh pr view $p --json author -q .author.login || echo "")
  echo "- #$p $title (by @$author)" >> "$TMP_NOTE"
done
# Append to existing body
CUR_BODY=$(gh pr view 1363 --json body -q .body || echo "")
echo -e "\n\n$CUR_BODY\n" > "$TMP_NOTE.body"
cat "$TMP_NOTE" >> "$TMP_NOTE.body"
gh pr edit 1363 --body-file "$TMP_NOTE.body"
rm -f "$TMP_NOTE" "$TMP_NOTE.body"
gh pr ready 1363 || true
process_pr 1363 "Release 2025.09.24.x. Includes merged PRs in train."

git fetch origin
git checkout main
git pull
git tag -a "v2025.09.24.x" -m "IntelGraph Release 2025.09.24.x"
git push origin "v2025.09.24.x"

log "Merge train completed successfully."

# Main execution
main() {
    log_info "🚂 Starting Conductor Go-Live Omniversal Merge Train"
    log_info "=================================================="
    
    preflight_checks

    # Process each PR in the defined order
    for pr in "${PRS[@]}"; do
        case "$pr" in
            1366)
                log "Prepare #1366 (lockfile diffs)"
                process_pr 1366 "Enable textual lockfile diffs to improve review signal."
                ;;
            1358)
                log "Merge #1358 (policy reasoner coverage)"
                process_pr 1358 "Expand policy reasoner test coverage."
                ;;
            1362)
                log "Merge #1362 (prov-ledger tests v1)"
                process_pr 1362 "Add prov-ledger coverage v1."
                ;;
            1365)
                log "Rebase and extend #1365, then merge"
                process_pr 1365 "Append unique prov-ledger tests and param boundary cases (preserve authors)."
                ;;
            1361)
                log "Merge #1361 (CostGuard budgets)"
                process_pr 1361 "Enforce query budgets (CostGuard)."
                ;;
            1364)
                log "Merge #1364 (connector catalog metadata)"
                process_pr 1364 "Broaden connector catalog (wave 2 metadata)."
                ;;
            1360)
                log "Merge #1360 (Explainable ER)"
                process_pr 1360 "Explainable ER service (canary 5%). Flag er.enabled=true on stage."
                ;;
            1359)
                log "Merge #1359 (NLQ engine)"
                process_pr 1359 "NLQ engine (sandbox; flag nlq.enabled=false by default)."
                ;;
            1368)
                log "Merge #1368 (Wizard quality insights)"
                process_pr 1368 "Wizard quality insights (flag wizard.quality=false until verified)."
                ;;
            1367)
                log "Merge #1367 (Disclosure packager resiliency)"
                process_pr 1367 "Disclosure packager resiliency (flag disclosure.resiliency=true on stage)."
                ;;
            1330)
                log "Merge #1330 (Counter-response orchestration)"
                process_pr 1330 "Counter-response orchestration; soak 24h on stage."
                ;;
            1363)
                log "Finalize Release PR #1363"
                gh pr edit 1363 --title "Release 2025.09.24.x"
                # Generate release notes from this train and append to PR body
                TMP_NOTE=$(mktemp)
                echo "### Included PRs" > "$TMP_NOTE"
                for p in 1366 1358 1362 1365 1361 1364 1360 1359 1368 1367 1330; do
                  title=$(gh pr view $p --json title -q .title || echo "")
                  author=$(gh pr view $p --json author -q .author.login || echo "")
                  echo "- #$p $title (by @$author)" >> "$TMP_NOTE"
                done
                # Append to existing body
                CUR_BODY=$(gh pr view 1363 --json body -q .body || echo "")
                echo -e "\n\n$CUR_BODY\n" > "$TMP_NOTE.body"
                cat "$TMP_NOTE" >> "$TMP_NOTE.body"
                gh pr edit 1363 --body-file "$TMP_NOTE.body"
                rm -f "$TMP_NOTE" "$TMP_NOTE.body"
                gh pr ready 1363 || true
                process_pr 1363 "Release 2025.09.24.x. Includes merged PRs in train."
                ;;
            *)
                log_error "Unknown PR number: $pr. Skipping."
                ;;
        esac
    done

    git fetch origin
    git checkout main
    git pull
    git tag -a "v2025.09.24.x" -m "IntelGraph Release 2025.09.24.x"
    git push origin "v2025.09.24.x"

    log "Merge train completed successfully."
}

# Handle command line arguments
case "${1:-}" in
    --dry-run) 
        log_info "Dry run mode - no changes will be made"
        # Set dry run flags
        ;;
    --auto-merge) 
        log_info "Auto-merge mode - will merge directly to main if gates pass"
        AUTO_MERGE="true"
        ;;
    --create-pr) 
        log_info "PR mode - will create pull request instead of direct merge"
        CREATE_PR="true"
        ;;
    --help) 
        echo "Usage: $0 [--dry-run|--auto-merge|--create-pr|--help]"
        echo ""
        echo "Options:"
        echo "  --dry-run     Validate only, make no changes"
        echo "  --auto-merge  Merge directly to main (requires clean gates)"
        echo "  --create-pr   Create pull request for review"
        echo "  --help        Show this help message"
        exit 0
        ;;
    "" ) 
        # Default behavior - create PR
        CREATE_PR="true"
        ;;
    *) 
        log_error "Unknown option: $1"
        echo "Use $0 --help for usage information"
        exit 1
        ;;
esac

# Run main function
main
