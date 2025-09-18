#!/usr/bin/env bash
set -euo pipefail
fail=0
while IFS= read -r -d '' f; do
  while IFS= read -r line; do
    # extract the ref part after '@'
    ref=$(sed -nE 's/.*uses:\s*[^@]+@([[:alnum:]._-]+).*/\1/p' <<<"$line")
    [[ -z "${ref:-}" ]] && continue
    # allow local actions and docker refs
    grep -q 'uses:\s*\./' <<<"$line" && continue
    grep -q 'uses:\s*docker://' <<<"$line" && continue
    # require full 40-char commit SHA
    if ! [[ "$ref" =~ ^[0-9a-f]{40}$ ]]; then
      echo "::error file=$f::Action must be pinned to a 40-char commit SHA -> $line"
      fail=1
    fi
  done < <(grep -nE '^\s*uses:' "$f" || true)
done < <(find .github/workflows -type f -name '*.yml' -print0)
exit $fail
