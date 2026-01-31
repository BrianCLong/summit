#!/usr/bin/env bash
set -euo pipefail

# Requires GitHub CLI (gh) authenticated with repo and project scope.
# Usage: PROJECT_JSON=project_management/github-projects-import.json ./scripts/import_projects_items.sh

: "${PROJECT_JSON:?Path to JSON with project_number, org, repo, items[]}"

PROJECT_NUMBER=$(jq -r .project_number "$PROJECT_JSON")
ORG=$(jq -r .org "$PROJECT_JSON")
REPO=$(jq -r .repo "$PROJECT_JSON")

# Fetch Project ID via GraphQL
PROJECT_ID=$(gh api graphql -f query='query($org:String!,$number:Int!){ organization(login:$org){ projectV2(number:$number){ id } } }' -f org="$ORG" -F number=$PROJECT_NUMBER --jq '.data.organization.projectV2.id')

ITEMS_LEN=$(jq '.items | length' "$PROJECT_JSON")
for i in $(seq 0 $((ITEMS_LEN-1))); do
  TITLE=$(jq -r ".items[$i].title" "$PROJECT_JSON")
  BODY=$(jq -r ".items[$i].body" "$PROJECT_JSON")
  LABELS=$(jq -c ".items[$i].labels" "$PROJECT_JSON")
  ASSIGNEES=$(jq -c ".items[$i].assignees" "$PROJECT_JSON")

  # Create issue
  ISSUE_JSON=$(gh api repos/$ORG/$REPO/issues -f title="$TITLE" -f body="$BODY" -f labels="$LABELS" -f assignees="$ASSIGNEES")
  ISSUE_NODE_ID=$(echo "$ISSUE_JSON" | jq -r .node_id)

  # Add to project
  gh api graphql -f query='mutation($project:ID!,$content:ID!){ addProjectV2ItemById(input:{projectId:$project, contentId:$content}){ item { id } } }' -f project="$PROJECT_ID" -f content="$ISSUE_NODE_ID" >/dev/null
  echo "Added: $TITLE"
done

echo "✅ Imported $ITEMS_LEN items into project $PROJECT_NUMBER"
