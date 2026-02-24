# Self-Evolving Agents Standards

## Overview
Summit implements "Controlled Self-Evolution" to allow agents to adapt their behavior and architecture within safe, governed boundaries.

## Taxonomy (ITEM:CLAIM-01)
Agents are organized by:
- **What** to evolve: Models, Memory, Tools, Architecture.
- **When** to evolve: Intra-task adaptation vs. Inter-task refinement.
- **How** to evolve: Optimization loops, Meta-cognition engines.

## Controlled Evolution (ITEM:CLAIM-08)
All mutations must be:
- **Bounded**: Maximum token changes, restricted operators.
- **Deterministic**: Producible and verifiable from fixed seeds.
- **Denied by Default**: Mutations only occur if explicitly allowed by policy.

## Interop Matrix
- **Imports**: Agent traces, tool logs, eval rubrics.
- **Exports**: `evidence.json`, `metrics.json`, `drift_report.json`.
