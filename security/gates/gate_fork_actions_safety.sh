#!/usr/bin/env bash
set -euo pipefail

# GATE-PR-FORK-EXEC: Fail if untrusted forks try to modify workflows

if [[ "${SEC_GATE_FORK_SAFETY_DISABLED:-false}" == "true" ]]; then
  echo "skip: fork safety gate (killswitch active)"
  exit 0
fi

# Detect if we are in a PR from a fork
# (In GitHub Actions, GITHUB_HEAD_REF and GITHUB_BASE_REF are set for PRs)
# If GITHUB_HEAD_REPO_FULL_NAME != GITHUB_REPOSITORY, it's a fork.
IS_FORK=false
if [[ "${GITHUB_EVENT_NAME:-}" == "pull_request" ]]; then
    if [[ "${GITHUB_HEAD_REPO_FULL_NAME:-}" != "${GITHUB_REPOSITORY:-}" ]]; then
        IS_FORK=true
    fi
fi

if [[ "$IS_FORK" == "true" ]]; then
    BASE_BRANCH="${GITHUB_BASE_REF:-origin/main}"
    CHANGED="$(git diff --name-only "$BASE_BRANCH"...HEAD || true)"

    if echo "$CHANGED" | grep -qE '^\.github/workflows/'; then
        echo "FAILED: Workflow changes detected in a Pull Request from a fork." >&2
        echo "Workflow modifications from forks are prohibited for security reasons." >&2
        exit 1
    fi
fi

echo "ok: fork safety gate"
