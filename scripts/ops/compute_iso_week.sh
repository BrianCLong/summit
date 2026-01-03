#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/ops/compute_iso_week.sh [--date YYYY-MM-DD] [--json]

Outputs the ISO year-week label (YYYY-WWW) and a UTC timestamp derived from the provided date
(defaults to now in UTC). All calculations are performed in UTC to remain deterministic.

Options:
  --date YYYY-MM-DD  Compute the label using the provided date instead of now (UTC).
  --json             Emit JSON instead of key=value lines.
  -h, --help         Show this help message.
USAGE
}

DATE_ARG=""
AS_JSON=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --date)
      DATE_ARG="$2"
      shift 2
      ;;
    --json)
      AS_JSON=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -n "$DATE_ARG" ]]; then
  if ! date -d "$DATE_ARG" +"%Y-%m-%d" >/dev/null 2>&1; then
    echo "Invalid date provided: $DATE_ARG" >&2
    exit 1
  fi
  WEEK_LABEL=$(date -u -d "$DATE_ARG" +"%G-W%V")
  TIMESTAMP=$(date -u -d "$DATE_ARG" +"%Y-%m-%dT%H:%M:%SZ")
else
  WEEK_LABEL=$(date -u +"%G-W%V")
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
fi

if $AS_JSON; then
  printf '{"week_label":"%s","generated_at_utc":"%s"}\n' "$WEEK_LABEL" "$TIMESTAMP"
else
  echo "week_label=${WEEK_LABEL}"
  echo "generated_at_utc=${TIMESTAMP}"
fi
