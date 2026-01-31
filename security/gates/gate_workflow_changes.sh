#!/usr/bin/env bash
set -euo pipefail

# GATE-WF-CHANGES: Deny-by-default
# Any workflow change must include a "SECURITY_ACK" line in commit message or PR description.

# Check if killswitch is active
if [[ "${SEC_GATE_WF_CHANGES_DISABLED:-false}" == "true" ]]; then
  echo "skip: workflow change gate (killswitch active)"
  exit 0
fi

# Determine base branch or use origin/main as default
BASE_BRANCH="${GITHUB_BASE_REF:-origin/main}"

# Get list of changed files
CHANGED="$(git diff --name-only "$BASE_BRANCH"...HEAD || true)"

if echo "$CHANGED" | grep -qE '^\.github/workflows/'; then
  # Check last commit message for SECURITY_ACK
  if ! git log -1 --pretty=%B | grep -q 'SECURITY_ACK'; then
    echo "FAILED: Workflow change detected but 'SECURITY_ACK' missing in commit message." >&2
    echo "Please add 'SECURITY_ACK' to your commit message to acknowledge workflow modifications." >&2
    exit 1
  fi
fi

echo "ok: workflow change gate"
