#!/bin/bash
set -e
echo "Running Evidence Smoke Test..."
python3 -m evals.evidence_smoke.run
echo "Evidence Smoke Test Passed."
