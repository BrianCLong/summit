#!/bin/sh
set -e
files=$(git diff --cached --name-only --diff-filter=ACM | grep -Ev '^(docs/|examples/|.*\.md$)')
[ -z "$files" ] && exit 0
fail=0
for file in $files; do
  if grep -n '\.\.\.' "$file" >/dev/null; then
    echo "ellipsis placeholder detected in $file" >&2
    fail=1
  fi
  if grep -nE '^[[:space:]]*(//|#)\s*\.\.\.' "$file" >/dev/null; then
    echo "comment placeholder detected in $file" >&2
    fail=1
  fi
  case "$file" in
    *src/*)
      if grep -nE 'TODO:|TBD:|Example:' "$file" >/dev/null; then
        echo "prohibited token detected in $file" >&2
        fail=1
      fi
      ;;
  esac
done
if [ $fail -ne 0 ]; then
  echo "Remove placeholders before committing." >&2
  exit 1
fi
