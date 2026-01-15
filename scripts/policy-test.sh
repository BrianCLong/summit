#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OPA_BIN="${OPA_BIN:-$ROOT/bin/opa}"
# Using a fixed version to ensure consistency
OPA_VERSION="${OPA_VERSION:-v0.63.0}"

# Determine OS and Architecture for download
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

if [[ "$ARCH" == "x86_64" ]]; then
  ARCH="amd64"
elif [[ "$ARCH" == "aarch64" ]]; then
  ARCH="arm64_static"
fi

OPA_URL="https://openpolicyagent.org/downloads/${OPA_VERSION}/opa_${OS}_${ARCH}"

# Ensure bin directory exists
mkdir -p "$(dirname "$OPA_BIN")"

# Download OPA if not present
if [ ! -x "$OPA_BIN" ]; then
  echo "Downloading opa binary (${OPA_VERSION}) for ${OS}_${ARCH}..."
  if curl -sSL -o "$OPA_BIN" "$OPA_URL"; then
    chmod +x "$OPA_BIN"
    echo "OPA binary downloaded successfully."
  else
    echo "Failed to download OPA binary from $OPA_URL"
    exit 1
  fi
fi

# Run OPA tests
echo "Running OPA tests..."
cd "$ROOT"

# Check if directories exist before running tests
TEST_PATHS=""
if [ -d "policy/abac" ]; then TEST_PATHS="$TEST_PATHS policy/abac"; fi
if [ -d "policy/maestro" ]; then TEST_PATHS="$TEST_PATHS policy/maestro"; fi
if [ -d "policy/tests" ]; then TEST_PATHS="$TEST_PATHS policy/tests"; fi
if [ -d "policy_tests" ]; then TEST_PATHS="$TEST_PATHS policy_tests"; fi
if [ -d "policies/tests" ]; then TEST_PATHS="$TEST_PATHS policies/tests"; fi
if [ -d "policies/bundles" ]; then TEST_PATHS="$TEST_PATHS policies/bundles"; fi

if [ -z "$TEST_PATHS" ]; then
    echo "No policy tests found."
else
    "$OPA_BIN" test -v $TEST_PATHS || {
        echo "OPA tests failed."
        exit 1
    }
fi
