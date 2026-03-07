#!/usr/bin/env bash
set -euo pipefail

echo "Running Neo4j Stress Tests (Mocked mode due to docker limits)..."
npx tsx --test tests/integration/neo4j_stress/neo4j_stress.test.ts

echo "Done."
