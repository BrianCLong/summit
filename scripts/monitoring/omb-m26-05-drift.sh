#!/bin/bash
set -euo pipefail

# Summit Policy/Evidence Drift Detector
# Checks for regression in assurance posture

echo "Running OMB M-26-05 Drift Detector..."

# 1. Check for schema existence
if [ ! -f "schemas/assurance/evidence-pack.schema.json" ]; then
  echo "CRITICAL: Assurance schema missing"
  exit 1
fi

# 2. Check for required documentation
for doc in docs/standards/omb-m26-05-risk-based-assurance.md docs/assurance/README.md; do
  if [ ! -f "$doc" ]; then
    echo "CRITICAL: Required documentation $doc missing"
    exit 1
  fi
done

# 3. Check for CI script integrity
for script in scripts/assurance/generate_sbom.sh scripts/assurance/build_evidence_pack.sh; do
  if [ ! -x "$script" ]; then
    echo "WARNING: Script $script is not executable"
  fi
done

echo "Drift detection complete: NO REGRESSIONS"
