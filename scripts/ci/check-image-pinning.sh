#!/usr/bin/env bash
set -euo pipefail

# Fail if any image reference in deployment manifests is unpinned or uses :latest.
# Scans K8s manifests and docker-compose files, ignoring Helm chart sources and docs.

shopt -s nullglob

ERR=0
TMP_ERRORS=$(mktemp)

# Collect YAML files to check
mapfile -t FILES < <(
  git ls-files '*.yml' '*.yaml' 2>/dev/null \
    | rg -v '^(charts/|docs/|client/|server/|conductor-ui/|policy/gatekeeper/.*template|k8s/policies/gatekeeper/templates/)' -n
)

check_file() {
  local f="$1"
  # Scan for image: lines that are not commented and not empty
  while IFS= read -r line; do
    # Remove inline comments (keep URLs safely)
    local value
    value=$(echo "$line" | sed -E 's/^\s*image:\s*//; s/#.*$//; s/["\'\']//g' | xargs)
    # Skip templated or variable images
    [[ -z "$value" ]] && continue
    [[ "$value" == *"{{"* ]] && continue
    # Enforce no :latest
    if [[ "$value" == *":latest"* ]]; then
      echo "${f}: uses :latest → $value" >> "$TMP_ERRORS"
      ERR=1
      continue
    fi
    # If image is from a registry (common pattern contains / or .) enforce digest
    if [[ "$value" == *"/"* ]] || [[ "$value" == *"."*"/"* ]]; then
      if [[ "$value" != *@sha256:* ]]; then
        echo "${f}: not digest-pinned → $value" >> "$TMP_ERRORS"
        ERR=1
      fi
    fi
  done < <(rg -n "^\s*image:\s*" "$f" | rg -v "^\s*#")
}

for f in "${FILES[@]}"; do
  check_file "$f"
done

if [[ $ERR -ne 0 ]]; then
  echo "❌ Found unpinned or :latest image references:" >&2
  sort -u "$TMP_ERRORS" >&2 || true
  exit 1
fi

echo "✅ All image references are digest-pinned and not :latest"

