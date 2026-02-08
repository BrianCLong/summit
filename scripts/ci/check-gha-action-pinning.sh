#!/usr/bin/env bash
set -euo pipefail

BASE_SHA="${BASE_SHA:-}"
HEAD_SHA="${HEAD_SHA:-HEAD}"
ALLOWLIST_FILE="${ALLOWLIST_FILE:-.github/ci/action-pinning-allowlist.yml}"

if [[ -z "$BASE_SHA" ]]; then
  if git rev-parse HEAD~1 >/dev/null 2>&1; then
    BASE_SHA="$(git rev-parse HEAD~1)"
  else
    echo "No base SHA available; skipping workflow action pinning scan."
    exit 0
  fi
fi

mapfile -t files < <(git diff --name-only "${BASE_SHA}...${HEAD_SHA}" -- '.github/workflows/*.yml' '.github/workflows/*.yaml' || true)
if [[ ${#files[@]} -eq 0 ]]; then
  echo "No workflow changes detected; skipping workflow action pinning scan."
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

violations=()
for file in "${files[@]}"; do
  if [[ ! -f "$file" ]]; then
    continue
  fi
  if is_allowlisted "$file"; then
    continue
  fi
  line_no=0
  while IFS= read -r line; do
    line_no=$((line_no + 1))
    trim="${line#"${line%%[![:space:]]*}"}"
    if [[ "$trim" == uses:* && "$trim" == *"@"* && "$trim" != *"./"* && "$trim" != *".github/"* ]]; then
      ref="${trim#*@}"
      ref="${ref%% *}"
      if [[ ! "$ref" =~ ^[a-f0-9]{40}$ ]]; then
        violations+=("${file}:${line_no}:${trim}")
      fi
    fi
  done < "$file"
done

if ((${#violations[@]})); then
  echo "Unpinned GitHub Actions found in changed workflows:"
  printf '%s\n' "${violations[@]}"
  exit 1
fi

echo "✅ Workflow action pinning scan passed (all actions pinned)."
