#!/usr/bin/env bash
set -euo pipefail
BASE_REF=${1:-main}
turbo run test --filter=...[origin/$BASE_REF] --dry-run=json | jq -r '.packages[]'