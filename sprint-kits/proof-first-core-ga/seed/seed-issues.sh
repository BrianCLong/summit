#!/usr/bin/env bash
set -euo pipefail
CSV=${1:-tools/seed/issues.csv}
PROJECT_ID=${PROJECT_ID:-}
while IFS=, read -r title body labels assignees milestone; do
  [[ "$title" == "Title" ]] && continue
  gh issue create \
    --title "$title" \
    --body "$body" \
    --label "$labels" \
    ${assignees:+--assignee "$assignees"} \
    ${milestone:+--milestone "$milestone"}
  if [[ -n "$PROJECT_ID" ]]; then
    num=$(gh issue list --search "$title" --json number --jq '.[0].number')
    gh project item-add "$PROJECT_ID" --url "$(gh issue view "$num" --json url --jq .url)"
  fi
done < <(tail -n +2 "$CSV")
