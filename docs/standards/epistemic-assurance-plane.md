# Epistemic Assurance Plane Standards

This document defines the standards and operational requirements for Summit's Epistemic Assurance Plane.

## Overview

The Epistemic Assurance Plane decides what the system is allowed to believe, act on, disclose, or escalate based on evidence, provenance, uncertainty, and policy. It governs whether a claim is publishable, actionable, or only hypothesis-grade.

## Bitemporal Graph Entities

1. **EpistemicClaim**: A statement or hypothesis tracked over time.
2. **Evidence**: Data sources supporting or refuting claims.
3. **ProvenanceStep**: Immutable audit log of how claims and evidence were produced/manipulated.
4. **EpistemicPolicy**: Rules defining the required support, certainty, and bounds for action.

## Artifacts and Determinism

Outputs must be deterministic JSON files:
- `report.json`: Aggregated metrics and outcomes.
- `metrics.json`: Performance and coverage metrics.
- `stamp.json`: Evidence signature and bundle checksums.
(No unstable timestamps permitted; use deterministic hashing.)

## Data Classification

- **Never-log**: Full raw source text, freeform analyst override notes, private tokens.

## Threat Model Mitigations

- **Hallucinated claim**: Policy defaults to `BLOCK` when evidence is missing.
- **Single-source claim**: Policy strictly enforces independent-source counts.
