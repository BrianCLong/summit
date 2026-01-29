# Agent Runtime Semantics & Lifecycle

**Status:** Draft
**Owner:** Jules
**Version:** 1.0.0

## 1. Overview
The Summit Agent Runtime treats agents as long-lived, stateful processes rather than transient script executions. This document defines the lifecycle states and transitions for autonomous agents.

## 2. The Agent Lifecycle State Machine

An agent run (execution unit) can exist in the following states:

| State | Description | Transitions To |
|-------|-------------|----------------|
| `PLANNING` | Analyzing goal and generating tasks | `PLANNED`, `FAILED` |
| `PLANNED` | Tasks generated, ready for execution | `APPLYING`, `PAUSED` |
| `APPLYING` | Actively executing tasks | `COMPLETED`, `FAILED`, `PAUSED`, `KILLED` |
| `PAUSED` | Execution suspended; state preserved | `APPLYING` (Resume), `KILLED` |
| `COMPLETED` | All tasks succeeded | Final State |
| `FAILED` | Critical failure or policy block | Final State |
| `KILLED` | Forcefully terminated by operator/governance | Final State |

## 3. Interruptibility & Preemption

### Pause (Interrupt)
- **Trigger:** Manual operator action, Budget warning, Governance gate.
- **Mechanism:**
  - The orchestrator checks the `status` flag before starting the next task.
  - Currently running tasks are allowed to complete (graceful pause) or interrupted if `force=true`.
  - State is persisted to Postgres.

### Resume
- **Trigger:** Operator approval, Budget increase.
- **Mechanism:**
  - Orchestrator picks up the run from the last completed task.
  - Context is reloaded.

### Kill (Preempt)
- **Trigger:** Security violation, "Red Button", Runaway cost.
- **Mechanism:**
  - Immediate cessation of new task scheduling.
  - Active tasks are cancelled (if possible via `AbortController` or similar).
  - Status set to `KILLED`.

## 4. Deterministic Replay
All state transitions and task outcomes are logged to the `Provenance Ledger`. Replay is achieved by:
1. Loading the `RunConfig` and initial seed.
2. Re-executing logic while mocking external tool calls with recorded outputs (if `replay=true`).

## 5. Resource Isolation
Each run is bounded by:
- **Token Budget:** Max tokens for LLM calls.
- **USD Budget:** Hard cap on estimated spend.
- **Time Budget:** Max wall-clock duration.
