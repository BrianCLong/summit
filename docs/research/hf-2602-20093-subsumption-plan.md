# HF Paper 2602.20093 — Repo-Shaped Subsumption Plan (Scaffold)

## Summit Readiness Assertion

This plan is intentionally constrained to a governed, evidence-first scaffold pending paper ground-truth ingestion. Delivery remains deterministic, reversible, and CI-enforced once claims are populated.

## Status

- **Paper content state:** Deferred pending abstract/method/results excerpts.
- **Scope state:** Intentionally constrained to repo-validatable scaffolding.
- **Execution mode:** Evidence-first with claim registry and gate placeholders.

## 1) Executive Intent

**Goal:** Convert HF Paper `2602.20093` into a deterministic capability in Summit with policy gates, reproducibility checks, and operational artifacts.

**Outcome target:** A mergeable stack (up to 7 PRs) that:

1. Implements clean-room logic from paper claims.
2. Produces deterministic artifacts (`report.json`, `metrics.json`, `stamp.json`).
3. Maps paper claims to Summit evidence objects.
4. Adds CI enforcement and optional drift monitoring.
5. Keeps risky behavior default **OFF** with feature flags.

## 2) Ground-Truth Ingestion Contract

Populate this section with verbatim excerpts before code PRs.

- `ITEM:CLAIM-01` — _pending excerpt_
- `ITEM:CLAIM-02` — _pending excerpt_
- `ITEM:METHOD-01` — _pending excerpt_
- `ITEM:API-01` — _pending excerpt_
- `ITEM:RESULT-01` — _pending excerpt_

**Blocker:** No metric or performance claim can be asserted until corresponding excerpts are captured.

## 3) Claim Registry Mapping

| Summit element | Purpose | Backing |
| --- | --- | --- |
| `summit/items/<item-slug>/spec.md` | Formal spec derived from paper claims | `ITEM:CLAIM-*` |
| `summit/pipelines/<item-slug>.py` | Deterministic execution path | `ITEM:METHOD-*` |
| `tests/items/test_<item-slug>.py` | Repro assertions with tolerances | `ITEM:RESULT-*` |
| `docs/standards/<item-slug>.md` | Interop and standards mapping | Summit original |
| Drift monitor workflow | Regression watch | Summit original |

Unmapped entries must be labeled **Summit original**.

## 4) Scope Guardrails

- Max 5–7 PRs.
- No cross-cutting refactors.
- Feature flag default OFF.
- Deterministic output (no unstable timestamps in stamps).
- No licensing contamination.
- No expansion beyond paper scope.

## 5) Minimal Winning Slice

> Summit deterministically reproduces one primary quantitative paper claim with CI-enforced evidence output.

Required checks:

- `pytest -k test_<item-slug>` passes.
- `metrics.json` is within configured tolerance.
- `item-<slug>-repro` CI gate passes.
- EvidenceID format validation passes.

Required artifacts:

- `report.json`
- `metrics.json`
- `stamp.json` (content hash + deterministic metadata)

## 6) PR Stack (Conventional Commits)

1. `feat(items): scaffold <item-slug> spec and registry`
2. `feat(pipeline): deterministic runner for <item-slug>`
3. `test(items): reproduction + tolerance assertions`
4. `ci: add repro gate item-<slug>-repro`
5. `docs: standards + security + ops pack`
6. `feat(monitoring): drift detector` (optional)

## 7) Threat-Informed Requirements

| Threat | Mitigation | Gate | Test |
| --- | --- | --- | --- |
| Metric gaming | Fixed seed + dataset hash | Repro gate | Hash assertion |
| Data leakage | Explicit allowlist | Security lint | Leak fixture |
| Policy drift | Scheduled regression | Drift workflow | Delta threshold assertion |

Default-deny behavior is required for unsafe inputs and unapproved data classes.

## 8) MAESTRO Alignment

- **MAESTRO Layers:** Data, Agents, Tools, Observability, Security.
- **Threats Considered:** Prompt injection into retrieval/eval config, tool misuse, metric tampering, artifact forgery.
- **Mitigations:** Deterministic seeds, artifact hashing, policy-gated CI checks, evidence schema validation, explicit rollback path.

## 9) Performance + Cost Budgets (To be grounded)

- Latency budget: deferred pending excerpted benchmark context.
- Memory budget: deferred pending method/runtime details.
- Cost budget: offline reproducibility default; no paid external calls in CI.

## 10) Operational Readiness Pack

Runbook must include:

- Failure triage path.
- Metric regression response.
- Feature flag rollback steps.
- Post-merge accountability window and watched metrics.

## 11) Exit Criteria

- Ground-truth excerpts captured.
- Claim registry fully mapped.
- Repro gate green.
- Security/data-handling docs complete.
- Rollback tested and documented.

Final state is decisive: either mergeable with evidence, or deferred with explicit blockers.
