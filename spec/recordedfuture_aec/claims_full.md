# Claims — AEC

## Independent

1. Method: collect telemetry; map to NIST SP 800-171 controls; generate control-evidence bundle; compute assessment status; generate assessment artifact; output with replay token.
2. System implementing the method.
3. CRM storing instructions for the method.

## Dependent

4. Mapping uses Rev.3 control identifiers.
5. Artifact includes SSP pointer and POA&M delta.
6. Computes DFARS assessment readiness indicator for SPRS.
7. Bundle includes cryptographic commitments (Merkle proof) to event hashes.
8. Replay token binds to policy version, telemetry schema version, time window.
9. Produces counterfactual artifacts excluding a telemetry source with impact estimate.
10. Cache keyed by control ID and replay token.
11. Output enforces egress budget and redacts sensitive fields while preserving hashes.
12. Trusted execution environment attests evidence compilation.
13. Assessment status includes continuous compliance affirmation window for CMMC rule structure.
14. Protected environment is a CUI enclave.
