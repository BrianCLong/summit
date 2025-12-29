#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
REPORT_DIR="$ROOT_DIR/client/test-results"
COVERAGE_DIR="$ROOT_DIR/client/coverage"

export CI=${CI:-true}
export PNPM_HOME=${PNPM_HOME:-"$HOME/.local/share/pnpm"}
export PATH="$PNPM_HOME:$PATH"

mkdir -p "$REPORT_DIR" "$COVERAGE_DIR"

(cd "$ROOT_DIR/client" && pnpm test:jest --runInBand --coverage)
