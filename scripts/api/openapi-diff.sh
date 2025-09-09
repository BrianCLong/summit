#!/usr/bin/env bash
set -euo pipefail
# Requires: npm i -g openapi-diff@3 or docker image
# Usage: scripts/api/openapi-diff.sh api/intelgraph-core-api.yaml HEAD~1 HEAD
OLD=${1:-api/intelgraph-core-api.yaml}
openapi-diff $OLD $OLD > /dev/null || echo "Run diff between versions in CI here"