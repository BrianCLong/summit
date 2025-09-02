#!/usr/bin/env bash
set -euo pipefail

BRANCH="feature/maestro-worldclass-epics"
echo "Creating branch: $BRANCH"
git checkout -b "$BRANCH"

# Ensure directories exist
mkdir -p deploy/router deploy/observability/grafana evals policies .github/ISSUE_TEMPLATE

# Copy files from this pack if available
PACK_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
copy_if() {
  local src="$1" dst="$2"
  if [ -f "$PACK_DIR/$src" ]; then
    mkdir -p "$(dirname "$dst")"
    cp "$PACK_DIR/$src" "$dst"
  fi
}

copy_if deploy/router/litellm.yaml deploy/router/litellm.yaml
copy_if deploy/observability/otel-collector.yaml deploy/observability/otel-collector.yaml
copy_if deploy/observability/grafana/router-overview.json deploy/observability/grafana/router-overview.json
copy_if evals/prompt_eval.yaml evals/prompt_eval.yaml
copy_if policies/routing.rego policies/routing.rego
copy_if policies/cost.rego policies/cost.rego
copy_if .github/ISSUE_TEMPLATE/feature.yml .github/ISSUE_TEMPLATE/feature.yml
copy_if .github/ISSUE_TEMPLATE/task.yml .github/ISSUE_TEMPLATE/task.yml
copy_if PULL_REQUEST_TEMPLATE.md .github/pull_request_template.md

git add deploy evals policies .github
git commit -m "scaffold: router, observability, evals, policies + issue templates"
echo "Branch prepared. Next: git push -u origin $BRANCH && gh pr create --fill"
