#!/usr/bin/env bash
set -euo pipefail
fail=0
while IFS= read -r -d '' f; do
  # Ignore comments and allow local actions and docker references
  while IFS= read -r line; do
    # Skip commented lines
    [[ "$line" =~ ^\s*# ]] && continue
    # Extract uses target
    if [[ "$line" =~ uses:\s*([^[:space:]]+) ]]; then
      ref="${BASH_REMATCH[1]}"
      # allow local actions and docker images
      if [[ "$ref" =~ ^\./|^docker: ]]; then
        continue
      fi
      # Require @version or @sha; error if no @ present
      if [[ ! "$ref" =~ @ ]]; then
        echo "::error file=$f::Unpinned action reference detected. Use @<tag> or @<sha>. -> $ref"
        fail=1
      fi
    fi
  done < <(grep -nE '^\s*uses:' "$f" || true)
done < <(find .github/workflows -type f -name '*.yml' -print0)
exit $fail

