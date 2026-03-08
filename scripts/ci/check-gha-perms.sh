#!/usr/bin/env bash
set -euo pipefail

BASE_SHA="${BASE_SHA:-}"
HEAD_SHA="${HEAD_SHA:-HEAD}"
ALLOWLIST_FILE="${ALLOWLIST_FILE:-.github/ci/permissions-allowlist.yml}"

if [[ -z "$BASE_SHA" ]]; then
  if git rev-parse HEAD~1 >/dev/null 2>&1; then
    BASE_SHA="$(git rev-parse HEAD~1)"
  else
    echo "No base SHA available; skipping workflow permission scan."
    exit 0
  fi
fi

mapfile -t files < <(git diff --name-only "${BASE_SHA}...${HEAD_SHA}" -- '.github/workflows/*.yml' '.github/workflows/*.yaml' || true)
if [[ ${#files[@]} -eq 0 ]]; then
  echo "No workflow changes detected; skipping workflow permission scan."
  exit 0
fi

allowlist=()
if [[ -f "$ALLOWLIST_FILE" ]]; then
  mapfile -t allowlist < <(rg -v '^\s*(#|$)' "$ALLOWLIST_FILE" || true)
fi

is_allowlisted() {
  local candidate="$1"
  for pattern in "${allowlist[@]}"; do
    if [[ "$candidate" == $pattern ]]; then
      return 0
    fi
  done
  return 1
}

write_pattern='^\s*(permissions:\s*write(-all)?\b|contents:\s*write\b|issues:\s*write\b|pull-requests:\s*write\b|packages:\s*write\b|actions:\s*write\b|checks:\s*write\b|deployments:\s*write\b|id-token:\s*write\b|security-events:\s*write\b|statuses:\s*write\b)'

violations=()
for file in "${files[@]}"; do
  if [[ ! -f "$file" ]]; then
    continue
  fi
  if is_allowlisted "$file"; then
    continue
  fi
  matches="$(rg -n "$write_pattern" "$file" || true)"
  if [[ -n "$matches" ]]; then
    violations+=("${file}:\n${matches}")
  fi
done

if ((${#violations[@]})); then
  echo "Unexpected write permissions found in changed workflows:"
  printf '%b\n' "${violations[@]}"
  exit 1
fi

echo "✅ Workflow permission scan passed (no unexpected write scopes)."
