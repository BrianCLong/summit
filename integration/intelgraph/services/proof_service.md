# Proof Service

## Responsibilities

- Build proof objects from execution metadata.
- Sign proof objects and store in transparency log.
- Provide verification endpoints for third parties.

## Inputs

- Plan hash, policy decision ID, output hash.
- Determinism token and optional attestation quote.

## Outputs

- Signed proof object and inclusion proof.

## Dependencies

- Transparency log.
- Key management service for signing keys.
