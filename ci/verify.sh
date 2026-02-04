#!/usr/bin/env bash
set -euo pipefail

python -m pytest -q \
  tests/test_nog_schema.py \
  tests/test_policy_deny_by_default.py \
  tests/test_simulation_determinism.py \
  tests/test_audit_provenance.py

echo "OK"
