#!/bin/bash
# Creates the Roadmap project.

set -e

ORG="@me"
PROJECT_SEED_FILE="$(dirname "$0")/../projects/seed/roadmap.json"
PROJECT_NAME=$(jq -r '.name' "$PROJECT_SEED_FILE")

echo "Creating project '$PROJECT_NAME'..."
gh project create --owner "$ORG" --title "$PROJECT_NAME" --template "Roadmap"

echo "Roadmap project setup complete. (Note: Fields and views must be configured manually or via GraphQL)."
