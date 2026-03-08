#!/usr/bin/env bash
set -euo pipefail
# Wrapper to run the existing evidence verification script
python3 scripts/ci/verify_evidence.py
