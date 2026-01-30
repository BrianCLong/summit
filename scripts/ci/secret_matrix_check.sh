#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <secrets_a.json> <secrets_b.json>" >&2
  exit 2
fi

file_a="$1"
file_b="$2"

if [[ ! -f "$file_a" ]]; then
  echo "ERROR: secrets file not found: $file_a" >&2
  exit 1
fi
if [[ ! -f "$file_b" ]]; then
  echo "ERROR: secrets file not found: $file_b" >&2
  exit 1
fi

keys_a=$(jq -r 'paths | map(tostring) | join(".")' "$file_a" | sort -u)
keys_b=$(jq -r 'paths | map(tostring) | join(".")' "$file_b" | sort -u)

missing_in_b=$(comm -23 <(printf '%s\n' "$keys_a") <(printf '%s\n' "$keys_b") || true)
missing_in_a=$(comm -13 <(printf '%s\n' "$keys_a") <(printf '%s\n' "$keys_b") || true)

if [[ -n "$missing_in_b" || -n "$missing_in_a" ]]; then
  echo "ERROR: secret key parity mismatch" >&2
  if [[ -n "$missing_in_b" ]]; then
    echo "Missing in $file_b:" >&2
    printf '%s\n' "$missing_in_b" >&2
  fi
  if [[ -n "$missing_in_a" ]]; then
    echo "Missing in $file_a:" >&2
    printf '%s\n' "$missing_in_a" >&2
  fi
  exit 1
fi

empty_values=$(jq -r 'paths as $p | select(getpath($p) == null or getpath($p) == "") | $p | map(tostring) | join(".")' "$file_a" "$file_b" | sort -u)
if [[ -n "$empty_values" ]]; then
  echo "ERROR: secret values must not be empty" >&2
  printf '%s\n' "$empty_values" >&2
  exit 1
fi

echo "OK: secret key parity verified"
