#!/usr/bin/env bash
set -euo pipefail
CSV="project_management/october2025_sprint_tracker.csv"
OWNER="BrianCLong"
PROJ=8

declare -A HAVE
gh project item-list "$PROJ" --owner "$OWNER" --limit 500 --format json \
| jq -r '.items[]?.title // empty' \
| awk '{print tolower($0)}' | sed -E 's/[[:space:]]+/_/g' \
| while read -r k; do HAVE["$k"]=1; done

created=0
tail -n +2 "$CSV" | while IFS=, read -r tracker_id workstream start_date end_date md_path desc; do
  title="[${workstream}] ${desc}"
  key=$(printf "%s" "$title" | tr '[:upper:]' '[:lower:]' | sed -E 's/[[:space:]]+/_/g')
  if [ -n "$(gh issue list --state all --search '"$title"' --limit 1)" ]; then
    echo "↪︎ Exists: $title"
    continue
  fi
  if [[ -z "${HAVE[$key]:-}" ]]; then
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
    echo "➕ $title"
    created=$((created+1))
    sleep 0.8
  fi
done
echo "Done. Created: $created"