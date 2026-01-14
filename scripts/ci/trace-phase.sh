#!/usr/bin/env bash
set -euo pipefail

phase="$1"
shift

mkdir -p artifacts

start=$(date +%s)
"$@"
elapsed=$(( $(date +%s) - start ))

printf '{"phase":"%s","seconds":%s}\n' "$phase" "$elapsed" | tee -a artifacts/ci-timings.json
