#!/usr/bin/env bash
# verify_branch_protection_snapshot.sh
# Compares current branch protection against a local JSON snapshot.
#
# Usage:
#   ./scripts/release/verify_branch_protection_snapshot.sh --branch main
#
# Exit codes:
#   0 - No drift from snapshot
#   1 - Drift detected

set -euo pipefail

BRANCH="main"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo ".")"
SNAPSHOT_FILE="${REPO_ROOT}/docs/ci/snapshots/branch_protection.${BRANCH}.json"
TEMP_FILE=$(mktemp)

while [[ $# -gt 0 ]]; do
    case "$1" in
        --branch) BRANCH="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [[ ! -f "$SNAPSHOT_FILE" ]]; then
    echo "Snapshot file not found: $SNAPSHOT_FILE"
    exit 1
fi

echo "Fetching current branch protection for $BRANCH..."
# Normalize current settings: strip IDs, URLs, and volatile fields
# Note: We must be careful with the rate limit here too.
gh api "repos/:owner/:repo/branches/${BRANCH}/protection" | 
jq 'del(.url, .required_status_checks.url, .required_status_checks.contexts_url, .required_pull_request_reviews.url, .required_signatures.url, .enforce_admins.url, .required_status_checks.checks[].app_id, .required_status_checks.contexts_url)' | 
jq -S . > "$TEMP_FILE"

echo "Comparing against snapshot: $SNAPSHOT_FILE"
# Sort both files for stable comparison
jq -S . "$SNAPSHOT_FILE" > "${TEMP_FILE}.snapshot"

if diff -u "${TEMP_FILE}.snapshot" "$TEMP_FILE"; then
    echo "✅ No drift detected from snapshot."
    rm -f "$TEMP_FILE" "${TEMP_FILE}.snapshot"
    exit 0
else
    echo "❌ DRIFT DETECTED from snapshot!"
    echo "Mismatch between actual GitHub settings and docs/ci/snapshots/branch_protection.${BRANCH}.json"
    rm -f "$TEMP_FILE" "${TEMP_FILE}.snapshot"
    exit 1
fi
