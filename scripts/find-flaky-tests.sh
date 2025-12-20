#!/bin/bash
# Script to identify flaky tests by running the test suite multiple times

set -e

RUNS=${1:-5}
OUTPUT_DIR="test-results"
mkdir -p "$OUTPUT_DIR"

echo "Running test suite $RUNS times to identify flaky tests..."
echo "Results will be saved in $OUTPUT_DIR/"
echo ""

# Clean up previous results
rm -f "$OUTPUT_DIR"/run-*.log "$OUTPUT_DIR"/summary.txt

failed_tests=()
passed_tests=()
flaky_tests=()

for i in $(seq 1 $RUNS); do
  echo "=========================================="
  echo "Test Run $i/$RUNS"
  echo "=========================================="

  # Run tests and capture output
  if pnpm run test:jest --silent 2>&1 | tee "$OUTPUT_DIR/run-$i.log"; then
    echo "Run $i: PASSED"
  else
    echo "Run $i: FAILED"
  fi

  echo ""
  sleep 2
done

echo ""
echo "=========================================="
echo "Analyzing Results..."
echo "=========================================="

# Extract failed test names from each run
for i in $(seq 1 $RUNS); do
  grep -E "FAIL|●" "$OUTPUT_DIR/run-$i.log" | grep -v "PASS" > "$OUTPUT_DIR/failures-$i.txt" 2>/dev/null || true
done

# Find tests that failed in some runs but not others
echo "Flaky tests (tests that passed sometimes and failed sometimes):" | tee "$OUTPUT_DIR/summary.txt"
echo "" | tee -a "$OUTPUT_DIR/summary.txt"

# This is a simple analysis - can be improved
for i in $(seq 1 $RUNS); do
  if [ -f "$OUTPUT_DIR/failures-$i.txt" ] && [ -s "$OUTPUT_DIR/failures-$i.txt" ]; then
    echo "Run $i had failures:" | tee -a "$OUTPUT_DIR/summary.txt"
    cat "$OUTPUT_DIR/failures-$i.txt" | tee -a "$OUTPUT_DIR/summary.txt"
    echo "" | tee -a "$OUTPUT_DIR/summary.txt"
  fi
done

echo ""
echo "Results saved to $OUTPUT_DIR/summary.txt"
echo "Individual run logs saved to $OUTPUT_DIR/run-*.log"
