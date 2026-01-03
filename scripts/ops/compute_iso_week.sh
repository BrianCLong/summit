#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: compute_iso_week.sh [YYYY-MM-DD]

Computes an ISO week label (YYYY-Www) using the provided UTC date. If no date is
supplied, the current UTC date is used.
USAGE
}

if [[ ${1-""} == "-h" || ${1-""} == "--help" ]]; then
  usage
  exit 0
fi

INPUT_DATE=${1-"now"}

if ! WEEK_LABEL=$(date -u -d "$INPUT_DATE" +%G-W%V 2>/dev/null); then
  echo "Invalid date: $INPUT_DATE" >&2
  exit 1
fi

echo "$WEEK_LABEL"
