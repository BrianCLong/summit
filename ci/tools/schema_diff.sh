#!/usr/bin/env bash
set -euo pipefail

exp=""
act=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --expected)
      exp="$2"
      shift 2
      ;;
    --actual)
      act="$2"
      shift 2
      ;;
    *)
      echo "unknown arg $1" >&2
      exit 2
      ;;
  esac
done

if [[ -z "$exp" || -z "$act" ]]; then
  echo "usage: $0 --expected <schema.json> --actual <payload.json>" >&2
  exit 2
fi

if [[ ! -f "$exp" ]]; then
  echo "expected schema not found: $exp" >&2
  exit 2
fi

if [[ ! -f "$act" ]]; then
  echo "actual payload not found: $act" >&2
  exit 2
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

jq -r '.properties | keys[]' "$exp" | sort > "$tmp_dir/exp.keys"
jq -r 'keys[]' "$act" | sort > "$tmp_dir/act.keys"

removed="$(comm -23 "$tmp_dir/exp.keys" "$tmp_dir/act.keys" || true)"
unknown="$(comm -13 "$tmp_dir/exp.keys" "$tmp_dir/act.keys" || true)"

if [[ -n "$removed$unknown" ]]; then
  echo "Schema mismatch:"
  if [[ -n "$removed" ]]; then
    echo "  Removed fields:"
    echo "$removed"
  fi
  if [[ -n "$unknown" ]]; then
    echo "  Unknown fields:"
    echo "$unknown"
  fi
  exit 1
fi

echo "Schema OK"
