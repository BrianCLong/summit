#!/usr/bin/env bash
set -euo pipefail

echo "Running Full Governance Gate"
# Control Plane Hook
./scripts/validate-control-plane.sh
