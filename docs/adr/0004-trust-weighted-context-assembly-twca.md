# ADR 0004: Trust-Weighted Context Assembly (TWCA)

- Status: Accepted
- Date: 2026-01-01

## Context

Context poisoning and model bias can be mitigated by weighting sources differently based on trust and
provenance. Summit needs deterministic assembly rules that prioritize high-confidence segments without
losing auditability.

## Decision

Introduce a Trust-Weighted Context Assembler that filters and orders segments by trust weight and
optional thresholds. The assembler returns an encoded form suitable for model consumption and supplies
a deterministic context identifier for traceability.

## Consequences

- Provides a simple, dependency-free implementation with pluggable thresholds.
- Pairs with IC³ to ensure only validated segments are eligible for assembly.
- Feeds assembled contexts into CCR for downstream counterfactual analysis.
