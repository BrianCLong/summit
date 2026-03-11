# CogWar Cognitive Pressure Mapping Engine (CPME-V1)

## Summit Readiness Assertion

This feature is readiness-aligned: deterministic, evidence-first, defensive-only, and gated behind
`COGWAR_INNOVATION`.

## What CPME-V1 Adds

CPME-V1 transforms raw indicators into a machine-selectable defensive response bundle:

1. Scores each indicator into a normalized **cognitive pressure** value.
2. Aggregates pressure by **narrative** and **channel** to produce a heatmap.
3. Synthesizes a cost-aware action portfolio under a fixed budget.
4. Injects the portfolio into warning output so operators receive ranked, bounded actions.

## Safety & Governance

- Feature flag gate: default OFF.
- Policy gate: requires `Intent.DEFENSIVE_IW` to pass.
- Defensive-only output contract: `defensive_only: true`.
- No offensive planning paths are exposed by this module.

## MAESTRO Security Alignment

- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats Considered**: Goal manipulation, prompt injection of malicious action requests, tool abuse
  toward offensive influence planning.
- **Mitigations**: Defensive intent enforcement, deterministic scoring, bounded budget, immutable
  schema contract in `schemas/cogwar/cognitive_pressure_map.schema.json`.
