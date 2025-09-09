#!/usr/bin/env bash
set -euo pipefail
npx typedoc --options typedoc.json
# add front-matter if missing
find docs/reference/sdk-js -name "*.md" -print0 | while IFS= read -r -d '' f; do
  if ! head -n1 "$f" | grep -q '^---$'; then
    sed -i '1i ---\nowner: api\nversion: latest\n---' "$f"
  fi
done
