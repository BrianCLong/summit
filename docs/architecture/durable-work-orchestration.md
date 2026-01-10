# Durable Work Orchestration (Gastown-inspired, Summit-native)

**Authority:** Summit Readiness Assertion (`docs/SUMMIT_READINESS_ASSERTION.md`) and Governance Framework (`docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`). This design is aligned to policy-gated, auditable automation and is intentionally constrained until Tier A/B/C verification closes the loop.

## Mission

Deliver a durable, dependency-aware work graph that survives agent/session churn; provide persistent agent identity + hooks for resumption; track delivery via convoys; compile formulas into molecules; scale via planner/witness/refinery/deacon roles; and store ephemeral orchestration wisps separately from the durable ledger.

## Data Model (MVP)

### Core objects

- **Task**: durable unit of work with dependency edges, acceptance criteria, retry semantics, and audit lineage.
- **Convoy**: delivery bundle that rolls up progress across tasks and molecules.
- **AgentIdentity**: persistent identity, role, and capabilities for resumption and policy gating.
- **Hook**: per-agent work queue; agents must check on startup and resume.
- **Formula**: workflow template with variables and acceptance criteria.
- **Molecule**: compiled executable step-chain with explicit dependencies.
- **Event**: durable audit event for state changes and policy decisions.
- **RunDigest**: wisp summary that squashes ephemeral run events into durable insight.

### Relationships

- Tasks reference Convoy and Molecule/Step where applicable.
- Convoys aggregate Tasks and Molecules.
- Molecules are instantiated from Formulas and contain Steps.
- Hooks are owned by AgentIdentity and reference queued Tasks.
- Tenant scope is mandatory: every durable object is keyed by `tenant_id` to enforce governance and residency.

### IDs

- Deterministic IDs for durable objects via hash-based UUID v5-like format.
- Ephemeral IDs for wisps via random UUID.

## State Machines

### Task Status

`pending → ready → running → completed` (terminal) with off-ramps:

- `blocked` (dependency unresolved)
- `waiting` (policy/approval gate)
- `failed` (retry or terminal)
- `cancelled` (terminal)
- `paused` (resume required)

### Molecule/Step Status

Mirror task status with strict dependency gating: a step is `ready` only when all `depends_on` are `completed`.

### Convoy Status

`forming → in-progress → completed` with exceptions as governed states:

- `blocked` (governed exception due to dependency/capacity)
- `failed` (terminal)
- `cancelled` (terminal)

### Idempotency Strategy

- Every Task/Step carries a deterministic idempotency key.
- Mutating transitions are idempotent: applying the same transition with the same key yields the same persisted state.
- Cross-object updates are atomic at the repository layer (transaction boundary is mandatory).

### Retry Semantics

- Hard caps on attempts with exponential backoff per policy.
- Retry eligibility is derived from status + policy gate checks.
- When attempts exhausted, status transitions to `failed` and the Witness patrol raises a governed exception.

## Interfaces

### API/SDK (server-side)

- `POST /work/tasks` / `GET /work/tasks/:id` / `PATCH /work/tasks/:id` / `POST /work/tasks/:id/dependencies`
- `POST /work/convoys` / `GET /work/convoys/:id` / `GET /work/convoys/:id/status`
- `POST /work/hooks` / `POST /work/hooks/:id/assign` / `POST /work/hooks/:id/claim` / `POST /work/hooks/:id/requeue`
- `POST /work/formulas` / `POST /work/formulas/:id/compile`
- `POST /work/molecules/:id/next` / `POST /work/molecules/:id/step/:stepId/close`
- `GET /work/dashboard` (convoys + active hooks + recent events)

All endpoints are gated by the `durable-work-orchestration` feature flag with safe defaults off.

### CLI (summitctl)

- `summit work task create|list|update|close`
- `summit work convoy create|list|status`
- `summit work hook claim|assign|requeue|unassign`
- `summit work formula create|compile`
- `summit work molecule next|close-step|resume`

## Observability

- **Event stream**: durable events for every state transition, policy gate, and retry decision.
- **Metrics**: queue depth, lead time, retry counts, convoy completion time, stuck duration, merge queue wait time.
- **Audit log shape**: `actor_agent_id`, `policy_decision_id`, `convoy_id`, `task_id`, `molecule_id`, `wisp_id`.

## Patrols (Orchestration Roles)

### Mayor (Planner/Dispatcher)

- Creates convoys, compiles formulas into molecules, assigns initial hooks.

### Witness (Monitor)

- Detects stuck/failed tasks, nudges or reassigns within policy. Raises governed exceptions when thresholds exceed limits.

### Refinery (Merge Queue)

- Serializes merges, rebases, waits for CI, and escalates on conflict.

### Deacon (Heartbeat/Daemon)

- Periodic patrols to wake hooks, refresh heartbeats, and confirm resumability.

## Wisps (Ephemeral Runs)

- Wisps capture transient orchestration logs.
- Durable ledger stores only `RunDigest` summaries.
- Optional squashing strategy: digest every N events or on completion.

## Risk Register & Mitigations

1. **Merge conflicts in serialized queue** → Refinery enforces single-merge lock + rebase loop with capped retries.
2. **CI flakiness** → exponential backoff and policy-gated re-run limits; failures logged as governed exceptions.
3. **Runaway agents** → hard caps on retries, timeouts, and hook queue depth; Deacon enforces patrol budget.
4. **Partial failure** → idempotent transitions + task-level resume pointer; Witness escalates within SLA.
5. **Policy drift** → mandatory OPA evaluation on every mutating action; decisions captured in audit events.

## MVP Demo Snippet (PR1)

```bash
# Create a convoy from a formula (template-only in PR1)
summit work convoy create --name "durable-work-mvp" --formula durable-work-base

# Agent checks hook and resumes
summit work hook claim --agent summit-agent-01
```

## Future Extensions (Intentionally Constrained)

- Neo4j mirror for dependency traversal is deferred pending latency budgets and schema harmonization.
- Auto-merge and rebase automation requires Tier A/B/C verification before activation.

## MVP Demo Snippet (PR2)

```bash
# Create a convoy, task, hook, and assign/claim the task
curl -X POST /api/work/convoys -d '{"name":"durable-work-mvp"}'
curl -X POST /api/work/tasks -d '{"convoyId":"<convoy-id>","acceptanceCriteria":["step complete"]}'
curl -X POST /api/work/hooks/<hook-id>/assign -d '{"taskId":"<task-id>"}'
curl -X POST /api/work/hooks/<hook-id>/claim
```
