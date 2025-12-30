# Attestation

Attestation ensures evaluator runs execute on trusted infrastructure with verifiable configurations.

## Trusted execution environments

- Support TEEs for sensitive modules with attestation evidence bound to replay tokens.
- Include measurements of binary hashes, container images, and policy configs.

## Run attestation flow

1. Evaluator requests an attested session with a specific replay token.
2. Service issues attestation evidence containing measurements and timestamps.
3. Evidence is logged in the transparency log and linked to evaluator outputs.

## Verification

- Provide scripts for evaluators to validate attestation evidence against expected measurements.
- Reject runs when measurements mismatch or when evidence is expired.
