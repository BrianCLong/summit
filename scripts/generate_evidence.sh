#!/usr/bin/env bash
set -euo pipefail

OUT=${1:-"artifacts/evidence-bundle.json"}
POLICY_PATH=${EVIDENCE_POLICY_PATH:-"governance/policy-mapping-registry.yml"}
PREFLIGHT_PATH=${PREFLIGHT_VERDICT_PATH:-"artifacts/preflight-verdict.json"}
PROVENANCE_PATH=${PROVENANCE_RECEIPT_PATH:-"artifacts/provenance-receipt.json"}

node scripts/evidence-generator.js \
  --output "$OUT" \
  --policy "$POLICY_PATH" \
  --preflight "$PREFLIGHT_PATH" \
  --provenance "$PROVENANCE_PATH"
