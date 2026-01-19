#!/bin/bash
set -e

# Check for gh CLI
if ! command -v gh &> /dev/null; then
    echo "Error: 'gh' CLI is not installed."
    exit 1
fi

LABELS=(
  "needs-repro|F9D0C4|Needs reproduction steps"
  "debt-retired|0E8A16|Technical debt retired"
  "guardrail-added|1D76DB|New guardrail implemented"
  "blocked:admin-required|D93F0B|Requires repo admin intervention"
  "codex-ready|0052CC|Ready for Codex ingestion"
)

echo "Setting up labels..."

for label_info in "${LABELS[@]}"; do
  IFS='|' read -r name color desc <<< "$label_info"

  echo "Ensuring label '$name' exists..."

  # Check if label exists
  if gh label list --limit 500 | grep -q "^$name\b"; then
    echo "Label '$name' already exists."
  else
    echo "Creating label '$name'..."
    gh label create "$name" --color "$color" --description "$desc"
  fi
done

echo "Labels setup complete."
