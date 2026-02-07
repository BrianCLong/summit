#!/usr/bin/env bash
set -euo pipefail

node scripts/ci/actions_sha_pinned.mjs .github/workflows/supplychain.yml
