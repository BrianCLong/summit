# Spec Repository Drop

This directory captures the full specification set for competitor wedges and the
shared primitives they rely on. Each wedge has its own folder with a `spec.md`
entrypoint plus focused documents for algorithms, certificates, and claims.

## Layout

```
/spec
  common/                     # Shared primitives used across wedges
  graphika_ipio/              # Influence-Path Inversion for Origin estimation
  recordedfuture_idcp/        # Indicator Deconfliction with Collision Proofs
  palantir_omcp/              # Ontology Migration Compiler + Compatibility
  maltego_tcgi/               # Transform Graph Grammar Induction
  spiderfoot_llct/            # Linkage-Limited Correlation Tokens
```

## Standard Sections

Each wedge spec should include:

- **Overview**: Problem statement and wedge differentiation.
- **Architecture**: Components and data flows.
- **Data Contracts**: Required inputs and emitted artifacts.
- **Policy & Compliance**: Policy-as-code controls and evidence logging.
- **Determinism & Replay**: Replay tokens and audit artifacts.
- **Operational Metrics**: KPIs, SLAs, and failure modes.

## Cross-Cutting Guarantees

The common primitives define requirements for:

- **Commitments & receipts** (Merkle commitments, evidence bundles).
- **Determinism tokens** (seeded inference and replayability).
- **Transparency logging** (append-only, verifiable audit trails).
- **Attestation** (TEE-backed verification when available).

Maintain backwards compatibility for schema fields and replay tokens when
updating wedge artifacts.
