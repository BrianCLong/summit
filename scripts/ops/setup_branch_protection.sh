#!/bin/bash
set -e

# Adjust org/repo
REPO="BrianCLong/summit"
# Required checks must exist from PR 2
gh api \
  -X PUT \
  repos/$REPO/branches/main/protection \
  -f required_status_checks.strict=true \
  -f enforce_admins=true \
  -f required_pull_request_reviews.required_approving_review_count=2 \
  -f required_pull_request_reviews.require_code_owner_reviews=true \
  -f restrictions=null \
  -F required_status_checks.contexts[]='unit' \
  -F required_status_checks.contexts[]='contract' \
  -F required_status_checks.contexts[]='e2e' \
  -F required_status_checks.contexts[]='sast_sca' \
  -F required_status_checks.contexts[]='sbom' \
  -F required_status_checks.contexts[]='iac_plan' \
  -F required_status_checks.contexts[]='policy_opa' \
  -F required_status_checks.contexts[]='migrations_gate' \
  -F required_status_checks.contexts[]='preview_deploy' \
  -F required_status_checks.contexts[]='attestation'
