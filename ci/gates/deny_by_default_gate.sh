#!/bin/bash
echo "Running Deny-by-Default Gate..."
if [ -f "docs/policy/dual_use_policy.md" ]; then
  echo "SUCCESS: Policy document exists."
  exit 0
else
  echo "FAILURE: Policy document missing."
  exit 1
fi
