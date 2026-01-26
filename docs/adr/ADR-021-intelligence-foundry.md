# ADR-021: Adopt the Intelligence Foundry as a First-Class Architecture Primitive

## Status

Proposed

## Context

Enterprises require proof of authorized, rights-compliant AI operation. Existing AI products often provide controls but not evidence-grade provenance and attestations suitable for audit and high-stakes environments.

Summit already emphasizes governance, evidence, and deterministic artifacts. The Intelligence Foundry concept formalizes these capabilities into a coherent architectural unit.

## Decision

Introduce the Intelligence Foundry as a first-class primitive:

- A tenant-isolated, policy-defined environment for governed intelligence production
- Uniform provenance capture via deterministic execution graphs
- Evidence bundle sealing with signed attestations
- Policy gateway mediating all access to assets, models, and tools
- Support multiple Foundry types (creative, analysis, compliance, etc.) under one governance substrate

## Consequences

Positive:

- Establishes Summit as an infrastructure layer for trusted AI
- Enables regulated-market readiness via evidence portability
- Creates a coherent abstraction for product and platform evolution

Costs:

- Requires upfront investment in deterministic graph serialization and evidence bundle standards
- Tool mediation and policy gateways add engineering complexity but are foundational to moat

## Follow-ups

- Define canonical schemas for work orders, execution graphs, and evidence bundles
- Implement policy gateway and evidence sealing MVP
- Create first Foundry implementation (Creative or Compliance) to validate end-to-end contracts
