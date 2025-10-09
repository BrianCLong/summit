#!/bin/bash
# GitHub label management script
# Creates standard labels for Summit repository

# Standard labels for Summit project
declare -A LABELS=(
  ["release:ga"]="0052CC"
  ["release:patch"]="5319E7"
  ["ops:incident"]="E11D21"
  ["ops:drill"]="FBBD50"
  ["security:baseline"]="E11D21"
  ["security:regression"]="E11D21"
  ["docs:runbook"]="FBCA04"
  ["priority:high"]="E11D21"
  ["priority:medium"]="FBBD50"
  ["priority:low"]="009800"
  ["type:feature"]="0052CC"
  ["type:bug"]="E11D21"
  ["type:enhancement"]="FBCA04"
  ["type:documentation"]="FBCA04"
  ["type:security"]="E11D21"
  ["status:blocked"]="E11D21"
  ["status:in-progress"]="FBCA04"
  ["status:review"]="5319E7"
  ["good first issue"]="C2E0C6"
  ["help wanted"]="FBCA04"
)

echo "Creating standard GitHub labels for Summit repository..."
echo "Note: This requires GitHub CLI (gh) to be installed and authenticated."

# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed."
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not in a git repository."
    exit 1
fi

# Create labels
for label in "${!LABELS[@]}"; do
    color="${LABELS[$label]}"
    echo "Creating/updating label: $label"
    
    # Try to create the label (will fail if it already exists)
    gh label create "$label" --color "$color" --description "Auto-generated label" 2>/dev/null || \
    # If creation fails, update the existing label
    gh label edit "$label" --color "$color" --description "Auto-generated label" 2>/dev/null || \
    echo "  Warning: Could not create/update label $label"
done

echo ""
echo "Label management complete!"
echo "Created/updated ${#LABELS[@]} labels:"
for label in "${!LABELS[@]}"; do
    echo "  - $label"
done