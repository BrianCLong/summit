#!/usr/bin/env bash
set -euo pipefail
BRANCH=${1:-main}
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
# Required checks – adjust to your chosen set
REQUIRED=(CI CodeQL SBOM Trivy license-check Lockfile Verify)
ARGS=()
for c in "${REQUIRED[@]}"; do ARGS+=( -f required_status_checks.contexts[]="$c" ); done

gh api -X PUT repos/$REPO/branches/$BRANCH/protection \
  -f required_linear_history=true \
  -f allow_force_pushes=false \
  -f enforce_admins=true \
  -f required_pull_request_reviews.required_approving_review_count=2 \
  -f required_status_checks.strict=true \
  "${ARGS[@]}" \
  -H "Accept: application/vnd.github+json"

echo "Enabled merge queue separately in Settings → Branches."
