set -euo pipefail

# Check if dependency files changed in the current commit/PR range
# This is a simplified check assuming we are in a git repo
if git diff --name-only origin/main...HEAD | grep -E 'requirements|package-lock|poetry.lock'; then
  echo "Dependency files changed."
  if [ ! -f docs/supply_chain/dependency_delta.md ]; then
      echo "Error: docs/supply_chain/dependency_delta.md missing."
      exit 1
  fi
  echo "Dependency delta doc present."
else
  echo "No dependency changes detected."
fi
