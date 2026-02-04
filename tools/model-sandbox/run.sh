#!/usr/bin/env bash
set -euo pipefail

# Determine repo root and change to it
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || dirname "$(dirname "$(dirname "$(realpath "$0")")")")
cd "$REPO_ROOT"

# Default hardening flags
MODEL_USER="1001:1001"
SECCOMP_PROFILE=".github/policies/model-sandbox/security-profile.json"
MODEL_MEM="${MODEL_MEM:-8g}"
MODEL_CPUS="${MODEL_CPUS:-4}"

# Paths
LOG_DIR="runtime/logs"
RECEIPT_DIR="runtime/receipts"
mkdir -p "$LOG_DIR" "$RECEIPT_DIR"

# Input model
if [[ $# -lt 2 ]]; then
    echo "Usage: $0 <image> <weights_path> [args...]"
    exit 1
fi

MODEL_IMAGE="$1"
MODEL_WEIGHTS="$2"
shift 2

# Create temporary config for policy check
CONFIG_TMP=$(mktemp)
trap 'rm -f "$CONFIG_TMP"' EXIT

cat <<EOF > "$CONFIG_TMP"
{
  "user": "$MODEL_USER",
  "readOnly": true,
  "seccomp": "$SECCOMP_PROFILE",
  "modelPath": "$MODEL_WEIGHTS",
  "network": "none",
  "mounts": ["/tmp"]
}
EOF

# Policy Check
echo "Running policy check..."
node .github/scripts/model-sandbox/run_policy_check.mjs "$CONFIG_TMP"

if [[ "${DRY_RUN:-0}" == "1" ]]; then
    echo "[DRY_RUN] Policy check passed. Skipping docker execution."
    # Generate a dummy receipt for dry-run verification
    CONFIG_JSON=$(cat "$CONFIG_TMP")
    RESULTS_JSON='{"exitCode": 0, "stdoutHash": "dry-run", "stderrHash": "dry-run"}'
    node .github/scripts/model-sandbox/receipt.mjs "$CONFIG_JSON" "$RESULTS_JSON"
    exit 0
fi

# Execute with hardening
TEMP_ID=$(date +%s%N | sha256sum | head -c 12)
STDOUT_LOG="$LOG_DIR/$TEMP_ID.stdout.log"
STDERR_LOG="$LOG_DIR/$TEMP_ID.stderr.log"

echo "Starting model sandbox..."

docker run --rm \
  --read-only \
  --pids-limit 256 \
  --memory "$MODEL_MEM" \
  --cpus "$MODEL_CPUS" \
  --security-opt "no-new-privileges:true" \
  --security-opt "seccomp=$SECCOMP_PROFILE" \
  --user "$MODEL_USER" \
  --network none \
  -v "$(realpath "$MODEL_WEIGHTS"):/model:ro" \
  "$MODEL_IMAGE" "$@" > "$STDOUT_LOG" 2> "$STDERR_LOG" || true

EXIT_CODE=$?

# Calculate hashes for receipt
STDOUT_HASH=$(sha256sum "$STDOUT_LOG" | awk '{print $1}')
STDERR_HASH=$(sha256sum "$STDERR_LOG" | awk '{print $1}')

CONFIG_JSON=$(cat "$CONFIG_TMP")
RESULTS_JSON="{\"exitCode\": $EXIT_CODE, \"stdoutHash\": \"$STDOUT_HASH\", \"stderrHash\": \"$STDERR_HASH\"}"

RUN_ID=$(node .github/scripts/model-sandbox/receipt.mjs "$CONFIG_JSON" "$RESULTS_JSON")

# Rename logs to use the final RUN_ID
mv "$STDOUT_LOG" "$LOG_DIR/$RUN_ID.stdout.log"
mv "$STDERR_LOG" "$LOG_DIR/$RUN_ID.stderr.log"

echo "Run complete. Evidence ID: MSBX-$RUN_ID"
echo "Receipt: $RECEIPT_DIR/$RUN_ID.run.json"
echo "Logs: $LOG_DIR/$RUN_ID.stdout.log"

exit $EXIT_CODE
