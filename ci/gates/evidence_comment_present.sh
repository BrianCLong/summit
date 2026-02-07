#!/usr/bin/env bash
set -euo pipefail

WORKFLOW=".github/workflows/pr_comment_evidence.yml"

if [[ ! -f "${WORKFLOW}" ]]; then
  echo "Missing ${WORKFLOW}" >&2
  exit 1
fi

if ! rg -q "evidence-badge" "${WORKFLOW}"; then
  echo "Evidence comment marker missing from ${WORKFLOW}" >&2
  exit 1
fi

echo "Evidence PR comment workflow is present."
