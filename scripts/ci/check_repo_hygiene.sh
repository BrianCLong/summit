#!/bin/bash
set -euo pipefail

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

untracked_files=()
while IFS= read -r -d '' entry; do
  status=${entry:0:2}
  path=${entry:3}
  if [[ "$status" == "??" ]]; then
    untracked_files+=("$path")
  fi
done < <(git status --porcelain=v1 -z)

if ((${#untracked_files[@]} > 0)); then
  echo "Repository hygiene check failed: untracked files detected:"
  printf '  - %s\n' "${untracked_files[@]}"
  exit 1
fi

patterns_file="config/forbidden-files.txt"
if [[ ! -f "$patterns_file" ]]; then
  echo "Repository hygiene check failed: missing ${patterns_file}."
  exit 1
fi

declare -A forbidden_paths=()

while IFS= read -r pattern || [[ -n "$pattern" ]]; do
  trimmed="${pattern#"${pattern%%[![:space:]]*}"}"
  trimmed="${trimmed%"${trimmed##*[![:space:]]}"}"
  if [[ -z "$trimmed" || "$trimmed" == \#* ]]; then
    continue
  fi

  while IFS= read -r path; do
    [[ -n "$path" ]] && forbidden_paths["$path"]=1
  done < <(git ls-files --cached -- ":(glob)$trimmed")

  while IFS= read -r path; do
    [[ -n "$path" ]] && forbidden_paths["$path"]=1
  done < <(git ls-files --others --exclude-standard -- ":(glob)$trimmed")
done < "$patterns_file"

if ((${#forbidden_paths[@]} > 0)); then
  echo "Repository hygiene check failed: forbidden files detected:"
  printf '%s\n' "${!forbidden_paths[@]}" | sort | sed 's/^/  - /'
  exit 1
fi

echo "Repository hygiene check passed."
