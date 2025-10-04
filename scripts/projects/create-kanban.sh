#!/bin/bash
# Creates the Kanban project from its seed file.

set -e

ORG="@me"
PROJECT_SEED_FILE="$(dirname "$0")/../projects/seed/kanban.json"

PROJECT_NAME=$(jq -r '.name' "$PROJECT_SEED_FILE")

echo "Checking for project '$PROJECT_NAME'..."
PROJECT_ID=$(gh project list --owner "$ORG" --jq ".projects[] | select(.title == \"$PROJECT_NAME\") | .id" --limit 100)

if [ -z "$PROJECT_ID" ]; then
  echo "Creating project '$PROJECT_NAME'..."
  PROJECT_ID=$(gh project create --owner "$ORG" --title "$PROJECT_NAME" --template "Kanban" --format json | jq -r '.id')
  echo "Project created with ID: $PROJECT_ID"
else
  echo "Project '$PROJECT_NAME' already exists with ID: $PROJECT_ID"
fi

# In a real script, you would parse the JSON and create fields and views.
# The gh CLI has limitations here, so this would likely require direct GraphQL API calls.

echo "Seeding sample data..."
for i in {1..30}; do
  gh project item-add --project-id "$PROJECT_ID" --owner "$ORG" --title "Sample Kanban Task $i" --body "This is a sample task for the Kanban board." --format json > /dev/null
done

echo "Kanban project setup complete."
