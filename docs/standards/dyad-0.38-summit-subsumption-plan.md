# Dyad v0.38.0 → Summit Subsumption Plan

## Executive position

Dyad v0.38.0 validates a strong market pattern: **agents are more reliable when they must plan before execution and retain persistent task state across turns**. Summit should subsume this pattern as a governed, deterministic capability: **Preflight Planning + Persistent Todo Ledger** for auditable agent operations.

This plan is intentionally constrained to a minimal, reversible, default-off rollout.

## Ground-truth claim mapping

| ITEM Claim | Summit Interpretation |
| --- | --- |
| Planning questionnaire in agent mode | Add mandatory preflight planning questionnaire before execution |
| Persistent todos in chat | Add durable todo ledger persisted across agent steps/runs |
| Improved attachments + media preview | Add attachment ingestion + hashing + evidence IDs |
| New models introduced | Expand model catalog/routing definitions with governance controls |
| Reliability focus | Treat as orchestration hardening with deterministic artifacts |

## Repo-validated alignment

- Agent runtime surfaces exist in `agents/orchestrator`, `agents/executor`, and `agents/runner`.
- Existing artifact conventions exist in `artifacts/agent-runs/*.json`.
- CI quality gate workflow exists in `.github/workflows/pr-quality-gate.yml`.
- Model catalog/routing already exists (`agents/orchestrator/src/daao/routing/modelCatalog.ts`).

## Minimal Winning Slice (MWS)

Deliver a deterministic planning gate and todo ledger behind a feature flag.

### Feature flag

- `SUMMIT_AGENT_PLANNING=0` by default.

### Scope constraints

- Max stack depth: 6 small PRs.
- No broad refactor.
- Deterministic JSON artifacts only.
- One primary execution zone first (`agents/orchestrator` + direct runner integration).

## Proposed PR stack

### PR1 — Planning schema

- Add planning schema and docs.
- Candidate files:
  - `agents/planning/schema.py`
  - `docs/standards/agent_planning.md`
- Artifact:
  - `artifacts/run_plan.json`

### PR2 — Planning gate

- Require validated planning payload before execution path proceeds.
- Candidate files:
  - `agents/planning/questionnaire.py`
  - `agents/planning/validator.py`
- CI gate extension:
  - `check_agent_plan`

### PR3 — Persistent todo ledger

- Create durable todo ledger read/write API.
- Candidate files:
  - `agents/todos/ledger.py`
  - `agents/todos/persistence.py`
- Artifact:
  - `artifacts/todos.json`

### PR4 — Attachment ingestion hardening

- Ingest text/media attachments, hash payloads, emit evidence references.
- Candidate file:
  - `agents/io/attachments.py`

### PR5 — Model catalog expansion

- Add gated support for additional models through existing Summit model catalog surfaces.
- Candidate file (preferred existing surface):
  - `agents/orchestrator/src/daao/routing/modelCatalog.ts`

### PR6 — Telemetry + drift monitoring

- Add artifact and drift checks for plan/todo compliance.
- Candidate files:
  - `scripts/monitoring/agent-planning-drift.py`
  - `metrics/planning_adoption.json`

## Acceptance tests (MWS)

1. Agent run is blocked when planning answers are absent.
   - `scripts/test_planning_gate.py`
2. Todos persist across execution steps.
   - `tests/agent/test_todo_persistence.py`
3. Deterministic artifacts exist after compliant run.
   - `artifacts/run_plan.json`
   - `artifacts/todos.json`

## Threat-informed controls

| Threat | Mitigation | Gate |
| --- | --- | --- |
| Agent executes without plan | Mandatory preflight validator | `check_agent_plan` |
| Todos lost across steps | Persistent ledger + write-through persistence | `test_todo_persistence` |
| Malicious attachment input | Content hashing + bounded parsing + validation | `test_attachment_injection` |

## Performance budgets

- Planning validation latency: `<200ms`
- Todo persistence operation: `<50ms`
- Combined planning/todo artifact payload: `<50KB`

## Data handling and retention

- Never log keys, raw secrets, or oversized attachments.
- Reject/trim attachment payloads over 1MB from planning-context artifacts.
- Retention target: 30 days for planning/todo artifacts unless overridden by governance policy.

## MAESTRO alignment

- **MAESTRO Layers:** Agents, Tools, Observability, Security, Data.
- **Threats Considered:** Prompt injection via attachments, tool abuse, missing preconditions, state desynchronization.
- **Mitigations:** Schema validation, deterministic artifact checks, hash-based evidence IDs, explicit feature flag rollout, drift detector.

## Operational readiness

Runbook target:

- `docs/ops/runbooks/agent-planning.md`

Initial SLO target:

- 99.9% planning gate pass rate for valid jobs.

## Rollout order

1. Experimental agents only.
2. One orchestrated pipeline in production shadow mode.
3. Progressive expansion to all eligible pipelines.

## Final directive

Summit should operationalize Dyad’s planning/todo workflow concept as a governed, deterministic subsystem so that every agent run is reproducible, auditable, and CI-verifiable.
