#!/usr/bin/env bash
set -euo pipefail

LOG_PATH="scripts/ci/canary-chaos.log"
SUMMARY_PATH="scripts/ci/canary-chaos-summary.json"

CHAOS_SEED=${CHAOS_SEED:-$(date +%s)}
GRAPH_GUARDRAIL_FUZZ_SEED=${GRAPH_GUARDRAIL_FUZZ_SEED:-$CHAOS_SEED}
GRAPH_GUARDRAIL_FUZZ_ITERATIONS=${GRAPH_GUARDRAIL_FUZZ_ITERATIONS:-60}

# Reset log and summary files
: > "$LOG_PATH"

cat <<LOGHDR | tee -a "$LOG_PATH"
[canary-chaos] starting probes
seed=$CHAOS_SEED
fuzz_iterations=$GRAPH_GUARDRAIL_FUZZ_ITERATIONS
LOGHDR

echo "Running golden-path smoke suite as canary..." | tee -a "$LOG_PATH"
npm run test:smoke 2>&1 | tee -a "$LOG_PATH"

echo "Running graph guardrail chaos/fuzz suite..." | tee -a "$LOG_PATH"
export GRAPH_GUARDRAIL_FUZZ_SEED
export GRAPH_GUARDRAIL_FUZZ_ITERATIONS
npm run test:fuzz:graph-guardrails 2>&1 | tee -a "$LOG_PATH"

cat > "$SUMMARY_PATH" <<JSON
{
  "chaos_seed": "$CHAOS_SEED",
  "graph_guardrail_fuzz_seed": "$GRAPH_GUARDRAIL_FUZZ_SEED",
  "graph_guardrail_fuzz_iterations": "$GRAPH_GUARDRAIL_FUZZ_ITERATIONS",
  "smoke_suite": "npm run test:smoke",
  "chaos_suite": "npm run test:fuzz:graph-guardrails"
}
JSON

echo "[canary-chaos] probes completed" | tee -a "$LOG_PATH"
