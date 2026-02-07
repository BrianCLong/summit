# Attestation Presence Eval

## Goal
Ensure SBOM attestation artifacts are emitted for each supply-chain run.

## Procedure
1. Run the supplychain workflow.
2. Confirm the attestation bundle exists in the workflow artifacts.

## Expected Result
The attestation bundle is present and linked in `evidence.summary.json`.
