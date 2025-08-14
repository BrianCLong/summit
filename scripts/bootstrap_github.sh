#!/usr/bin/env bash
set -euo pipefail

# Usage: OWNER=yourorg REPO=intelgraph GH_ASSIGNEE=username ./scripts/bootstrap_github.sh
# Requires: GitHub CLI (gh) authenticated. Creates labels, milestones, and imports issues from CSV.

: "${OWNER:?Set OWNER}" "${REPO:?Set REPO}"
CSV_FILE="project_management/issues_enriched.csv"

gh repo view "$OWNER/$REPO" >/dev/null || { echo "Repo not accessible: $OWNER/$REPO"; exit 1; }

echo "Creating core labels…"
labels=(
  "P0::#d73a4a" "P1::#ff8c00" "P2::#fbca04"
  "documentation::#0075ca" "ci::#0e8a16" "security::#b60205" "graphrag::#5319e7" "ingest::#c5def5"
  "observability::#1d76db" "performance::#bfd4f2" "database::#0366d6" "neo4j::#6f42c1" "postgres::#0052cc"
  "ux::#a2eeef" "feature::#0e8a16" "ml::#5319e7" "audit::#e4e669" "ops::#d4c5f9" "release::#84b6eb" "testing::#0e8a16"
)
for l in "${labels[@]}"; do name="${l%%::*}"; color="${l##*::}"; gh label create "$name" --color "$color" --repo "$OWNER/$REPO" 2>/dev/null || true; done

echo "Creating milestones…"
# Adjust due dates as needed
gh api \
  -X POST \
  -H "Accept: application/vnd.github+json" \
  "/repos/$OWNER/$REPO/milestones" \
  -f title='v0.1.0' -f due_on='2025-09-20T00:00:00Z' 2>/dev/null || true
gh api \
  -X POST \
  -H "Accept: application/vnd.github+json" \
  "/repos/$OWNER/$REPO/milestones" \
  -f title='v0.2.0' -f due_on='2025-10-30T00:00:00Z' 2>/dev/null || true

echo "Importing issues from $CSV_FILE…"
gh issue import -f "$CSV_FILE" --repo "$OWNER/$REPO"

echo "Done."
