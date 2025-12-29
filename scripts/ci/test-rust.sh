#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)

if ! command -v cargo-llvm-cov >/dev/null 2>&1; then
  cargo install cargo-llvm-cov --locked --version 0.6.15
fi

(cd "$ROOT_DIR" && cargo llvm-cov --workspace --fail-under-lines 70 --lcov --output-path "$ROOT_DIR/target/lcov.info" --doctests)
