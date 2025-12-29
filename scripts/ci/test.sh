#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)

"$ROOT_DIR/scripts/ci/test-js.sh"
"$ROOT_DIR/scripts/ci/test-python.sh"
"$ROOT_DIR/scripts/ci/test-rust.sh"
"$ROOT_DIR/scripts/ci/test-go.sh"
