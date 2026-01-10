# Maltego — TCGI: Transform Graph Grammar Induction for Auto-Macros

## Overview

TCGI learns a graph grammar from analyst transform sessions and synthesizes
policy-safe macros optimized for batching and caching.

## Architecture

- **Session Collector**: ingest transform session traces.
- **Grammar Inducer**: mine frequent subgraphs into production rules.
- **Macro Synthesizer**: generate candidate macros per objective.
- **Policy Filter**: enforce license and policy constraints.
- **Optimizer**: batch or cache operations for cost control.

## Data Contracts

- `session_trace`
- `grammar_rules`
- `macro_artifact` (graph, justification, replay token)

## Metrics

- Macro yield improvement.
- Cost savings from batching.
- Policy constraint violation rate (target 0).
