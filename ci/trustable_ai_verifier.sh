#!/usr/bin/env bash
set -euo pipefail

# Deny-by-default: evidence/index.json must exist and reference required files.
test -f evidence/index.json
grep -q "EVD-TRUSTABLEAI" evidence/index.json
test -f evidence/EVD-TRUSTABLEAI-EVIDENCE-001/report.json
test -f evidence/EVD-TRUSTABLEAI-EVIDENCE-001/metrics.json
test -f evidence/EVD-TRUSTABLEAI-EVIDENCE-001/stamp.json

echo "trustable_ai_verifier: OK"
