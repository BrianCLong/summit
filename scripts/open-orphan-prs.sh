#!/usr/bin/env bash
# scripts/open-orphan-prs.sh
# Opens triage PRs for remote branches that are ahead of main and lack a PR.
set -euo pipefail

REPO="${REPO:-BrianCLong/intelgraph}"
DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"

gh repo set-default "$REPO" >/dev/null
git fetch origin

BRANCHES=()
while IFS= read -r line; do
  BRANCHES+=("$line")
done < <(git for-each-ref --format='%(refname:short)' refs/remotes/origin | grep -vE "origin/(${DEFAULT_BRANCH}|HEAD)" | sed 's#^origin/##')

for b in "${BRANCHES[@]}"; do
  ahead="$(git rev-list --left-right --count origin/${DEFAULT_BRANCH}...origin/${b} | awk '{print $1}')"
  if [[ "$ahead" -gt 0 ]]; then
    open="$(gh pr list --head "$b" --base "$DEFAULT_BRANCH" --state all --json number --jq 'length')"
    if [[ "$open" -eq 0 ]]; then
      echo "Opening PR for ${b} -> ${DEFAULT_BRANCH}"
      gh pr create --base "$DEFAULT_BRANCH" --head "$b" --title "[Auto] ${b} → ${DEFAULT_BRANCH}" \
        --body "Auto-opened for batch merge triage." --label needs-triage >/dev/null
    fi
  fi
done