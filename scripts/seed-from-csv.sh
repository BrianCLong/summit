#!/usr/bin/env bash
set -euo pipefail
CSV="${1:?path to CSV (e.g., project_management/november2025_sprint_tracker.csv)}"
PROJ="${2:-8}"
OWNER="${3:-BrianCLong}"

while IFS=, read -r tracker_id workstream start_date end_date md_path desc; do
  [[ "$tracker_id" == "tracker_id" ]] && continue # skip header
  title="[${workstream}] ${desc}"
  # Skip if already exists
  if [ -n "$(gh issue list --state all --search '"$title"' --limit 1)" ]; then
    echo "↪︎ Exists: $title"
    continue
  fi
  body=$(cat <<EOF
**Tracker ID:** 
$tracker_id
**Workstream:** $workstream
**Start Date:** $start_date
**End Date:** $end_date
**Source:** $md_path
EOF
)
  url=$(gh issue create --title "$title" --body "$body")
  gh project item-add "$PROJ" --owner "$OWNER" --url "$url" >/dev/null 2>&1 || true
  echo "➕ ${title}"
  sleep 0.8
done < "$CSV"
