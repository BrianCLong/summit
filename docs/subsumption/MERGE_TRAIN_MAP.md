# Subsumption Program Merge Train Map

## Purpose
This document defines the canonical dependency graph and merge lanes for PR-01 through PR-32.

## Rules
1. Merge strictly by dependency, not by issue age.
2. One concern per PR.
3. No PR may widen scope beyond its declared files and gates.
4. UI PRs may proceed in parallel only after underlying schemas/artifacts stabilize.
5. Any PR blocked on an unmerged dependency must rebase on the feature branch of that dependency, not duplicate logic.

---

## Lane A — Core Artifact Foundations
These are hard blockers for most downstream work.

- PR-01 → PR-02 → PR-03 → PR-04
- PR-01 → PR-05 → PR-06 → PR-10
- PR-01 → PR-07
- PR-01 → PR-08
- PR-03 + PR-07 + PR-08 → PR-09
- PR-06 + PR-07 → PR-10

### Meaning
- PR-01 is the global root.
- PR-02/03/05/07/08 can start immediately after PR-01.
- PR-09 waits for runtime, evidence, and ontology primitives.
- PR-10 waits for case export and signing.

---

## Lane B — Switchboard Connector Layer
Depends on artifact primitives but can run in parallel after PR-01/02 baseline.

- PR-01 + PR-02 → PR-11
- PR-11 → PR-12
- PR-11 + PR-12 → PR-13
- PR-11 + PR-12 → PR-14
- PR-13 → PR-15
- PR-14 → PR-16
- PR-11 + PR-12 + PR-13 → PR-17
- PR-11 + PR-12 + PR-13 + PR-14 → PR-18

### Meaning
- PR-11 is the root of connector work.
- PR-15/16 are pure enforcement gates and should not land before their producer PRs.

---

## Lane C — Maestro + GraphRAG
Requires schemas + artifact conventions first.

- PR-01 + PR-02 + PR-03 → PR-19
- PR-19 → PR-20
- PR-20 → PR-21
- PR-19 + PR-20 + PR-21 → PR-22
- PR-01 + PR-02 + PR-08 → PR-23
- PR-23 → PR-24
- PR-23 + PR-24 → PR-25
- PR-24 + PR-25 → PR-26

### Meaning
- Planner precedes executor, executor precedes verifier.
- GraphRAG retrieval precedes evidence-path extraction.
- Traceability gate lands only after real outputs exist.

---

## Lane D — UX / Action / Platform
Can begin once artifact formats are stable enough to render.

- PR-03 + PR-05 + PR-07 → PR-27
- PR-05 + PR-06 + PR-07 → PR-28
- PR-19 + PR-20 + PR-21 + PR-22 → PR-29
- PR-01 + PR-03 + PR-07 → PR-30
- PR-30 → PR-31
- PR-03 + PR-05 + PR-07 + PR-30 → PR-32

### Meaning
- UI must consume stabilized artifacts, not invent new formats.
- Action gates must follow action schemas.
- Audit/RBAC should link to existing run/case/action identifiers.

---

## Merge Waves

### Wave 0
- PR-01

### Wave 1
- PR-02
- PR-05
- PR-07
- PR-08
- PR-11

### Wave 2
- PR-03
- PR-06
- PR-12
- PR-19
- PR-23

### Wave 3
- PR-04
- PR-09
- PR-10
- PR-13
- PR-14
- PR-20
- PR-24
- PR-30

### Wave 4
- PR-15
- PR-16
- PR-17
- PR-18
- PR-21
- PR-22
- PR-25
- PR-27
- PR-28
- PR-31

### Wave 5
- PR-26
- PR-29
- PR-32

---

## Recommended Agent Allocation

### Jules
Best for:
- PR-01 → PR-10
- PR-30 → PR-32

### Antigravity
Best for:
- PR-11 → PR-18

### Codex
Best for:
- PR-19 → PR-26

### Copilot Agents
Best for:
- fixture generation
- path-limited follow-up patches
- docs alignment
- gate repair PRs

---

## Backlog Safety Rules
1. Never enqueue two PRs that write the same schema file simultaneously.
2. Never enqueue UI PRs against unstable artifact paths.
3. Any PR touching `.github/workflows/*` must declare exactly which existing gate it modifies.
4. Any PR that adds a new gate must also add a minimal passing fixture.
5. Rebase-only PRs stay in a separate queue label: `queue:rebase-only`.

---

## Labels
Recommended labels:
- `subsumption`
- `subsumption:phase-1`
- `subsumption:phase-2`
- `subsumption:phase-3`
- `subsumption:phase-4`
- `queue:merge-now`
- `queue:needs-rebase`
- `queue:blocked`
- `queue:depends-on`
- `agent:jules`
- `agent:antigravity`
- `agent:codex`
- `agent:copilot`

---

## Completion Condition
The merge train is complete when:
- PR-01 through PR-32 are merged
- all declared gates are active in CI
- one end-to-end deterministic fixture passes:
  connector ingest → graph build → agent plan/execution/verification → GraphRAG response with evidence paths → case export → signature verify → replay
