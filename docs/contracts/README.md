# Contract Testing
- Keep `contracts/graphql/*.golden.graphql` authoritative.
- If you must change schema, write an ADR and update goldens in the same PR.
- CI `contract` job will fail on drift.
