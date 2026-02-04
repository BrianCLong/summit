# LongHorizon AI-Native Engineering Team for Summit + Maestro + Switchboard + IntelGraph

You are an autonomous senior staff engineer working in the BrianCLong/summit monorepo (and adjacent intelgraph/maestro/switchboard packages if they’re separate). Your mission is to implement a production-grade, long-horizon, AI-native engineering team capable of completing multi-hour/multi-day tasks reliably by treating long-horizon work as a systems + algorithms problem (not “one big prompt”).

## Why we’re doing this

- Single-agent runs degrade over long horizons; reliability requires orchestration + memory + evaluators + diversity of approaches.
- We want an AlphaEvolve-inspired loop: generate candidate code changes, evaluate them automatically, keep the best, continue iterating—but adapted to our governance, evidence, and multi-tenant constraints.
- The reference article explicitly calls out: MAP-Elites, Island Model Evolution, and Stateful Memory as core ingredients for long tasks.

## Non-negotiables

1. No direct commits to main. Create a feature branch.
2. Atomic PR: one coherent milestone PR only.
3. Integrate with existing Summit governance.
4. No heavy dependencies.
5. Determinism + auditability: every long-horizon run produces an evidence bundle.
6. Safe by default: multi-tenant isolation, policy gating, secrets hygiene, redaction in logs.

## Deliverable (this PR)

Implement a minimal but real “LongHorizon” system that can run a long task as an evolutionary, multi-agent program:

### A) Core orchestration (Maestro)

Create a new orchestration module (name suggestion: longhorizon/) that supports:

- Task DAG / Plan graph
- State checkpoints
- Role-based agents
- Tool routing via Switchboard
- Policy gates

### B) Stateful memory (IntelGraph)

Implement three memory layers:

1. Working memory
2. Episodic memory
3. Semantic memory

All memories must be content-addressed, queryable, redactable, and linkable to evidence artifacts.

### C) Quality-Diversity search (MAP-Elites) + Island Model

Implement a minimal candidate generation + archive system:

- MAP-Elites archive
- Island model with migration
- Candidates include patches + metadata + evals

### D) Automated evaluators (AlphaEvolve-style loop)

For each candidate patch:

- Run deterministic checks
- Run targeted tests
- Compute a score

Then accept into the archive if it improves the cell, select parents, and continue until budget/stop criteria.

## Additional innovations implied

Implement at least five:

1. Budgeted execution
2. Failure recovery
3. Self-critique ensemble
4. Patch minimization pass
5. Trust tiers
6. Counterfactual replays
7. Novelty pressure
8. Adaptive decomposition
9. Evidence-first UX

## Integration points

### Switchboard

Add a LongHorizon Tool Contract that standardizes tool name, args schema, permission tier, deterministic logging fields, and redaction hooks.

### Maestro

Add a maestro longhorizon run CLI that accepts prompt, repo scope constraints, budgets, evaluation profile, and resume token.

### IntelGraph

Add schemas/entities: Run, Step, Candidate, Evaluation, Patch, MemoryNode with edges between them.

## Acceptance Criteria

1. Longhorizon run can execute a real repo task end-to-end.
2. Evidence bundle directory created under `/artifacts`.
3. MAP-Elites archive populated with at least 5 candidates across 3 cells.
4. Island model runs multiple islands and migrates.
5. Automated tests validate archive insertion, checkpoint/resume, evaluator determinism.
6. Documentation added: architecture, how to run, safety model.

## Implementation Plan

### Phase 0 — Repo discovery

- Locate existing Maestro orchestration, Switchboard routing, IntelGraph schemas.
- Identify how we already store run logs and artifacts.

### Phase 1 — Minimal vertical slice

- Implement run lifecycle + evidence bundle + IntelGraph run record.
- Implement tool contract + Switchboard integration.
- Implement checkpointing.

### Phase 2 — QD search + islands

- Implement MAP-Elites archive and island queues.
- Implement migration.
- Implement candidate evaluation loop.

### Phase 3 — Finish + harden

- Add tests, docs, and a smoke-run example.
- Ensure deterministic outputs and redaction.

## Output required

1. A PR-ready branch with code changes.
2. A docs/longhorizon.md describing architecture + commands.
3. An examples/longhorizon/ folder with sample config and report.
4. A final summary: what you built, how to run it, what’s next.
