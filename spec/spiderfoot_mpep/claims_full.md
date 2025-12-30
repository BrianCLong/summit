# Claims — Multi-Performer Evaluation Plane (MPEP)

## Independent Claims

1. Method: receive execution request with scope token; select sandbox policy; execute while monitoring egress; generate egress receipt; partition outputs into shareable shards with shard manifest; output shard(s) with receipt and manifest.
2. System executing the method.
3. CRM storing instructions to perform the method.

## Dependent Claims

4. Sandbox policy defaults to passive-only egress absent authorization token.
5. Shard manifest cryptographically signed and stored in append-only transparency log.
6. Execution halts when egress threshold exceeded with halt recorded in receipt.
7. Scope token binds performer identity and purpose for evaluator review.
8. Outputs use selective disclosure with aggregation/redaction/hashing while preserving verification hashes.
9. Counterfactual shards generated under stricter scope with information-loss metrics.
10. Cache validated scope tokens for TTL.
11. Replay token includes module version sets and time window identifiers for evaluator reproduction.
12. TEE attestation for sandbox enforcement.
13. Shard verification possible without access to unshared shards.
