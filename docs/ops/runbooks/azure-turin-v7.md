# Runbook: Azure Turin v7 Subsumption Bundle

## Component Overview
The Azure Turin v7 bundle provides governed compute profiles and evidence verification for Azure v7 VMs.

## Failure Modes

### 1. `subsumption-bundle-verifier` CI Failure
- **Symptoms:** CI pipeline fails on `verify_subsumption_bundle.mjs`.
- **Diagnosis:**
  - Check the CI logs for specific error messages (e.g., "Missing doc target", "Schema validation failed").
  - Verify that `subsumption/azure-turin-v7/manifest.yaml` hashes match the expected values if strictly enforced.
- **Resolution:**
  - If files are missing, restore them.
  - If schema validation fails, fix the JSON structure in `evidence/`.
  - Run `node scripts/ci/verify_subsumption_bundle.mjs` locally to reproduce.

### 2. Drift Detection Alert
- **Symptoms:** Scheduled workflow `azure-turin-v7-drift` fails.
- **Diagnosis:**
  - A required file (doc or manifest) has been modified or deleted without updating the evidence.
- **Resolution:**
  - Review recent commits to `subsumption/` or `docs/`.
  - Re-run the verifier and update the evidence bundle if the change was intentional.

## Operations
- **Update Manifest:** Edit `subsumption/azure-turin-v7/manifest.yaml` and regenerate evidence.
- **Add Claim:** Add new entry to `claims` list in manifest and referencing evidence.
