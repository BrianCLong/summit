#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)
MODULES=("sdk/go/abac")

for module in "${MODULES[@]}"; do
  (cd "$ROOT_DIR/$module" && go test ./... -covermode=atomic -coverprofile=coverage.out)
  coverage=$(go tool cover -func "$ROOT_DIR/$module/coverage.out" | awk 'END{print $3}' | tr -d '%')
  if (( ${coverage%.*} < 80 )); then
    echo "Go coverage for $module below threshold: ${coverage}%" >&2
    exit 1
  fi
  mv "$ROOT_DIR/$module/coverage.out" "$ROOT_DIR/$module/coverage.txt"
done
