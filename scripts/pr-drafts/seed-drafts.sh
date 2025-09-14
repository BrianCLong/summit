#!/usr/bin/env bash
set -euo pipefail
# Seed PR drafts from a list of titles. Adds numeric prefixes, H1, and shared link.

WAVE=${1:-}
shift || true
[[ -z "$WAVE" ]] && echo "Usage: $0 <wave> [--file titles.txt | titles…]" && exit 1
BASE_DIR="project_management/pr_drafts/${WAVE}"
mkdir -p "$BASE_DIR"

if [[ ${1:-} == "--file" ]]; then
  TITLES=()
  while IFS= read -r line; do
    if [[ -n "$line" ]]; then
      TITLES+=("$line")
    fi
  done < "$2"
  shift 2
else
  TITLES=("$@")
fi

max=0
shopt -s nullglob
for f in "$BASE_DIR"/PR-*.md; do
  n=$(basename "$f" | sed -n 's/^PR-\([0-9]\+\)-.*/\1/p')
  if [[ -n "$n" && $n -gt $max ]]; then
    max=$n
  fi
done

for t in "${TITLES[@]}"; do
  ((max+=1))
  slug=$(echo "$t" | tr 'A-Z' 'a-z' | sed -e 's/[^a-z0-9]\+/-/g' -e 's/-\$//g' -e 's/^-//g')
  file="$BASE_DIR/PR-$(printf '%02d' "$max")-${slug}.md"
  cat > "$file" <<EOF
# ${t}

> Paste this body into the PR. Update sections as needed.

## Rationale
- _why now_

## Scope
- _files/services_

## Changes
- _exact commands/diffs_

## Acceptance
- _checks and evidence_

---

(Shared sections) → see [SHARED-SECTIONS.md](./SHARED-SECTIONS.md)
EOF
  echo "✓ wrote $file"
done