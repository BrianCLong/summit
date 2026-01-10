# ADR 0001: Governed, Auditable, Poison-Resistant MCP Architecture

- Status: Accepted
- Date: 2026-01-01
- Deciders: Brian C. Long
- Technical Area: Model Context Protocol (MCP) assembly and governance

## Context

Summit requires a deterministic, auditable method to assemble model context from heterogeneous
sources while resisting poisoning and latent manipulation. The platform already maintains strong
provenance and verification hooks, but lacked a unified design tying provenance, invariants, trust
weighting, and counterfactual analysis together.

## Decision

Adopt a four-pillar architecture that standardizes context handling:

1. **Context Provenance Graph (CPG):** trace each context segment with lineage edges for derivations.
2. **Invariant-Carrying Context Capsules (IC³):** attach enforceable invariants to context payloads.
3. **Trust-Weighted Context Assembly (TWCA):** assemble ordered contexts based on explicit trust
   weights and thresholds.
4. **Counterfactual Context Reassembly (CCR):** generate controlled counterfactual variants to detect
   disproportionate influence and poisoning indicators.

## Consequences

- Each pillar ships with language-specific scaffolding (TypeScript and Python) to seed implementation.
- Future runtime wiring should integrate the components into MCP assembly pipelines and observability.
- Tests and ADRs serve as defensive prior art and design contracts for subsequent feature work.
