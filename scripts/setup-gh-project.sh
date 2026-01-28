#!/bin/bash
set -e

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "Error: gh (GitHub CLI) is not installed."
    exit 1
fi

PROJECT_NAME="XAI Anomaly Rollout"
ORG_NAME="intelgraph" # Replace with actual org if needed

echo "Creating GitHub Project: $PROJECT_NAME"

# Create project (requires GitHub CLI auth and organization scope)
# Note: This is a simulation/script to be run by an authorized user.
# The 'gh project create' command syntax changes occasionally, assuming v2 projects.

# Create project and capture ID
PROJECT_ID=$(gh project create --owner "$ORG_NAME" --title "$PROJECT_NAME" --format json --jq '.id')

if [ -z "$PROJECT_ID" ]; then
    echo "Failed to create project. Ensure you are authenticated and org is correct."
    exit 1
fi

echo "Project created with ID: $PROJECT_ID"

# Seed items
ITEMS=(
    "Implement XAI Anomaly Service"
    "Create Helm Charts"
    "Define Alerts"
    "Frontend Integration"
)

for item in "${ITEMS[@]}"; do
    echo "Adding item: $item"
    gh project item-create "$PROJECT_ID" --owner "$ORG_NAME" --title "$item" --format json
done

echo "Project seeded successfully!"
