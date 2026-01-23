#!/usr/bin/env bash
set -euo pipefail

paths=(
  "client/src/"
  "server/src/"
  "packages/"
  "scripts/"
)

ignored_regex='(\.(log|tmp)$|(^|/)node_modules/|(^|/)dist/|(^|/)build/|(^|/)coverage/|\.DS_Store$)'

declare -a offenders=()

while IFS= read -r -d '' entry; do
  status="${entry:0:2}"
  if [[ "${status}" != "??" ]]; then
    continue
  fi
  file="${entry:3}"
  if [[ -z "${file}" ]]; then
    continue
  fi
  if [[ "${file}" =~ ${ignored_regex} ]]; then
    continue
  fi
  if [[ "${file}" == .env* ]]; then
    if git check-ignore -q "${file}"; then
      continue
    fi
  fi
  for prefix in "${paths[@]}"; do
    if [[ "${file}" == "${prefix}"* ]]; then
      offenders+=("${file}")
      break
    fi
  done
done < <(git status --porcelain=v1 -z --untracked-files=normal)

if [[ ${#offenders[@]} -gt 0 ]]; then
  printf 'untracked build inputs detected:\n' >&2
  printf '%s\n' "${offenders[@]}" | LC_ALL=C sort | sed 's/^/- /' >&2
  exit 1
fi

echo 'no untracked build inputs detected.'
