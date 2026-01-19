#!/bin/bash
set -e

# Check for gh CLI
if ! command -v gh &> /dev/null; then
    echo "Error: 'gh' CLI is not installed."
    echo "Please install it from https://cli.github.com/"
    exit 1
fi

# Generate a priority queue of issues based on labels
# Priority order: P0 > P1 > GA > Normal

echo "Generating Priority Queue..."
echo "----------------------------------------"

# Function to fetch issues by label
fetch_issues() {
  local label=$1
  echo "Fetching $label issues..."
  # Fetch issues and format them. We use a custom template to format the output.
  # We suppress exit code on failure to allow script to proceed if one query fails (though set -e is on, so we use || true)
  gh issue list --label "$label" --state open --limit 50 --json number,title,author,updatedAt --template '{{range .}}{{printf "#%v\t%v\t(%v)\n" .number .title .author.login}}{{end}}' || echo "No issues found or error fetching issues."
}

echo "### Critical (P0)"
fetch_issues "prio:P0"

echo ""
echo "### High (P1)"
fetch_issues "prio:P1"

echo ""
echo "### GA Blockers"
fetch_issues "priority:ga"

echo ""
echo "### Post-GA Migration"
fetch_issues "post-ga:migration"
