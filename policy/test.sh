#!/usr/bin/env bash
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPA_VERSION="${OPA_VERSION:-0.67.1}"
OPA_BIN_DEFAULT="${ROOT_DIR}/bin/opa"

if command -v opa >/dev/null 2>&1; then
  OPA_BIN="$(command -v opa)"
elif [ -x "${OPA_BIN_DEFAULT}" ]; then
  OPA_BIN="${OPA_BIN_DEFAULT}"
else
  echo "Downloading OPA..."
  mkdir -p "$(dirname "${OPA_BIN_DEFAULT}")"
  # Use curl -L for redirects
  curl -sL "https://openpolicyagent.org/downloads/v${OPA_VERSION}/opa_linux_amd64_static" -o "${OPA_BIN_DEFAULT}"
  chmod +x "${OPA_BIN_DEFAULT}"
  OPA_BIN="${OPA_BIN_DEFAULT}"
fi

echo "Using OPA from: ${OPA_BIN}"
cd "${ROOT_DIR}"

echo "Running OPA tests..."

# Run tests and capture exit code
set +e
"${OPA_BIN}" test . -v
TEST_EXIT_CODE=$?
set -e

# Generate JSON report regardless of success/failure
"${OPA_BIN}" test . -f json > test_report.json || true
echo "Test report generated at ${ROOT_DIR}/test_report.json"

if [ $TEST_EXIT_CODE -ne 0 ]; then
  echo "Tests failed."
  exit 1
else
  echo "Tests passed."
fi
