#!/usr/bin/env bash
set -euo pipefail

# Requires: gh CLI authenticated (gh auth login) with repo read access.
# Usage: .github/scripts/pin-actions.sh .github/workflows/release.yml

WF=${1:-.github/workflows/release.yml}

declare -A MAP=(
  [actions/checkout]=v4
  [actions/setup-node]=v4
  [dawidd6/action-download-artifact]=v2 # Corrected to standard action version
  [github/codeql-action/upload-sarif]=v3 # Corrected to standard action version
  [actions/github-script]=v7 # Corrected to standard action version
  [softprops/action-gh-release]=v1 # Corrected to standard action version
)

TMP=$(mktemp)
cp "$WF" "$TMP"

for repo in "${!MAP[@]}"; do
  ver="${MAP[$repo]}"
  echo "Resolving ${repo}@${ver}…" >&2
  # Get the ref's commit SHA (tag or branch)
  sha=$(gh api repos/${repo}/git/refs/tags/${ver} --jq .object.sha 2>/dev/null || true)
  if [[ -z "$sha" ]]; then
    sha=$(gh api repos/${repo}/releases/latest --jq .target_commitish 2>/dev/null || true)
  fi
  if [[ -z "$sha" ]]; then
    sha=$(gh api repos/${repo}/commits/${ver} --jq .sha 2>/dev/null || true)
  fi
  if [[ -z "$sha" ]]; then
    echo "Warning: could not resolve ${repo}@${ver}; leaving as-is" >&2
    continue
  fi
  short=${sha}
  echo "Pinning ${repo}@${ver} -> ${short}" >&2
  # Replace 'uses: repo @ver' with 'uses: repo @sha'
  sed -i.bak -E "s|(uses:\s*${repo}) @[^
]+|\1@${short}|g" "$TMP"
done

mv "$TMP" "$WF"
echo "Pinned SHAs written to ${WF}. Backup at ${WF}.bak"
