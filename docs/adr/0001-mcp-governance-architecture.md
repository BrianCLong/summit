# ADR 0001: Governed, Auditable, Poison-Resistant MCP Architecture

- Status: Accepted
- Date: 2026-01-01
- Deciders: Brian C. Long
- Technical Area: Model Context Protocol (MCP) assembly and governance

## Context

Summit requires a unified model-context governance layer that can withstand prompt/context poisoning, provide audit-grade provenance, and expose trust-aware assembly of heterogeneous context sources. Prior work introduced discrete pillars—Context Provenance Graph (CPG), Invariant-Carrying Context Capsules (IC³), Trust-Weighted Context Assembly (TWCA), and Counterfactual Context Reassembly (CCR)—but lacked cohesive scaffolding in this codebase.

## Decision

We codify a four-pillar architecture with neutral interfaces in both TypeScript and Python:

1. Provenance capture and graph traversal (CPG)
2. Capsule-based invariant enforcement (IC³)
3. Deterministic trust-weighted assembly (TWCA)
4. Counterfactual perturbation and divergence analysis for poisoning detection (CCR)

The scaffolding is additive and designed to be model-agnostic. It surfaces stable interfaces for executors, segment metadata, divergence analysis, and poisoning response.

## Consequences

- **Positive:** Establishes defensive prior art and engineering starting points for MCP governance features. Enables automated poisoning detection pipelines without model introspection.
- **Negative:** Adds new modules that require integration into existing build/test pipelines. Divergence thresholds and trust weights will need calibration per deployment.
- **Follow-up:** Integrate executors in runtime services, feed provenance edges into existing audit ledgers, and wire verification gates to the poisoning responder.
