#!/bin/bash
set -e

phase="$1"
shift

mkdir -p artifacts

ts=$(date +%s)

# Run the command, allowing failure to be captured
set +e
"$@"
exit_code=$?
set -e

duration=$(( $(date +%s) - ts ))

# Use || true to prevent failure if writing fails
echo "{\"phase\":\"$phase\",\"seconds\":$duration}" | tee -a artifacts/ci-timings.json || true

exit $exit_code
