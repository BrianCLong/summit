#!/usr/bin/env bash
set -euo pipefail

# Merge Train Runner
# Purpose: Safely drains the PR backlog by updating, verifying, and merging PRs labeled 'automerge-safe'.
# Usage: ./scripts/merge-train.sh

LABEL="automerge-safe"
WAIT_INTERVAL=30
MAX_RETRIES=60 # 30 minutes timeout per PR

log() {
  echo "[$(date +'%H:%M:%S')] $*"
}

check_deps() {
  if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed."
    exit 1
  fi
  if ! gh auth status &> /dev/null; then
    echo "Error: GitHub CLI is not authenticated."
    exit 1
  fi
}

get_candidate() {
  # Get the oldest PR with the label, that is not stale and has no conflicts
  # Use gh pr list --jq to filter by labels more robustly
  gh pr list --label "$LABEL" --state open --json number,updatedAt,labels --jq '
    [.[] | select(
      .labels | map(.name) | (
        . | index("stale") | not and (. | index("has-conflicts") | not)
      )
    ) | .number, .updatedAt] | @tsv' | \
  sort -k2 | head -n1 | awk '{print $1}'
}

process_pr() {
  local pr_number=$1
  log "🚂 Processing PR #$pr_number..."

  # 1. Update Branch
  log "Updates PR #$pr_number from main..."
  if ! gh pr update-branch "$pr_number"; then
    log "❌ Failed to update PR #$pr_number. Removing label."
    gh pr edit "$pr_number" --remove-label "$LABEL"
    gh pr comment "$pr_number" --body "Merge Train: Failed to update branch. Please resolve conflicts manually."
    return 1
  fi

  # 2. Wait for Checks
  log "Waiting for CI checks..."
  local retries=0
  while [ $retries -lt $MAX_RETRIES ]; do
    local status
    status=$(gh pr checks "$pr_number" --json state --jq '.[].state' | sort | uniq)
    
    if [[ -z "$status" ]]; then
       # No checks?
       log "⚠️ No checks found. Proceeding with caution (or verify manually)."
       break
    fi

    if echo "$status" | grep -q "FAILURE"; then
      log "❌ CI Failed for PR #$pr_number."
      gh pr edit "$pr_number" --remove-label "$LABEL"
      gh pr comment "$pr_number" --body "Merge Train: CI checks failed. Please fix and re-apply label."
      return 1
    fi

    if [[ "$status" == "SUCCESS" ]]; then
      log "✅ CI Passed."
      break
    fi

    # Pending...
    echo -n "."
    sleep $WAIT_INTERVAL
    retries=$((retries + 1))
  done

  if [ $retries -eq $MAX_RETRIES ]; then
    log "⏰ Timeout waiting for checks on PR #$pr_number."
    return 1
  fi

  # 3. Merge
  log "Merging PR #$pr_number..."
  if gh pr merge "$pr_number" --auto --squash --delete-branch; then
    log "🎉 Successfully merged PR #$pr_number"
  else
    log "❌ Failed to merge PR #$pr_number"
    gh pr edit "$pr_number" --remove-label "$LABEL"
    return 1
  fi
}

main() {
  check_deps
  
  while true; do
    candidate=$(get_candidate)
    
    if [[ -z "$candidate" ]]; then
      log "No PRs found with label '$LABEL'. Sleeping..."
      exit 0
    fi

    process_pr "$candidate" || log "Skipping PR #$candidate due to failure."
    
    sleep 5
  done
}

main