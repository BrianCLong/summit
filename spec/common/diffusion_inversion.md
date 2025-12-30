# Diffusion Inversion Primitive

This document defines the shared primitive for reconstructing origin sets from propagation traces across IPIO-style workloads.

## Objectives
- Invert forward diffusion processes on temporal actor–content graphs.
- Provide minimal origin sets with bounded uncertainty.
- Emit replayable origin certificates with deterministic re-run tokens.

## Components
- **Temporal Propagation Graph**: nodes (actors, content), time-stamped edges.
- **Diffusion Model Plug-ins**: independent cascade, linear threshold, Hawkes.
- **Inverse Inference Engine**: optimizer minimizing activation-time error under cardinality budget.
- **Uncertainty Layer**: posterior over origins, likelihood ratios for alternatives.
- **Certificate Emitter**: produces origin certificates with Merkle commitments and schema versioning.

## Budgets and Guards
- **Computation Budget**: max edges, runtime, memory to prevent runaway inference.
- **Explanation Budget**: cap nodes/edges in localized explanation subgraphs.
- **Replay Token**: seed, schema version, index version, snapshot identifier.

## Outputs
- Candidate origin set with credible intervals.
- Alternative origin sets with likelihood ratios when near-optimal.
- Cryptographic commitments (Merkle root) over evidence nodes.
- Optional attestation quote when executed in a TEE.
