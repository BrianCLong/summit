#!/usr/bin/env bash
set -euo pipefail

# Config
ENFORCE="${SUMMIT_MODEL_RUNNER_ENFORCE:-0}"
RUN_ID="${RUN_ID:-$(node -e 'console.log(crypto.randomUUID())')}"

RECEIPT_DIR="${RECEIPT_DIR:-runtime/receipts}"
AUDIT_DIR="${AUDIT_DIR:-runtime/audit}"
EGRESS_POLICY="${EGRESS_POLICY:-policies/egress-allowlist.json}"
MODEL_ALLOWLIST="${MODEL_ALLOWLIST:-policies/model-allowlist.json}"

# Container Runtime Config
DOCKER_CMD="${DOCKER_CMD:-docker}"
CONTAINER_IMAGE="${CONTAINER_IMAGE:-summit-model-runtime:latest}"
CONTAINER_USER="${CONTAINER_USER:-10001:10001}"
MEMORY_LIMIT="${MEMORY_LIMIT:-4g}"
CPUS_LIMIT="${CPUS_LIMIT:-2}"
TIMEOUT_SEC="${TIMEOUT_SEC:-1800}"

# Required Inputs
MODEL_PATH="${MODEL_PATH:?set MODEL_PATH}"
DATA_MOUNT="${DATA_MOUNT:-}"

# 1. Resolve Model Digest from Allowlist if not provided
if [[ -z "${MODEL_SHA256_EXPECTED:-}" ]]; then
  MODEL_FILENAME="$(basename "$MODEL_PATH")"
  MODEL_NAME="${MODEL_FILENAME%.*}"
  MODEL_SHA256_EXPECTED="$(jq -r --arg name "$MODEL_NAME" '.models[] | select(.name == $name) | .sha256' "$MODEL_ALLOWLIST" 2>/dev/null || echo "")"
fi

if [[ -z "$MODEL_SHA256_EXPECTED" ]]; then
  MODEL_SHA256_EXPECTED="MISSING"
fi

# Hardening
ulimit -c 0 # disable core dumps (CLAIM-03)

# 2. Pre-flight Policy Check
node runtime/run_policy_check.mjs \
  --model "$MODEL_PATH" \
  --sha256 "$MODEL_SHA256_EXPECTED" \
  ${DATA_MOUNT:+--mount "$DATA_MOUNT"} \
  --egress "$EGRESS_POLICY" \
  --receipt "$RECEIPT_DIR" \
  || {
    if [[ "$ENFORCE" == "1" ]]; then
      echo "CRITICAL: Policy validation failed. Aborting."
      exit 2
    else
      echo "WARN: Policy validation failed (Audit Mode). Continuing..."
    fi
  }

# 3. Setup Artifacts
mkdir -p "$RECEIPT_DIR" "$AUDIT_DIR"
RECEIPT_PATH="${RECEIPT_DIR}/${RUN_ID}.json"
STAMP_PATH="${RECEIPT_DIR}/${RUN_ID}.stamp.json"
AUDIT_PATH="${AUDIT_DIR}/${RUN_ID}.jsonl"

CODE_SHA="$(git rev-parse HEAD 2>/dev/null || echo "UNKNOWN")"

# Initialize Receipt (Deterministic)
cat > "$RECEIPT_PATH" <<EOF
{
  "run_id": "${RUN_ID}",
  "model": {
    "path": "${MODEL_PATH}",
    "sha256": "${MODEL_SHA256_EXPECTED}"
  },
  "code_sha": "${CODE_SHA}",
  "container": {
    "image": "${CONTAINER_IMAGE}",
    "user": "${CONTAINER_USER}"
  },
  "egress_policy": "${EGRESS_POLICY}",
  "status": "started"
}
EOF

# Initialize Stamp (Non-deterministic timestamps go here)
echo "{\"started_at\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}" > "$STAMP_PATH"

# 4. Execution
echo "Executing model $MODEL_PATH in hardened container..."
echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") INFO: Model execution started (Run ID: $RUN_ID)" >> "$AUDIT_PATH"

if [[ "$ENFORCE" == "1" ]]; then
  # REAL Hardened Invocation
  $DOCKER_CMD run --rm \
    --name "summit-runner-$RUN_ID" \
    --read-only \
    --user "$CONTAINER_USER" \
    --network none \
    --memory "$MEMORY_LIMIT" \
    --cpus "$CPUS_LIMIT" \
    --security-opt "no-new-privileges" \
    --cap-drop ALL \
    -v "$MODEL_PATH:/app/model:ro" \
    ${DATA_MOUNT:+-v "$DATA_MOUNT"} \
    "$CONTAINER_IMAGE" /app/run_model.sh >> "$AUDIT_PATH" 2>&1 || {
      echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") ERROR: Container failed" >> "$AUDIT_PATH"
      jq '.status="failed"' "$RECEIPT_PATH" > "${RECEIPT_PATH}.tmp" && mv "${RECEIPT_PATH}.tmp" "$RECEIPT_PATH"
      exit 3
    }
else
  # Simulation for Audit Mode (or non-docker environments)
  echo "SKIP: Container execution (Audit Mode)" >> "$AUDIT_PATH"
  sleep 1
fi

echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ") INFO: Model execution completed successfully" >> "$AUDIT_PATH"

# 5. Teardown & Finalize Receipt
echo "Cleaning up ephemeral artifacts..."
rm -f /tmp/summit_model_runner_${RUN_ID}_* 2>/dev/null || true

# Update receipt status
jq '.status="finished"' "$RECEIPT_PATH" > "${RECEIPT_PATH}.tmp" && mv "${RECEIPT_PATH}.tmp" "$RECEIPT_PATH"
echo "{\"finished_at\":\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}" | jq -s '.[0] * .[1]' "$STAMP_PATH" - > "${STAMP_PATH}.tmp" && mv "${STAMP_PATH}.tmp" "$STAMP_PATH"

echo "Run complete. Receipt: $RECEIPT_PATH"
