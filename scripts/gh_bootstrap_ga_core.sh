#!/usr/bin/env bash
set -euo pipefail

# Requires: gh CLI authenticated; jq recommended.
# Usage: OWNER=BrianCLong REPO=intelgraph PROJECT="GA Core (Q4-2025)" bash scripts/gh_bootstrap_ga_core.sh

OWNER=${OWNER:-}
REPO=${REPO:-}
PROJECT=${PROJECT:-GA Core (Q4-2025)}

if [[ -z "$OWNER" || -z "$REPO" ]]; then
  # Attempt to infer from git remote
  origin=$(git config --get remote.origin.url || true)
  if [[ "$origin" =~ github.com[:/](.+)/([^/.]+)(\.git)?$ ]]; then
    OWNER=${BASH_REMATCH[1]}
    REPO=${BASH_REMATCH[2]}
  fi
fi

if [[ -z "$OWNER" || -z "$REPO" ]]; then
  echo "Please set OWNER and REPO env vars." >&2
  exit 1
fi

echo "Owner: $OWNER  Repo: $REPO  Project: $PROJECT"

# Create labels (idempotent)
labels=("track:A" "track:B" "track:C" "track:D" "track:E" "track:F" \
        "area:schema" "area:temporal" "area:er" "area:provenance" "area:connectors" \
        "area:copilot" "area:graphrag" "area:guardrails" "area:analytics" "area:patterns" \
        "area:ui" "area:xai" "area:policy" "area:license" "area:observability" "area:cost" "area:resilience")
for l in "${labels[@]}"; do gh label create "$l" -R "$OWNER/$REPO" --force >/dev/null; done

# Create project (Projects v2 at user/org level)
gh project create "$PROJECT" --owner "$OWNER" >/dev/null || true

# Get project number
PROJECT_NUMBER=$(gh project list --owner "$OWNER" --format json | jq -r ".[] | select(.title==\"$PROJECT\") | .number")
if [[ -z "$PROJECT_NUMBER" || "$PROJECT_NUMBER" == "null" ]]; then
  echo "Failed to get project number; ensure gh and jq are installed and authenticated." >&2
  exit 1
fi
echo "Project number: $PROJECT_NUMBER"

# Create issues from files
ISSUE_DIR="project_management/issues"
for file in $(ls "$ISSUE_DIR"/*.md); do
  title=$(head -n1 "$file" | sed 's/^# \?//')
  body=$(tail -n +2 "$file")
  # Extract labels from file
  file_labels=$(grep -E '^Labels?:' "$file" | sed 's/^Labels\?:\s*//; s/,/ /g' || true)
  args=()
  for lab in $file_labels; do args+=("--label" "$lab"); done
  number=$(gh issue create -R "$OWNER/$REPO" --title "$title" --body "$body" "${args[@]}" --json number --jq .number)
  echo "Created #$number: $title"
  # Add to project
  gh project item add --project "$PROJECT_NUMBER" --url "https://github.com/$OWNER/$REPO/issues/$number" >/dev/null
done

echo "Bootstrap complete."

