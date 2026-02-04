#!/usr/bin/env bash
set -euo pipefail
export PYTHONPATH="${PYTHONPATH:-}:."
python3 summit/evidence/verify.py "${1:-artifacts/evidence_bundle}"
