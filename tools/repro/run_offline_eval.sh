#!/bin/bash
set -e

OUTPUT_DIR="evidence/eval-repro"
rm -rf $OUTPUT_DIR
mkdir -p $OUTPUT_DIR

echo "Running Eval Trial 1..."
EVID1=$(npx tsx tools/repro/eval_runner.ts | grep "Artifacts written to:" | awk '{print $4}')

echo "Running Eval Trial 2..."
EVID2=$(npx tsx tools/repro/eval_runner.ts | grep "Artifacts written to:" | awk '{print $4}')

echo "Comparing metrics.json from trial outputs..."
# We need to find the directories since they have timestamps
DIR1=$(ls -d $OUTPUT_DIR/GRRAG-* | head -n 1)
DIR2=$(ls -d $OUTPUT_DIR/GRRAG-* | tail -n 1)

# Sort keys and compare bitwise (except timestamp in stamp.json)
jq -S . $DIR1/metrics.json > $OUTPUT_DIR/metrics1.json
jq -S . $DIR2/metrics.json > $OUTPUT_DIR/metrics2.json

diff $OUTPUT_DIR/metrics1.json $OUTPUT_DIR/metrics2.json || (echo "Determinism Failure: metrics.json differ" && exit 1)

echo "Determinism check passed (metrics.json are bitwise identical)."
