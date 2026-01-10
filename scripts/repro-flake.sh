#!/bin/bash
set -e

FILE="$1"
SEED="${TEST_SEED:-4371}"

if [ -z "$FILE" ]; then
  echo "Usage: $0 <test-file-path>"
  exit 1
fi

echo "Reproducing $FILE with TEST_SEED=$SEED"

# Ensure we are in root or adapt path if needed
# The user instruction assumes this runs from repo root

export TEST_SEED="$SEED"
export NODE_ENV=test
export ZERO_FOOTPRINT="1"
export NO_NETWORK_LISTEN="true"
export RUN_ACCEPTANCE="false"

# Using pnpm -C server test:unit as in the plan
pnpm -C server test:unit -- --runInBand --runTestsByPath "$FILE" --ci
