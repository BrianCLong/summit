#!/bin/bash
# Creates the Product Launch project.

set -e

ORG="@me"
PROJECT_SEED_FILE="$(dirname "$0")/../projects/seed/product-launch.json"
PROJECT_NAME=$(jq -r '.name' "$PROJECT_SEED_FILE")

echo "Creating project '$PROJECT_NAME'..."
gh project create --owner "$ORG" --title "$PROJECT_NAME" --template "Product launch"

echo "Product Launch project setup complete. (Note: Fields and views must be configured manually or via GraphQL)."
