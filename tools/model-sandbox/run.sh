#!/usr/bin/env bash
# tools/model-sandbox/run.sh
# Hardened runner for local/self-hosted model execution.

set -euo pipefail

# Default values
MODEL_NAME=${1:-"example-model"}
IMAGE=${2:-"alpine:latest"}
MODEL_PATH=${3:-"tools/model-sandbox/fixtures/dummy-weights.bin"}
DRY_RUN=${DRY_RUN:-0}

# Security Configuration
USER_ID="10001"
GROUP_ID="10001"
MEMORY_LIMIT="${MODEL_MEM:-8g}"
CPU_LIMIT="${MODEL_CPUS:-4}"

echo "--- Summit Model Sandbox Runner ---"
echo "Model: $MODEL_NAME"
echo "Image: $IMAGE"

# 1. Supply Chain Integrity: Compute Hash
# (ITEM:CLAIM-04) - Must compute hash, not just accept one.
MODEL_DIGEST=$(node .github/scripts/model-sandbox/hash_weights.mjs "$MODEL_PATH")
echo "Computed Digest: $MODEL_DIGEST"

# 2. Pre-run Policy Check
RUN_CONFIG="{\"modelName\":\"$MODEL_NAME\",\"modelDigest\":\"$MODEL_DIGEST\",\"user\":\"$USER_ID\",\"readOnlyRootfs\":true}"
node .github/scripts/model-sandbox/run_policy_check.mjs ".github/policies/model-sandbox/model-allowlist.yml" "$RUN_CONFIG"

if [ "$DRY_RUN" -eq 1 ]; then
  echo "--- DRY RUN COMPLETE ---"
  node .github/scripts/model-sandbox/receipt.mjs "./runtime/receipts/$MODEL_NAME"
  exit 0
fi

# 3. Execute Hardened Container
docker run --rm \
  --name "summit-sandbox-$MODEL_NAME" \
  --read-only \
  --user "$USER_ID:$GROUP_ID" \
  --pids-limit 256 \
  --memory "$MEMORY_LIMIT" \
  --cpus "$CPU_LIMIT" \
  --security-opt "no-new-privileges:true" \
  --security-opt "seccomp=$(pwd)/.github/policies/model-sandbox/security-profile.json" \
  --network none \
  "$IMAGE" "${@:4}"

# 4. Post-run Receipt
node .github/scripts/model-sandbox/receipt.mjs "./runtime/receipts/$MODEL_NAME"
