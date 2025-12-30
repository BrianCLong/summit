# Determinism & Replay Tokens

Defines the deterministic replay contract used across all wedges.

## Token Composition
- **Seed**: random seed for stochastic components.
- **Version Triplet**: schema/policy/index versions relevant to the computation.
- **Snapshot Identifier**: graph or dataset snapshot reference.
- **Time Window**: ingestion/observation window for bounded computations.

## Determinism Rules
- All randomized steps must be seeded from the token seed.
- External data fetches must be pinned to the snapshot identifier and time window.
- Budgets (runtime, edges, verification) must be part of the token for reproducible enforcement.

## Verification
- Replay service regenerates outputs using the token and compares commitments (Merkle roots, hashes) to certify reproducibility.
