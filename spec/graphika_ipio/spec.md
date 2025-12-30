# Graphika — IPIO: Influence-Path Inversion for Origin Set Estimation

## Overview
IPIO computes minimal origin sets for narrative outbreaks by performing inverse diffusion on temporal actor–content graphs. Outputs include uncertainty-aware origin certificates with replay tokens and Merkle commitments for reproducibility.

## Architecture
- **Ingestion Layer**: collects content interaction events scoped to narrative clusters.
- **Temporal Graph Builder**: constructs actor/content graph with time-stamped propagation edges.
- **Diffusion Modeler**: selects and fits a diffusion model (independent cascade, linear threshold, or Hawkes).
- **Inverse Inference Engine**: optimizes for minimal origin sets with activation-time loss and cardinality budgets.
- **Uncertainty Quantifier**: computes posterior probabilities, confidence intervals, and likelihood ratios.
- **Certificate Emitter**: packages origin set, uncertainty, localized explanation subgraph, commitments, and replay token.
- **Replay & Transparency**: registers origin certificates in the transparency log and enables deterministic replays.

## Data Contracts
- **Input events**: actor_id, content_id, interaction_type, timestamp, provenance, policy scope.
- **Origin certificate**: origin_set, uncertainty, alternative_sets, explanation_subgraph_ref, merkle_root, replay_token, attestation_quote?, budgets.

## Budgets & Constraints
- Computation budget (edges/runtime/memory).
- Explanation budget (nodes/edges for localized explanations).
- Policy guardrails from integration policy gateway.
