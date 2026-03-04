#!/usr/bin/env bash
# .github/scripts/merge-train-autopilot.sh
#
# Merge-train autopilot: drains the open-PR backlog by batching ready PRs
# into the GitHub merge queue in controlled waves.
#
# Usage:
#   ./merge-train-autopilot.sh [--batch-size N] [--dry-run] [--max-queue N]
#
# Options:
#   --batch-size N   Number of PRs to enqueue per run  (default: 10)
#   --max-queue  N   Halt if merge queue already >= N  (default: 40)
#   --dry-run        Print actions without executing
#
# Environment:
#   GH_TOKEN         GitHub token with repo + merge-queue scopes (required)

set -euo pipefail

# ── defaults ────────────────────────────────────────────────────────────────
BATCH_SIZE=10
MAX_QUEUE=40
DRY_RUN=false

# ── arg parsing ─────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --batch-size) BATCH_SIZE="$2"; shift 2 ;;
    --max-queue)  MAX_QUEUE="$2";  shift 2 ;;
    --dry-run)    DRY_RUN=true;    shift   ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

log()  { echo "[autopilot] $*"; }
warn() { echo "[autopilot] WARN: $*" >&2; }

# ── guard: check current merge-queue depth ──────────────────────────────────
QUEUE_SIZE=$(gh pr list \
  --search "is:pr is:open is:in-merge-queue" \
  --json number \
  --jq 'length')

log "Current merge-queue depth: $QUEUE_SIZE / $MAX_QUEUE"

if [[ "$QUEUE_SIZE" -ge "$MAX_QUEUE" ]]; then
  warn "Merge queue at capacity ($QUEUE_SIZE/$MAX_QUEUE). Skipping batch — will retry next cycle."
  exit 0
fi

# How many slots remain?
SLOTS=$(( MAX_QUEUE - QUEUE_SIZE ))
ENQUEUE_COUNT=$(( SLOTS < BATCH_SIZE ? SLOTS : BATCH_SIZE ))
log "Available slots: $SLOTS — will enqueue up to $ENQUEUE_COUNT PRs."

# ── fetch candidate PRs ──────────────────────────────────────────────────────
# Criteria: open, non-draft, all checks passing, not already in merge queue,
# base branch is main, sorted oldest-first to drain the backlog fairly.
CANDIDATES=$(gh pr list \
  --search "is:pr is:open draft:false status:success base:main -is:in-merge-queue" \
  --json number,title,headRefName,createdAt \
  --jq 'sort_by(.createdAt) | .[]' \
  --limit "$ENQUEUE_COUNT")

if [[ -z "$CANDIDATES" ]]; then
  log "No ready candidates found. Nothing to enqueue."
  exit 0
fi

# ── enqueue each candidate ───────────────────────────────────────────────────
ENQUEUED=0
FAILED=0

while IFS= read -r pr_json; do
  PR_NUM=$(echo "$pr_json" | jq -r '.number')
  PR_TITLE=$(echo "$pr_json" | jq -r '.title')
  PR_BRANCH=$(echo "$pr_json" | jq -r '.headRefName')

  log "  Enqueueing PR #$PR_NUM [$PR_BRANCH]: $PR_TITLE"

  if [[ "$DRY_RUN" == "true" ]]; then
    log "  [DRY RUN] Would run: gh pr merge $PR_NUM --auto --squash"
    (( ENQUEUED++ )) || true
    continue
  fi

  if gh pr merge "$PR_NUM" --auto --squash 2>&1; then
    log "  Queued #$PR_NUM successfully."
    (( ENQUEUED++ )) || true
  else
    warn "  Failed to queue #$PR_NUM — skipping."
    (( FAILED++ )) || true
  fi

  # Brief pause between enqueue calls to avoid secondary rate limits
  sleep 2
done < <(echo "$CANDIDATES" | jq -c '.')

# ── summary ──────────────────────────────────────────────────────────────────
log "Done. Enqueued: $ENQUEUED | Failed/skipped: $FAILED"

if [[ "$FAILED" -gt 0 ]]; then
  exit 1
fi
