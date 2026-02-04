#!/usr/bin/env bash
set -euo pipefail

manifest="subsumption/branch-protection-as-code/manifest.yaml"
policy_path=".github/governance/branch_protection_rules.json"

node scripts/ci/verify_subsumption_bundle.mjs "$manifest"

if [[ -z "${BPAC_LIVE_SNAPSHOT:-}" ]]; then
  if ! command -v gh >/dev/null 2>&1; then
    echo "Missing BPAC_LIVE_SNAPSHOT and gh CLI is not available." >&2
    exit 1
  fi
  if [[ -z "${GITHUB_REPOSITORY:-}" ]]; then
    echo "Set GITHUB_REPOSITORY (owner/repo) or BPAC_LIVE_SNAPSHOT." >&2
    exit 1
  fi
  mkdir -p .tmp
  gh api "/repos/${GITHUB_REPOSITORY}/branches/main/protection" > .tmp/branch_protection_live.json
  export BPAC_LIVE_SNAPSHOT=.tmp/branch_protection_live.json
fi

BPAC_POLICY_PATH="$policy_path" node scripts/ci/verify_branch_protection.mjs
