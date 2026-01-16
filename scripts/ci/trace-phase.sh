#!/usr/bin/env bash
set -euo pipefail

phase="$1"
shift

start_ts=$(date +%s)
"$@"
end_ts=$(date +%s)

mkdir -p artifacts
printf '{"phase":"%s","seconds":%s}\n' "$phase" "$((end_ts - start_ts))" | tee -a artifacts/ci-timings.json
