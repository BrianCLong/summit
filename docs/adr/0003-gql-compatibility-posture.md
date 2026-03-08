# ADR 0003: GQL Compatibility Posture

## Context
Market pressure (ISO GQL, Microsoft Fabric Graph) demands a standard query language. However, a full implementation of ISO/IEC 39075:2024 is high-effort and high-risk for correctness.

## Decision
We will not promise full ISO/IEC GQL compatibility in v0. We are shipping a supported subset of GQL specifically mapped to our workload. Any query shape outside this subset will result in a deterministic error with a human-readable message.

## Consequences
- We maintain a `supported-subset.md` file to explicitly state what is and is not supported.
- `make gql-compat` generates a compatibility matrix (`artifacts/gql-support-matrix.json`).
- If an unsupported construct is encountered, it must throw deterministically (no silent translation failures or wrong queries).
