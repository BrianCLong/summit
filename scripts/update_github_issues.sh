#!/usr/bin/env bash
set -euo pipefail

# Usage: OWNER=yourorg REPO=intelgraph ./scripts/update_github_issues.sh project_management/issues_enriched.csv

CSV_FILE=${1:-project_management/issues_enriched.csv}
: "${OWNER:?Set OWNER}" "${REPO:?Set REPO}"

if ! command -v gh >/dev/null; then echo "gh CLI required"; exit 1; fi

tail -n +2 "$CSV_FILE" | while IFS=, read -r TITLE BODY LABELS ASSIGNEES STATE MILESTONE; do
  # Strip quotes
  TITLE=${TITLE%"}; TITLE=${TITLE#"}
  LABELS=${LABELS%"}; LABELS=${LABELS#"}
  ASSIGNEES=${ASSIGNEES%"}; ASSIGNEES=${ASSIGNEES#"}
  MILESTONE=${MILESTONE%"}; MILESTONE=${MILESTONE#"}

  number=$(gh issue list --search "$TITLE in:title" --state all --json number,title --jq '.[] | select(.title=="'$TITLE'") | .number' --repo "$OWNER/$REPO") || true
  if [[ -n "$number" ]]; then
    echo "Updating #$number — $TITLE"
    gh issue edit "$number" --add-label "$LABELS" --milestone "$MILESTONE" --add-assignee "$ASSIGNEES" --repo "$OWNER/$REPO" || true
    [[ "$STATE" == "closed" ]] && gh issue close "$number" --repo "$OWNER/$REPO" || true
  else
    echo "Creating — $TITLE"
    gh issue create --title "$TITLE" --body "$BODY" --label "$LABELS" --assignee "$ASSIGNEES" --milestone "$MILESTONE" --repo "$OWNER/$REPO"
  fi
done

echo "Issue sync complete."
