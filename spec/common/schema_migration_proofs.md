# Schema Migration Proofs Primitive

Defines compiled ontology migration artifacts with compatibility guarantees.

## Objectives
- Compile ontology deltas into migration plans and compatibility shims.
- Verify compatibility conditions for prior action signatures.
- Emit compatibility proof objects and breakage certificates.

## Flow
1. Receive prior and updated schemas.
2. Compute schema delta (type, field, action signature changes).
3. Generate migration plan (data transforms) and compatibility shim (request rewrites).
4. Verify compatibility: type preservation, policy invariants, termination of rewrite rules.
5. Emit compatibility proof referencing deterministic diffs and witness chains.
6. Output migration artifact with replay token (snapshot identifier, schema version pair, seed).

## Artifacts
- Compatibility proof object (hash-committed to delta, shim, verification results).
- Breakage certificate with minimal breaking change set when verification fails.
- Witness chain over migration steps applied to stored data.
- Optional TEE attestation quote.
