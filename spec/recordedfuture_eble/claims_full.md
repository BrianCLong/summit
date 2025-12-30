# Claims — Escrowed Benchmark Label Exchange (EBLE)

## Independent Claims

1. Method: receive outcome labels; generate label bundle with verification hashes; produce label manifest committing to bundle and label policy; enable scoring without evidence; output bundle + manifest with replay token.
2. System: processors/memory executing the method.
3. CRM: medium storing instructions to perform the method.

## Dependent Claims

4. Manifest includes Merkle proofs for individual labels.
5. Label policy enforces selective disclosure with field-level redaction while preserving hashes.
6. Drift alarms emitted when label distributions shift across assessment cycles.
7. Counterfactual label bundles excluding selected feeds with scoring deltas.
8. Replay token binds time window and dataset snapshot identifier.
9. Cache keyed by label bundle hash to reuse manifests.
10. TEE attestation for label bundle generation.
11. Label bundle includes confidence intervals for noisy labels.
12. Binder export format for program reviews.
