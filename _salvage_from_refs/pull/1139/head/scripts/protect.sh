#!/usr/bin/env bash
set -euo pipefail
REPO="$1" # org/repo
REQUIRED=("CI" "policy-check" "infra-plan")
for BR in main; do
  gh api -X PUT repos/$REPO/branches/$BR/protection \
    -F required_status_checks.strict=true \
    -F enforce_admins=true \
    -F required_linear_history=true \
    -F required_pull_request_reviews.dismiss_stale_reviews=true \
    -F required_pull_request_reviews.required_approving_review_count=1
  for C in "${REQUIRED[@]}"; do
    gh api -X POST repos/$REPO/branches/$BR/protection/required_status_checks/contexts -f context="$C" || true
  done
done
