#!/usr/bin/env bash
set -euo pipefail

required_min_version="${1:-}"
if [[ -z "$required_min_version" ]]; then
  echo "usage: $0 <min-version>" >&2
  exit 2
fi

normalize_version() {
  local version="$1"
  version="${version#v}"
  echo "$version"
}

version_to_array() {
  local version
  version="$(normalize_version "$1")"
  IFS='.' read -r -a parts <<< "$version"
  printf '%s\n' "${parts[@]}"
}

version_lt() {
  local left right
  mapfile -t left < <(version_to_array "$1")
  mapfile -t right < <(version_to_array "$2")

  local max_len=$(( ${#left[@]} > ${#right[@]} ? ${#left[@]} : ${#right[@]} ))
  for ((i=0; i<max_len; i++)); do
    local l=${left[i]:-0}
    local r=${right[i]:-0}
    if (( l < r )); then
      return 0
    fi
    if (( l > r )); then
      return 1
    fi
  done
  return 1
}

if version_lt "$required_min_version" "3.0.4"; then
  echo "cosign version must be >= 3.0.4 due to CVE-2026-22703" >&2
  exit 1
fi
