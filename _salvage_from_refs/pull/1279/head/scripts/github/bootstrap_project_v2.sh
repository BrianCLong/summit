#!/usr/bin/env bash
set -euo pipefail

# Bootstrap a GitHub Projects v2 board with a Status field (Now/Next/Later)
# and optionally add existing repo issues to the project.
#
# Requirements: gh CLI authenticated with required scopes.
#
# Env vars:
#   REPO_SLUG=owner/repo (default: BrianCLong/intelgraph)
#   PROJECT_TITLE (default: IntelGraph Execution Board)
#   PROJECT_OWNER (org or user login; default: owner from REPO_SLUG)
#   ADD_ISSUES=true|false (default: false)
#
# Usage:
#   PROJECT_TITLE="IntelGraph 30/60/90" ./scripts/github/bootstrap_project_v2.sh

REPO_SLUG=${REPO_SLUG:-BrianCLong/intelgraph}
PROJECT_TITLE=${PROJECT_TITLE:-IntelGraph Execution Board}
PROJECT_OWNER=${PROJECT_OWNER:-${REPO_SLUG%%/*}}
ADD_ISSUES=${ADD_ISSUES:-false}

echo "Repo: $REPO_SLUG | Owner: $PROJECT_OWNER | Title: $PROJECT_TITLE"

# Create project
projectId=$(gh api graphql -f owner="$PROJECT_OWNER" -f title="$PROJECT_TITLE" -f query='
mutation($owner: String!, $title: String!) {
  createProjectV2(input: {ownerId: (repositoryOwner(login: $owner) { id }), title: $title}) {
    projectV2 { id title url }
  }
}
' 2>/dev/null | jq -r '.data.createProjectV2.projectV2.id' || true)

if [[ -z "$projectId" || "$projectId" == "null" ]]; then
  # Fallback: resolve owner ID then create
  ownerId=$(gh api graphql -f login="$PROJECT_OWNER" -f query='
query($login: String!) { repositoryOwner(login: $login) { id __typename } }
' | jq -r '.data.repositoryOwner.id')
  projectId=$(gh api graphql -f ownerId="$ownerId" -f title="$PROJECT_TITLE" -f query='
mutation($ownerId: ID!, $title: String!) {
  createProjectV2(input: {ownerId: $ownerId, title: $title}) { projectV2 { id title url } }
}
' | jq -r '.data.createProjectV2.projectV2.id')
fi

echo "Project created: $projectId"

# Create Status single-select field with options Now/Next/Later
statusFieldId=$(gh api graphql -f projectId="$projectId" -f query='
mutation($projectId: ID!) {
  createProjectV2Field(input: {projectId: $projectId, dataType: SINGLE_SELECT, name: "Status", singleSelectOptions: [
    {name: "Now", color: GREEN}, {name: "Next", color: YELLOW}, {name: "Later", color: BLUE}
  ]}) { projectV2Field { id name } }
}
' | jq -r '.data.createProjectV2Field.projectV2Field.id')

echo "Status field created: $statusFieldId"

if [[ "$ADD_ISSUES" == "true" ]]; then
  echo "Adding open repo issues to project..."
  # Fetch issues and add to project
  gh issue list --repo "$REPO_SLUG" --state open --json number | jq -r '.[].number' | while read -r num; do
    node - <<'NODE'
const { execSync } = require('child_process');
const repo = process.env.REPO_SLUG;
const projectId = process.env.PROJECT_ID;
const issueNumber = process.env.ISSUE_NUMBER;

const issueId = JSON.parse(execSync(`gh api graphql -F owner=${repo.split('/')[0]} -F name=${repo.split('/')[1]} -F number=${issueNumber} -f query='\
query($owner:String!, $name:String!, $number:Int!) {\
  repository(owner:$owner, name:$name) { issue(number:$number) { id } }\
}\
'`).toString()).data.repository.issue.id;

const res = JSON.parse(execSync(`gh api graphql -f projectId=${projectId} -f contentId=${issueId} -f query='\
mutation($projectId: ID!, $contentId: ID!) {\
  addProjectV2ItemById(input:{projectId:$projectId, contentId:$contentId}) { item { id } }\
}\
'`).toString());
console.log('Added issue', issueNumber, res.data.addProjectV2ItemById.item.id);
NODE
  done
fi

echo "Done. Visit the project in GitHub UI to adjust views."

