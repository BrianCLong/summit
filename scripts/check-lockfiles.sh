#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FORBIDDEN_PATTERNS=(
  "package-lock.json"
  "npm-shrinkwrap.json"
  "yarn.lock"
)

# Allowlist of paths where legacy lockfiles are intentionally kept (none for now).
allowlist() {
  case "$1" in
    *) return 1 ;;
  esac
}

found=0
while IFS= read -r -d '' file; do
  if allowlist "$file"; then
    continue
  fi
  echo "Forbidden lockfile detected: $file"
  found=1
done < <(find . -type f \( $(printf -- '-name %q -o ' "${FORBIDDEN_PATTERNS[@]}" | sed 's/ -o $//') \) -print0)

if [[ "$found" -ne 0 ]]; then
  echo
  echo "Remove or rename the files above (or add to allowlist) to satisfy repository policy." >&2
  exit 1
fi

echo "No forbidden lockfiles detected."
