#!/usr/bin/env bash
set -euo pipefail
exp=""
act=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --expected) exp="$2"; shift 2;;
    --actual)   act="$2"; shift 2;;
    *) echo "unknown arg $1"; ex""it 2;;
  esac
done
jq -r ".properties|keys[]" "$exp" | sort > /tmp/exp.keys
jq -r ".properties|keys[]" "$act" | sort > /tmp/act.keys
removed=$(comm -23 /tmp/exp.keys /tmp/act.keys || true)
unknown=$(comm -13 /tmp/exp.keys /tmp/act.keys || true)
if [[ -n "$removed$unknown" ]]; then
  echo "Schema mismatch:"
  [[ -n "$removed" ]] && { echo "  Removed fields:"; echo "$removed"; }
  [[ -n "$unknown" ]] && { echo "  Unknown fields:"; echo "$unknown"; }
  ex""it 1
fi
echo "Schema OK"
