# ADR-004: Simulation Overlay & Synthetic Data Policy

**Status:** Proposed / Sprint 3 target

## Context

Simulations and AI-generated artifacts must augment—not contaminate—the canonical fact graph. A dedicated overlay with explicit tagging ensures synthetic data remains isolated while still enabling explainable predictions and evidence tracing.

## Decisions

- Model simulations as **separate overlay graphs** distinct from the canonical fact graph, with explicit labels for `Hypothesis` and `PredictedEvent` nodes plus `SIMULATES/LEADS_TO/INVOLVES` relationships.
- Label all AI-generated content with `source = "synthetic"` and maintain provenance links to supporting Observations to preserve explainability and allow selective exclusion.
- Block synthetic outputs from canonical ingest pipelines and default read paths; overlays must be opt-in via `includeSimulations` flags in APIs and UI.
- Add **hallucination/firewall checks** that validate schema compatibility, enforce physics constraints (distance/time bounds), and cap probabilities based on evidence trust scores.
- Require export pathways to respect synthetic flags, ensuring overlays are never mixed into canonical exports without privileged approvals.

## Consequences

- Maintains trust in the fact graph while enabling experimentation and hypothesis testing.
- Requires UI/API controls to toggle overlays and enforce synthetic-data handling in ingestion and analytics.
- Improves traceability of model outputs and enables “Why?” explanations by preserving evidence paths per prediction.
- Prevents contamination of analytics, alerts, and exports with speculative data unless explicitly authorized.
