#!/usr/bin/env bash
# Wrap a command with otel-cli if available
set -euo pipefail
if command -v otel-cli >/dev/null 2>&1; then
  otel-cli span --name "$1" -- $@
else
  "$@"
fi