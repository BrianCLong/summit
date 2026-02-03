#!/usr/bin/env bash
set -euo pipefail

node scripts/ci/verify_subsumption_bundle.mjs --bundle "${1:-subsumption/item-UNKNOWN}"
