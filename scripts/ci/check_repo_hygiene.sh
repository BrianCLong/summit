#!/usr/bin/env bash
set -euo pipefail

status_output="$(git status --porcelain=v1)"
if [[ -n "${status_output}" ]]; then
  echo "Repository has uncommitted changes:" >&2
  echo "${status_output}" >&2
  exit 1
fi

untracked_output="$(git ls-files --others --exclude-standard)"
if [[ -n "${untracked_output}" ]]; then
  echo "Repository has untracked files:" >&2
  echo "${untracked_output}" >&2
  exit 1
fi

forbidden_list="config/forbidden-files.txt"
if [[ ! -f "${forbidden_list}" ]]; then
  echo "Missing forbidden files list at ${forbidden_list}" >&2
  exit 1
fi

while IFS= read -r pattern; do
  if [[ -z "${pattern}" || "${pattern}" =~ ^# ]]; then
    continue
  fi

  if rg --files -g "${pattern}" . | grep -q .; then
    echo "Forbidden file pattern matched: ${pattern}" >&2
    exit 1
  fi
done < "${forbidden_list}"

echo "Repository hygiene check passed."
