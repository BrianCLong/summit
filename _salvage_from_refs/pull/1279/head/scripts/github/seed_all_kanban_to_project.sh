#!/usr/bin/env bash
set -euo pipefail

# Seeds Now/Next/Later CSVs into a Projects v2 board and sets Status accordingly.
# Requires: gh CLI authenticated; python3; scripts/github/seed_issues_to_project_v2.py

REPO_SLUG=${REPO_SLUG:-BrianCLong/summit}
PROJECT_TITLE=${PROJECT_TITLE:-IntelGraph Execution Board}
PROJECT_OWNER=${PROJECT_OWNER:-${REPO_SLUG%%/*}}

echo "Repo=$REPO_SLUG Project=$PROJECT_TITLE Owner=$PROJECT_OWNER"

echo "Ensure project exists and has Status field (Now/Next/Later)."
echo "If not created yet, run: PROJECT_TITLE=\"$PROJECT_TITLE\" PROJECT_OWNER=$PROJECT_OWNER REPO_SLUG=$REPO_SLUG bash scripts/github/bootstrap_project_v2.sh"

root=$(git rev-parse --show-toplevel)

seed() {
  local csv=$1; local status=$2
  if [[ -f "$csv" ]]; then
    echo "Seeding $csv with Status=$status"
    REPO_SLUG="$REPO_SLUG" PROJECT_TITLE="$PROJECT_TITLE" python3 "$root/scripts/github/seed_issues_to_project_v2.py" "$csv" "$status"
  else
    echo "Skip: missing $csv"
  fi
}

seed project_management/issues-now.csv Now
seed project_management/issues-next.csv Next
seed project_management/issues-later.csv Later

echo "Done. Review the board in GitHub UI and adjust views."

