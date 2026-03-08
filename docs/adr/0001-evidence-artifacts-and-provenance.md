# ADR 0001: Evidence Artifacts and Provenance

## Context
As part of the Graph Intelligence roadmap, we need to formalize how evidence artifacts (benchmark reports, GQL compatibility matrices, and entity resolution results) are generated, stored, and signed to guarantee audit-grade determinism.

## Decision
All non-trivial graph intelligence pipelines must produce specific JSON artifacts alongside provenance data. The provenance will include SHA-256 hashes of inputs (schema, query shapes, policy configurations) and the git SHA of the execution environment.

Artifacts will be stored in the `artifacts/` directory and preserved by the CI/CD pipeline. The artifact contract will be neutral to any specific signer or vendor lock-in, instead relying on verifiable hashes and a deterministic schema.

## Consequences
- Every workflow must implement `make` targets (e.g., `make bench`, `make gql-compat`) that emit these artifacts.
- The repository must enforce that evidence-first tests exist for changes affecting graph logic.
