#!/bin/bash

# Usage: ./scripts/ci-test-budget.sh <limit_in_seconds> <command> [args...]

if [ $# -lt 2 ]; then
  echo "Usage: $0 <limit_in_seconds> <command>"
  exit 1
fi

LIMIT_SECONDS=$1
shift
COMMAND="$@"

echo "---------------------------------------------------"
echo "CI Time Budget Enforcer"
echo "Budget: ${LIMIT_SECONDS}s"
echo "Command: ${COMMAND}"
echo "---------------------------------------------------"

START_TIME=$(date +%s)

# Run the command
# We use eval to handle complex commands with arguments properly
eval "$COMMAND"
EXIT_CODE=$?

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "---------------------------------------------------"
echo "Execution finished."
echo "Duration: ${DURATION}s"
echo "Exit Code: ${EXIT_CODE}"
echo "---------------------------------------------------"

# Check if the command itself failed
if [ $EXIT_CODE -ne 0 ]; then
  echo "❌ Test suite failed (exit code ${EXIT_CODE})."
  exit $EXIT_CODE
fi

# Check if it exceeded the budget
if [ $DURATION -gt $LIMIT_SECONDS ]; then
  echo "❌ TIMEOUT: Test suite exceeded time budget! (${DURATION}s > ${LIMIT_SECONDS}s)"
  echo "Action Required: Optimize tests to reduce execution time."
  exit 1
else
  echo "✅ SUCCESS: Test suite completed within budget."
  exit 0
fi
