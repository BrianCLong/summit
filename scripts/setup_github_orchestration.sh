#!/usr/bin/env bash
set -euo pipefail

# --- Configuration ---
OWNER="BrianCLong" # Replace with your GitHub username or organization
REPO="summit"      # Replace with your repository name
BRANCH="orchestrator/polish-pack"
BASE_BRANCH="main"

PR_TITLE="orchestrator: polish pack (pre-commit, deps, OPA, tests, alerts, helm)"
PR_BODY="Integrates pre-commit hooks, dependency management configurations, OPA policy, unit tests, Prometheus alerts, and Helm chart additions for the orchestrator."

GRAFANA_SLO_URL="https://grafana.example.org/d/<SLO_DASH_ID>?var=service=intelgraph" # REPLACE WITH YOUR ACTUAL URL
GRAFANA_COST_URL="https://grafana.example.org/d/<COST_DASH_ID>?var=env=prod"       # REPLACE WITH YOUR ACTUAL URL
GRAFANA_POLICY_URL="https://grafana.example.org/d/<POLICY_DASH_ID>?var=service=maestro" # REPLACE WITH YOUR ACTUAL URL

REQUIRED_CONTEXTS='["Maestro Fast-Lane","Runbook Auto-Gen"]' # Exact job names from your CI

# --- 0. Pre-flight Checks ---
command -v gh >/dev/null || { echo "ERROR: GitHub CLI (gh) not found. Please install it: https://cli.github.com/" >&2; exit 1; }
gh auth status >/dev/null || { echo "ERROR: Not logged into GitHub CLI. Please run 'gh auth login'." >&2; exit 1; }

echo "--- Starting GitHub Orchestration Setup ---"

# --- 1. Create Pull Request ---
PR_URL=$(gh pr list --head "$BRANCH" --base "$BASE_BRANCH" --json url -q '.[] | .url')

if [ -z "$PR_URL" ]; then
  echo "1. Creating Pull Request from $BRANCH to $BASE_BRANCH..."
  PR_URL=$(gh pr create \
    --base "$BASE_BRANCH" \
    --head "$BRANCH" \
    --title "$PR_TITLE" \
    --body "$PR_BODY" \
    --repo "$OWNER/$REPO")

  if [ -z "$PR_URL" ]; then
    echo "ERROR: Failed to create PR. Exiting." >&2
    exit 1
  fi
  echo "   PR created: $PR_URL"
else
  echo "1. PR already exists: $PR_URL"
fi

# --- 2. Enable Auto-Merge (Squash) ---
echo "2. Enabling auto-merge (squash) for the PR..."
gh pr merge "$PR_URL" --auto --squash --repo "$OWNER/$REPO" || { echo "WARNING: Failed to enable auto-merge. Check repository settings." >&2; }
echo "   Auto-merge enabled (if supported by repo settings)."

# --- 3. Set GitHub Actions Variables ---
echo "3. Setting GitHub Actions Variables for Grafana URLs..."
gh variable set GRAFANA_SLO_URL --body "$GRAFANA_SLO_URL" --repo "$OWNER/$REPO"
gh variable set GRAFANA_COST_URL --body "$GRAFANA_COST_URL" --repo "$OWNER/$REPO"
gh variable set GRAFANA_POLICY_URL --body "$GRAFANA_POLICY_URL" --repo "$OWNER/$REPO"
echo "   Grafana URL variables set."

# --- 4. Make New Workflows Required Checks on Main Branch ---
echo "4. Configuring branch protection for '$BASE_BRANCH' branch..."
PAYLOAD=$(jq -n \
  --argjson required_status_checks '{"strict":true,"contexts":["CI — Green Baseline","Maestro Fast-Lane","Runbook Auto-Gen"]}' \
  --argjson required_pull_request_reviews '{"dismiss_stale_reviews":true,"required_approving_review_count":1}' \
  --arg enforce_admins "true" \
  --arg restrictions "null" \
  '{ "required_status_checks": $required_status_checks, "enforce_admins": ($enforce_admins | fromjson), "required_pull_request_reviews": $required_pull_request_reviews, "restrictions": ($restrictions | fromjson) }')

gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  "repos/$OWNER/$REPO/branches/$BASE_BRANCH/protection" \
  --input <(echo "$PAYLOAD") \
  --silent || { echo "WARNING: Failed to configure branch protection. Ensure you have admin rights." >&2; }
echo "   Branch protection configured for '$BASE_BRANCH'."

echo "--- GitHub Orchestration Setup Complete ---"
echo "Remember to replace placeholder Grafana URLs in the script with your actual URLs before running."
