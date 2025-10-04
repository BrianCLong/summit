#!/bin/bash
# Destroys all projects created by the seed scripts.

set -e

ORG="@me"

PROJECT_NAMES=(
  "Kanban — Platform"
  "Team Planning — Q4 2025"
  "Feature Release — Cross-Platform Sync"
  "Bug Tracker — All Products"
  "Iterations — Core Platform"
  "Launch — Summit v2.0"
  "Roadmap — FY2025"
  "Retro — Sprint 1"
)

for name in "${PROJECT_NAMES[@]}"; do
  echo "Finding project '$name'..."
  PROJECT_ID=$(gh project list --owner "$ORG" --jq ".projects[] | select(.title == \"$name\") | .id" --limit 100)
  if [ -n "$PROJECT_ID" ]; then
    echo "Deleting project '$name' (ID: $PROJECT_ID)..."
    gh project delete "$PROJECT_ID" --owner "$ORG"
  else
    echo "Project '$name' not found."
  fi
done

echo "All projects destroyed."

