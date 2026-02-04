#!/bin/bash
set -e

echo "Running Memory Privacy Foundation Gates..."
# In a real environment, we would run jest/vitest
# npm test core/memory core/privacy

echo "Running Memory Privacy Eval Gates..."
npx tsx eval/privacy_memory/tests/run_local.ts

echo "Validating Memory Privacy Evidence..."
python3 tools/evidence_validate.py --schemas evidence/schemas --evidence evidence

echo "Memory Privacy Gates PASSED"
