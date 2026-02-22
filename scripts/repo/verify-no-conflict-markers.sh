#!/bin/bash
set -e
# Detect merge conflict markers in tracked files
# Excluding binary/lock files to reduce noise
if git grep -I -n -E "^<<<<<<< |^=======($| )|^>>>>>>> " -- . ':!*.md' ':!*.txt' ':!go.sum' ':!pnpm-lock.yaml'; then
  echo "ERROR: Merge conflict markers found."
  exit 1
fi
echo "OK: No conflict markers found."
