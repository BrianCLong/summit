# ADR 0005: Counterfactual Context Reassembly (CCR) for MCP Poisoning Detection

- Status: Accepted
- Date: 2026-01-01

## Context

Static rules and signature-based approaches fail to detect subtle poisoning in model contexts. Summit
needs an execution-layer mechanism to surface disproportionate influence from specific context
segments without relying on model internals or vendor-specific hooks.

## Decision

Adopt Counterfactual Context Reassembly during MCP assembly. For each context, generate controlled
variants (removal, trust attenuation, reorder, and isolation) and compare model outputs across
variants. Divergent outputs attributable to a single segment constitute a poisoning indicator and feed
enforcement logic.

## Consequences

- Establishes deterministic variant generation and divergence analysis in both TypeScript and Python.
- Enables poisoning responses (suppression/quarantine) based on measured influence rather than
  heuristics.
- Future work should integrate CCR into execution pipelines and emit observability events for audits.
