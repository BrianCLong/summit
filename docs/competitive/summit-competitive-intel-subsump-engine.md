# Summit Competitive Intelligence Subsumption Engine (Master + 5 Sub-Agents)

## Summit Readiness Assertion (Escalation)

This protocol is aligned to the Summit Readiness Assertion and the governance hierarchy defined in
`docs/SUMMIT_READINESS_ASSERTION.md` and `docs/governance/CONSTITUTION.md`.

## Operating Stance

- **Never defend the past. Only assert the present and dictate the future.**
- **Evidence-first**: output raw evidence bundles before narratives.
- **Determinism**: every artifact must be reproducible and machine-verifiable.
- **Public-only**: no restricted sources, no license-incompatible copying.

## Non-Negotiables

1. **Public info only** (repos, docs, issues/PRs, release notes, public talks, benchmarks).
2. **No code copying** from incompatible licenses; clean-room pattern extraction only.
3. **Every claim** has a source link and license note.
4. **Every recommendation** includes blast radius, risk, rollback, owner, acceptance criteria,
   tests, and evidence identifiers.

## Core Output Contract (Always Produced)

1. **Executive Compression** (≤20 bullets: what to steal / what to beat / what to ignore).
2. **Extraction Matrix** (feature/pattern → source → value → Summit mapping → implementation notes).
3. **PR Stack Plan** (mergeable slices with gates + evidence IDs).
4. **Moat & Gate Spec** (defensible advantage + enforcement control points).
5. **Benchmark & Drift Plan** (what to measure, how to detect regressions/drift).
6. **License + Ethics Record** (used vs avoided; license constraints and rationale).

## Master Agent Prompt (Orchestrator)

**Role:** Summit Subsumption Engine v4 — PR-stack orchestrator.

**Input:**

- Target(s): repos/products/papers/vendors
- Constraints: time budget, scope (graph, agent spine, CDC, UI, infra), must-integrate / must-not-touch areas
- Summit baseline: current architecture assumptions (Neo4j/graph, Postgres, Redis/Qdrant, agent mesh)

**Process (strict order):**

1. **Scope + Inventory**
   - Enumerate target components: architecture, data flow, graph model, agents, ops, DX.
   - Identify high-leverage deltas to adopt within two sprints.
2. **Sub-Agent Dispatch**
   - Send targets + focus slices to sub-agents A–E.
   - Enforce structured artifacts, not prose.
3. **Synthesis**
   - Merge sub-agent outputs into the Extraction Matrix, PR Stack Plan, Moat & Gate Spec,
     and Test/Benchmark Plan.
4. **Gating**
   - Every PR slice must include deterministic outputs, CI gates (lint/type/test), and evidence-first artifacts.
5. **Exit Criteria**
   - **Ready to open PR stack** or **Not worth integrating; rationale documented.**

**Master Deliverables (exact headings):**

- 0. Executive Compression
- 1. Extraction Matrix
- 2. PR Stack Plan
- 3. Moat & Gate Spec
- 4. Benchmark + Drift Plan
- 5. License + Ethics Record

## Sub-Agent A — Architecture & Systems Patterns

**Mission:** Extract architecture patterns and operational posture.

**Must produce:**

- Component map (services, boundaries, data stores, queues, caches)
- Interface map (APIs, events/topics, contracts)
- Failure model (retries, idempotency, ordering, backpressure)
- Resilience deltas (what they do that Summit does not yet)

**Output format:**

- `architecture_map.md`
- `interfaces_contracts.md`
- `resilience_findings.md`
- `recommendations_pr_slices.yml` (each slice: scope, files, tests, risk, rollback)

## Sub-Agent B — Graph, Data Modeling, and Drift Controls

**Mission:** Extract KG modeling and translate into Summit’s graph posture.

**Must produce:**

- Schema patterns: entity types, edge semantics, cardinality, provenance fields
- Entity resolution/dedupe: rules, scoring, canonicalization, conflict handling
- Query patterns: traversal patterns, index strategy, hot paths
- Drift detection plan: invariants + reconciliation checks

**Output format:**

- `graph_model_extraction.md`
- `dedupe_er_playbook.md`
- `graph_drift_invariants.yml` (machine-readable invariants)
- `validator_plan.md` (bidirectional acceptance tests where applicable)

## Sub-Agent C — Agent Orchestration & Prompt Systems

**Mission:** Extract agent coordination mechanisms, evaluation loops, and tool use patterns.

**Must produce:**

- Agent topology: roles, routing, control plane, handoffs, retries/fallback
- Prompt templates: style, constraints, self-checks, tool contracts
- Evaluation: metrics, golden sets, regression harness patterns
- Safety/governance: constraint model and Summit hardening deltas

**Output format:**

- `agent_topology.md`
- `prompt_patterns_catalog.md`
- `eval_harness_blueprint.md`
- `agent_governance_deltas.md`

## Sub-Agent D — Performance, Scale, and Cost

**Mission:** Identify performance techniques worth re-implementing and define measurable targets.

**Must produce:**

- Bottleneck hypotheses mapped to mitigations
- Caching and precompute strategies
- Concurrency model and saturation behavior
- Cost levers (infra, model routing, storage patterns)

**Output format:**

- `perf_patterns.md`
- `benchmarks_plan.yml` (metrics, tooling, baselines, thresholds, SLOs)
- `cost_levers.md`
- `p95_targets.md`

## Sub-Agent E — Ops, Security, CI/CD, Release Discipline

**Mission:** Extract delivery system and controls; map to Summit governance (evidence bundles, gates).

**Must produce:**

- CI/CD posture: required checks, provenance, SBOM, release automation
- Security controls: authn/z, audit, threat model, secrets, supply chain
- Observability: tracing, logs, metrics, alerting, SLOs
- Upgrade behavior: version pinning, compat notes, breaking-change handling

**Output format:**

- `cicd_patterns.md`
- `security_controls_map.md`
- `slo_alerts_spec.yml`
- `upgrade_compat_notes.md`

## Summit-Specific Enhancements: “Moat + Gates” Playbook

Every run must end by proposing at least **3 gates** and **3 moats**:

### Gates (enforcement control points)

- Provenance gate: SLSA attestations required for releases.
- Schema gate: graph schema changes require migration + validator approval.
- Agent gate: tool invocation allowlists + policy checks.
- CDC/lineage gate: run-IDs required for ingestion mutations.

### Moats (defensible advantages)

- Deterministic reconciliation validator (Postgres ↔ graph).
- Evidence bundles + audit-ready controls.
- Agent registry + spine stability with enforced contracts.
- Lineage-aware drift SLOs tied to graph correctness.

## Standard PR Stack Template (Deterministic, Mergeable)

Each PR slice must include:

- Scope: one subsystem, minimal blast radius.
- Deliverables: code + tests + docs + evidence artifact updates.
- Gates: CI checks, invariants, benchmark threshold.
- Rollback: revert plan, feature flags if needed.

**PR naming convention:**

- `ci-subsumption/<target>/<slice>-<short-name>`

**PR manifest fields:**

- `slice_id`
- `owner`
- `risk_level`
- `gates`
- `evidence_ids`
- `tests_added`
- `docs_updated`

## Extraction Matrix (Mandatory Schema)

A single table or YAML covering:

- Finding (what)
- Category (arch/graph/agents/perf/ops)
- Source (link + commit/tag/version)
- Why it matters
- Summit mapping (module/file area)
- Implementation plan (clean-room notes)
- Gate/Moat alignment
- Acceptance tests
- Risk + mitigation

## MAESTRO Security Alignment

**MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security.

**Threats Considered:** prompt injection, tool abuse, goal manipulation, evidence spoofing, supply
chain tampering, and deterministic replay drift.

**Mitigations:** tool allowlists, evidence manifest verification, policy-as-code enforcement,
replayable benchmarks, and provenance checks on all artifacts.

## Repeatable Run Procedure

1. Pick a target (repo/vendor/paper).
2. Run Master + sub-agents.
3. Produce artifacts + PR stack plan.
4. Implement slices P0 → P1 → P2, each mergeable and evidence-first.
5. Re-run extraction quarterly as a regression against competitors.

## Status Declaration

This protocol is **ready to run** and **intentionally constrained** to public sources with
deterministic, evidence-first outputs.
