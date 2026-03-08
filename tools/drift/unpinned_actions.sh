#!/usr/bin/env bash
set -euo pipefail
echo "[opa] scanning .github/workflows for unpinned actions…"
violations=0
while IFS= read -r -d '' f; do
  while IFS= read -r line; do
    # Match uses: owner/name@<tag|*|vX|main>; require full commit SHA
    if [[ "$line" =~ uses:\ ([^@]+)@([vV]?[0-9]+\.[0-9]+(\.[0-9]+)?|main|master|\*|[a-zA-Z]+) ]]; then
      echo "::warning file=$f,title=Unpinned Action::${BASH_REMATCH[0]} → pin to a commit SHA"
      ((violations++))
    fi
  done < <(yq '.jobs.*.steps[].uses // ""' "$f" 2>/dev/null | sed 's/^/- uses: /' )
done < <(git ls-files '.github/workflows/*.yml' -z)
if [[ $violations -gt 0 ]]; then
  bash -c 'exit 1'
else
  echo "no unpinned actions found"
fi
