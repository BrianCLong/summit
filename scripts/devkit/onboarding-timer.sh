#!/usr/bin/env bash
set -euo pipefail

REPORT_DIR=".evidence/reports"
mkdir -p "$REPORT_DIR"

start_file="$REPORT_DIR/devkit-onboarding-start.txt"
metrics_file="$REPORT_DIR/devkit-onboarding-timer.json"

if [[ "${1:-}" == "start" ]]; then
  date -u +"%Y-%m-%dT%H:%M:%SZ" > "$start_file"
  echo "Onboarding timer started at $(cat "$start_file")"
  exit 0
fi

if [[ ! -f "$start_file" ]]; then
  echo "No onboarding start timestamp found. Run $0 start first." >&2
  exit 1
fi

started=$(cat "$start_file")
finished=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
start_epoch=$(date -d "$started" +%s)
finish_epoch=$(date -d "$finished" +%s)
elapsed_minutes=$(( (finish_epoch - start_epoch) / 60 ))

cat <<JSON > "$metrics_file"
{
  "started_at": "$started",
  "finished_at": "$finished",
  "elapsed_minutes": $elapsed_minutes
}
JSON

echo "Onboarding completed in ${elapsed_minutes} minutes"
