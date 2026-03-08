# Databricks Lakebase (PostgreSQL) — Summit Subsumption Bundle (v4+)

**ITEM**: InfoQ news analysis — Databricks announces Lakebase (PostgreSQL) (2026-02).  
**Source**: https://www.infoq.com/news/2026/02/databricks-lakebase-postgresql/  
**Relevance Target**: GA Q2 2026  
**Priority Claim**: OLTP + analytics convergence through a managed Postgres surface directly inside lakehouse workflows.

**Summit Context (Intentionally Constrained Defaults)**

- **GA milestone target**: `GA-GraphRAG-v1`.
- **Hard constraints**: no new infra services, no cross-region DB changes, no schema-breaking contracts.
- **Hard lines**: no mandatory managed SaaS dependency, no proprietary lock-in in core control plane.
- **Relevant modules**: `api/graphql`, `packages/graphrag`, `packages/connectors`, `agents/*`, `packages/policy`.
- **Required checks**: generated as `required_checks.todo.md` (below) pending repo-specific CI binding.

## A) MASTER PLAN (1.0–1.29)

1.0 Define threat model delta: vendor “HTAP narrative” pressure vs Summit deployable-first architecture.
1.1 Map capability taxonomy: transactional serving, analytical acceleration, semantic retrieval, policy-governed evidence.
1.2 Establish baseline: current Summit query paths (`api/graphql` + GraphRAG retrievers + connectors).
1.3 Build parity matrix against Lakebase claims (latency class, consistency model, operability burden, portability).
1.4 Freeze non-negotiables: lock-in avoidance and policy-as-code authority boundaries.
1.5 Draft architecture decision envelope for “OLTP + analytics convergence” with reversible toggles.
1.6 Specify adapter-first design: Postgres-compatible dialect abstraction behind connector boundary.
1.7 Define “Governed Exception” mechanism for managed Postgres acceleration only when policy and cost gates pass.
1.8 Create evidence budget contracts for mixed transactional/analytical query plans.
1.9 Add deterministic query requirements (`ORDER BY`, bounded traversals, explicit LIMITs).
1.10 Formalize split-read strategy: transactional path isolation from retrieval/analytics fan-out.
1.11 Define write-path ownership: immutable event-first ledger remains source of truth.
1.12 Add conflict policy: no direct user-prompt to DB query path; enforce IntentCompiler gate.
1.13 Stage migration simulator: replay production-like workloads into optional Postgres acceleration lane.
1.14 Add observability dimensions: p50/p95/p99 latency, plan drift, cache hit ratio, policy denial counts.
1.15 Introduce failure-domain controls: circuit breakers between OLTP plane and analytical workloads.
1.16 Add rollback criteria: automatic fallback to existing storage/query path on error-budget breach.
1.17 Encode policy checks in `packages/decision-policy` for versioned governance.
1.18 Produce economic model: cost/risk/velocity ledger entry for each convergence candidate.
1.19 Run red-team prompts for tool abuse and prompt-injection attempts on query compilation path.
1.20 Validate data portability: schema export/import and connector substitution drills.
1.21 Add compliance evidence pack template for CI artifact publication.
1.22 Define release gates by lane (Lane 1 core hardening, Lane 2 optional acceleration integration).
1.23 Execute canary in non-critical tenant slice with bounded workload classes.
1.24 Compare against baseline SLOs and governance completeness thresholds.
1.25 Decide keep/kill on acceleration lane using scored rubric (performance gain vs lock-in risk).
1.26 Publish Decision Record + rollback playbook with accountability window.
1.27 Prepare GA cut criteria for Q2 2026 target with explicit exceptions log.
1.28 Enforce cross-artifact terminology alignment (single authority files).
1.29 Close with final readiness assertion and no-open-threads signoff.

## B) FIVE SUB-AGENT PROMPTS (A–E)

### Prompt A — Architecture & Capability Parity Agent

Goal: produce a claim-vs-capability matrix for Lakebase-style convergence.

- Input: source article + Summit architecture docs.
- Output: parity table, risk tags, portability scorecard.
- Constraints: cite authority files only; no opinion-only claims.
- Acceptance: each claim mapped to current state, target state, and reversible option.

### Prompt B — Data Plane & Query Determinism Agent

Goal: specify deterministic mixed workload query patterns.

- Input: GraphRAG retrieval flows, IntentCompiler rules, DB adapters.
- Output: query contract updates, determinism checklist, bounded traversal enforcement.
- Constraints: every path must have LIMIT + ORDER semantics.
- Acceptance: verification script plan and regression matrix.

### Prompt C — Governance/Policy-as-Code Agent

Goal: encode convergence decisions in versioned policy.

- Input: governance mandates + allowed exception framework.
- Output: policy diffs, exception template, evidence requirements.
- Constraints: no control weakening; no out-of-band compliance logic.
- Acceptance: machine-validated policy gates and rollback triggers.

### Prompt D — Reliability/Observability Agent

Goal: design runtime safeguards for HTAP-like pressure.

- Input: current telemetry, SLOs, deployment topology.
- Output: alert specs, circuit-breaker rules, canary rubric.
- Constraints: preserve confidentiality/integrity/safety under adversarial conditions.
- Acceptance: measurable improvement plan with failure-mode coverage.

### Prompt E — Delivery & PR Stack Agent

Goal: deliver patch-first PR stack (max 7 PRs) with lane separation.

- Input: outputs from A–D.
- Output: PR sequence, dependency DAG, evidence artifact checklist.
- Constraints: Lane 1 (hardening) must be independently shippable; Lane 2 optional.
- Acceptance: each PR includes rationale, confidence, rollback, accountability window.

## C) CONVERGENCE PROTOCOL

1. **Ingest & Normalize**: convert source claims into canonical capability statements.
2. **Lane Split**:
   - **Lane 1 (Core)**: determinism, governance gates, observability, rollback automation.
   - **Lane 2 (Optional Acceleration)**: Postgres-compatible convergence adapters and canary trials.
3. **Evidence-First Loop**: each change emits objective metrics before narrative conclusions.
4. **Decision Cadence**: daily convergence check with keep/kill thresholds.
5. **Conflict Resolution**: policy engine is authoritative; architecture council only handles undecidable policy gaps.
6. **Security Posture**: assume prompt injection/tool abuse; apply least privilege and execution boundaries.
7. **PR Limits**: total PR count ≤ 7, with strict dependency ordering and reversible merges.
8. **Exit Criteria**: GA target met only if SLO parity/improvement and governance evidence completeness are both true.

## D) BUNDLE MANIFEST + CI VERIFIER SPEC

### Bundle Manifest

- `bundle/item.md` — normalized item description + prioritized claim.
- `bundle/master-plan.md` — steps 1.0–1.29.
- `bundle/prompts/agent-A.md` … `agent-E.md` — sub-agent prompt cards.
- `bundle/convergence-protocol.md` — lane orchestration and gates.
- `bundle/required_checks.todo.md` — required check names until bound to CI.
- `bundle/evidence/` — metrics snapshots, policy evaluation outputs, rollback drill results.
- `bundle/decision-record.md` — rationale, confidence score, tradeoffs, accountability window.

### `required_checks.todo.md` seed

- `lint`
- `typecheck`
- `test`
- `policy-gate`
- `query-determinism-verify`
- `smoke`
- `artifact-integrity`

### CI Verifier Specification

- Validate required files exist and are non-empty.
- Validate PR count ≤ 7 and lane tagging present (`lane:1` or `lane:2`).
- Validate every PR includes: rationale, confidence (0–1), rollback triggers, accountability window.
- Validate policy diffs are versioned and pass policy test suite.
- Validate evidence bundle includes latency, error budget, and governance completeness metrics.
- Block merge if portability score is missing or lock-in exceptions lack approved governance record.
- Emit final readiness status: `PASS`, `DEFERRED_PENDING_EVIDENCE`, or `FAIL`.

**Finality Statement**: This bundle constrains execution to reversible, policy-governed convergence and closes with explicit GA decision gates.
