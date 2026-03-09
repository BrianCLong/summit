#!/usr/bin/env bash
set -euo pipefail

echo "Running Validate Control Plane Script"
node scripts/verify-control-plane.mjs --component control-plane
