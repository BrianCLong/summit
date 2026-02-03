#!/usr/bin/env bash
set -e

# Generate stable Evidence ID for supply chain artifacts
# Format: sc-<git-sha>-<ci-run-id>-<target>

GIT_SHA=${GIT_SHA:-$(git rev-parse --short HEAD)}
CI_RUN_ID=${CI_RUN_ID:-local}
TARGET=${1:-build}

echo "sc-${GIT_SHA}-${CI_RUN_ID}-${TARGET}"
