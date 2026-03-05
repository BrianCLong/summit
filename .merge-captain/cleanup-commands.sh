#!/bin/bash
# Generated cleanup commands - REVIEW BEFORE EXECUTING

set -euo pipefail

# Close already-merged branches
echo "Closing merged branch: fix-lfs-hygiene-1772348699"
gh pr close $(gh pr list --head "fix-lfs-hygiene-1772348699" --json number -q ".[0].number") \
  --comment "Closing: Changes already merged into main" \
  --delete-branch || true

