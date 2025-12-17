#!/usr/bin/env bash
set -e

# MERGE TRAIN ORCHESTRATOR
# Coordinates the state of the merge train and kicks off processing if stuck
# Updated for Merge-Train Stabilization Blueprint

echo "🚂 Checking Merge Train Status..."

QUEUE_LENGTH=$(gh pr list --label "merge-queue" --json number | jq 'length')
echo "Queue Length: $QUEUE_LENGTH"

if [ "$QUEUE_LENGTH" -eq 0 ]; then
  echo "✅ Merge train is empty and clear."
  exit 0
fi

# Check if main is green
MAIN_STATUS=$(gh run list --branch main --limit 1 --json conclusion --jq '.[0].conclusion')

if [ "$MAIN_STATUS" != "success" ]; then
  echo "⚠️ Main branch is not green (Status: $MAIN_STATUS). Halting merge train."
  # Optionally notify Slack/Teams
  exit 1
fi

echo "🚦 Main is green. Processing next item in queue..."

# Get oldest PR in queue
NEXT_PR=$(gh pr list --label "merge-queue" --json number --limit 1 --jq '.[0].number')

echo "Processing PR #$NEXT_PR"
# Trigger the merge-queue-kicker workflow or manually process
gh workflow run merge.queue.kicker.yml -f pr_number="$NEXT_PR"
