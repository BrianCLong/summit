# Proof Objects (POAR)

## Contents

- Plan hash and determinism token capturing snapshot and seed.
- Policy decision identifier and disclosure obligation references.
- Transformed outputs with optional counterfactual variants.
- Cryptographic signature and optional attestation quote.
- Transparency log entry or inclusion proof for public verification.

## Verification workflow

1. Validate signatures and attestation measurements.
2. Check determinism token consistency with policy and plan versions.
3. Recompute minimal obligations (e.g., disclosure constraints) without accessing raw data when possible.
4. Confirm inclusion in transparency log and verify Merkle paths.
