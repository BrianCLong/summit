# Claims — Verifiable, Composable Experiment Capsules (VCEC)

## Independent Claims

1. Method: receive workflow specification; compile into executable capsule with interface contract and determinism manifest; execute; generate witness chain; output capsule with witness chain and replay token.
2. System executing the method.
3. CRM storing instructions to perform the method.

## Dependent Claims

4. Capsule enforces effect typing (READ, WRITE, EXPORT).
5. Execution enforces egress byte budget and endpoint allowlist.
6. Determinism manifest includes module versions, seed, dataset snapshot identifier.
7. Counterfactual capsule runs under stricter disclosure with information-loss metrics.
8. Capsule includes proprietary stubs preserving interface behavior for evaluator execution.
9. Caching keyed by capsule hash with invalidation on module version change.
10. Witness chain is hash-chained for tamper evidence.
11. TEE attestation for capsule execution.
12. Capsule includes evaluator-facing conformance test.
