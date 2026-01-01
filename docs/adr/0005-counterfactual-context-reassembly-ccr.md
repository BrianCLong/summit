# ADR 0005: Counterfactual Context Reassembly (CCR) for MCP Poisoning Detection

- Status: Accepted
- Date: 2026-01-01
- Deciders: Brian C. Long

## Context

Poisoned or manipulative context can alter model reasoning without violating provenance rules or static policies. We need an execution-time mechanism to expose disproportionate influence from specific segments.

## Decision

Adopt counterfactual context reassembly during MCP assembly. For each context, generate controlled perturbations (removal and trust attenuation) and compare model responses. Divergence is measured without relying on model introspection and can be used to suppress or quarantine risky segments.

## Consequences

- **Positive:** Provides automated poisoning detection via structural perturbations. Works across deterministic and non-deterministic models and across vendors.
- **Negative:** Increases execution cost by issuing multiple model calls. Divergence thresholds must be tuned to minimize false positives.
- **Follow-up:** Connect divergence scoring to policy gates, add caching for repeated perturbations, and emit metrics for operational tuning.
