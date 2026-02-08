# Attestation Verification Eval

## Goal
Fail closed when attestation verification does not pass.

## Procedure
1. Run verification against a known-bad or missing attestation bundle.
2. Observe `verification.status` in the summary output.

## Expected Result
Verification status is `failed` and the badge renders red.
