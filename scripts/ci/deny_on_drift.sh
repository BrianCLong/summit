#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <diff_file>" >&2
  exit 2
fi

diff_file="$1"
if [[ ! -f "$diff_file" ]]; then
  echo "ERROR: diff file not found: $diff_file" >&2
  exit 1
fi

if [[ ! -s "$diff_file" ]]; then
  echo "OK: no drift detected"
  exit 0
fi

allowlist_regex="${ALLOWLIST_REGEX:-replicas|image_tag|image|resources|limits|requests}"

mapfile -t suspicious_lines < <(grep -E '^[+-]' "$diff_file" | grep -Ev '^(\+\+\+|---)' | grep -Ev "$allowlist_regex" || true)

if (( ${#suspicious_lines[@]} > 0 )); then
  echo "ERROR: drift exceeds allowlist (regex: $allowlist_regex)" >&2
  printf '%s\n' "${suspicious_lines[@]}" >&2
  exit 1
fi

echo "OK: drift limited to allowlist"
