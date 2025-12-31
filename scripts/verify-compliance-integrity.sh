#!/bin/bash

# verify-compliance-integrity.sh
#
# This script is a CI guardrail to prevent unintentional changes to critical
# compliance, security, and GA-related files.
#
# It checks if any of the monitored files have been modified in the current
# pull request. If they have, it fails the build unless a specific label
# ("override-compliance-drift") is present on the PR.

set -eo pipefail

# An array of critical files to monitor for changes.
# IMPORTANT: Any changes to this list must be approved by the GRC team.
CRITICAL_FILES=(
  # GA-defining workflows
  ".github/workflows/pr-quality-gate.yml"
  ".github/workflows/release-ga.yml"
  ".github/workflows/ci-security.yml"

  # Core security and compliance documents
  "docs/compliance/CONTROL_FRAMEWORKS.md"
  "docs/security/SECURITY_ARCHITECTURE.md"
  "docs/ga/ATTESTATION.md"
  "SAFETY_INVARIANTS.md" # Future-proofing

  # This script itself
  "scripts/verify-compliance-integrity.sh"
)

# The label that allows overriding this check.
OVERRIDE_LABEL="override-compliance-drift"

# The script requires the PR's labels and the target branch (e.g., 'main')
# to be passed as arguments.
PR_LABELS="$1"
TARGET_BRANCH="$2"

if [[ -z "$PR_LABELS" || -z "$TARGET_BRANCH" ]]; then
  echo "Usage: $0 \"<pr-labels>\" <target-branch>"
  exit 1
fi

echo "PR Labels: $PR_LABELS"
echo "Target Branch: $TARGET_BRANCH"

# Check if the override label is present.
if [[ "$PR_LABELS" == *"$OVERRIDE_LABEL"* ]]; then
  echo "Override label '$OVERRIDE_LABEL' found. Skipping compliance integrity check."
  exit 0
fi

echo "No override label found. Checking for changes to critical files..."

# Fetch the target branch to ensure we can diff against it.
git fetch origin "$TARGET_BRANCH"

# Get the list of files changed in this PR compared to the target branch.
changed_files=$(git diff --name-only "origin/$TARGET_BRANCH" HEAD)

echo -e "\nFiles changed in this PR:\n$changed_files\n"

found_critical_change=false
for file in "${CRITICAL_FILES[@]}"; do
  # Use grep to check if a critical file is in the list of changed files.
  if echo "$changed_files" | grep -q "^$file$"; then
    echo "ERROR: Critical compliance file modified: $file"
    found_critical_change=true
  fi
done

if [ "$found_critical_change" = true ]; then
  echo -e "\nERROR: One or more critical compliance files were modified."
  echo "To proceed, you must add the label '$OVERRIDE_LABEL' to this pull request and have it approved by the GRC team."
  exit 1
else
  echo "No changes detected in critical compliance files. Check passed."
fi
