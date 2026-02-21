# Summit Autonomous Cell Reference Architecture

## Objective

Define a production-ready, governance-aligned pattern for running a 24/7 autonomous multi-agent cell in Summit with deterministic, file-based orchestration.

This architecture intentionally prefers durable artifacts over opaque in-memory state to preserve auditability, replayability, and compliance evidence.

## Scope

Primary zone: `docs/`.

The pattern maps directly to Summit's governed execution model and can be implemented without introducing queue-first orchestration complexity in phase 1.

## Core Architecture Pattern

`Coordinator -> Specialist Agents -> Evidence Outputs`

1. The **Coordinator Agent** creates a run plan and issues task specs.
2. **Specialist Agents** (research, synthesis, packaging, quality gates) execute in isolated steps.
3. Each step writes deterministic artifacts to disk.
4. Scheduled triggers execute cells on fixed cadence.
5. Governance gates validate outputs before promotion.

## File-Based Orchestration Contract

All agent coordination occurs through immutable-on-write artifacts in a run folder:

```text
artifacts/agent-runs/<task_id>/
  00-task-spec.json
  01-research.md
  02-claims.json
  03-content-draft.md
  04-validation.json
  05-decision-log.json
  06-release-note.md
```

### Contract Rules

- Every run has a stable `task_id`.
- Every artifact is schema-constrained where possible (`*.json` with schema).
- Narrative files (`*.md`) must cite source artifacts.
- Validation output is mandatory before any publish step.
- Runs are append-only; corrections create new versions.

## Agent Roles for Summit Autonomous Cell

### 1) Chief of Staff (Coordinator)

- Builds the execution DAG from task spec.
- Assigns specialists and deadlines.
- Emits `00-task-spec.json`.

### 2) Research Specialist

- Collects evidence bundles.
- Emits `01-research.md` with source references.

### 3) Claims Normalizer

- Converts narrative findings into explicit claims.
- Emits `02-claims.json` for downstream deterministic use.

### 4) Content/Output Specialist

- Produces channel-specific output (briefing, post, memo).
- Emits `03-content-draft.md`.

### 5) Governance Validator

- Runs policy checks and quality gates.
- Emits `04-validation.json` with pass/fail and reasons.

### 6) Decision Recorder

- Logs rationale, confidence, rollback path, and monitoring window.
- Emits `05-decision-log.json`.

## Scheduling Model

Use cron-based cadence for reliability and bounded runtime:

- `06:00 UTC` morning intelligence cycle.
- `14:00 UTC` midday refresh cycle.
- `22:00 UTC` overnight synthesis cycle.

Each schedule creates a new `task_id` and a fresh artifact chain.

## Summit Mapping

## IntelGraph Alignment

- Evidence bundles become first-class outputs from research stages.
- Claims JSON can be ingested as typed graph assertions.
- Decision logs provide provenance and rollback trace.

## Maestro / Conductor Alignment

- Coordinator behavior maps to orchestration layer duties.
- Specialist role boundaries match lattice model role separation.
- Validation stage aligns with existing governance gates.

## Golden Path Alignment

- Scheduled runs reduce realtime orchestration fragility.
- Artifact-first flow improves reproducibility in CI and smoke checks.
- Deterministic outputs simplify policy-as-code enforcement.

## MAESTRO Threat Modeling Summary

- **MAESTRO Layers:** Agents, Tools, Observability, Security, Data.
- **Threats Considered:** Prompt injection, artifact tampering, role escalation, unverifiable outputs.
- **Mitigations:** Signed artifacts, schema validation, immutable run IDs, policy gate before publish, append-only decision logs.

## Tradeoff Matrix

| Option                        | Strength                         | Weakness                             | Summit Fit                                 |
| ----------------------------- | -------------------------------- | ------------------------------------ | ------------------------------------------ |
| File-based + Scheduler (this) | Simple, auditable, deterministic | Higher latency, less realtime        | Strong for governed intelligence workflows |
| Queue + Tool Router           | High throughput, reactive        | More operational overhead            | Good for later scale stage                 |
| Central Planner Framework     | Fast experimentation             | Hidden coupling, lower debuggability | Moderate under strict governance           |

## Phased Rollout

### Phase 1 (Now)

- Standardize artifact contract and folder structure.
- Implement scheduler-driven coordinator.
- Enforce validation artifact presence.

### Phase 2

- Add artifact signatures and integrity checks.
- Add confidence scoring and run quality metrics.
- Add automated replay harness for failed runs.

### Phase 3

- Hybrid mode: scheduler baseline + event-triggered boosts.
- Adaptive role staffing based on task class.
- Policy-driven cost/risk tuning.

## Definition of Done

A cell is production-ready when:

1. A full run emits all required artifacts in order.
2. Governance validation is machine-verifiable and blocking.
3. Rollback procedure is documented and tested.
4. Post-run metrics are captured for accountability window.
5. Replay from artifacts reproduces final output deterministically.

## Final Position

Summit's moat is not a single model invocation; it is governed, repeatable, role-specialized workflow execution with evidence as the system of record.

This reference architecture formalizes that position and provides an implementation path that is simple now, auditable by default, and extensible for higher-scale orchestration later.
