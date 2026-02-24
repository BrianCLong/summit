# SUMMIT — Competitive Intelligence Subsumption Engine v4 (CISEv4)

Target: [COMPETITOR / PLATFORM / REPO / PRODUCT]
Scope: [DOCS | OSS REPO | BLOGS | TALKS | PAPERS | APIS | ALL PUBLIC]
Date: [YYYY-MM-DD]
Summit branch: [branch-name]
Non-negotiables: Determinism, evidence-first, minimal blast radius, zero proprietary copying.

## PRIME DIRECTIVE
Convert public competitive signals into a mergeable PR stack for Summit:
1) Harvest (capabilities + patterns + threats + benchmarks)
2) Subsume (native modules/APIs/data model/workflows/ops/governance)
3) Surpass (novel capabilities + architectural leverage)
4) Moat & gate (defensible differentiators enforced by controls)

## LEGAL / ETHICAL / IP GUARDRAILS (HARD)
- Use only public information present in sources captured in this run.
- No proprietary code, no paywalled copying, no reverse engineering of closed binaries.
- For OSS: respect licenses; do not copy code. Re-implement concepts independently.
- Every claim must map to a captured source (URL + excerpt hash) OR be explicitly marked as inference.
- Anything not source-backed is labeled: (INFERENCE) or (PROPOSAL).

## REQUIRED OUTPUTS (STRICT)
A) docs/ci/[target_slug]/REPORT.md
B) docs/ci/[target_slug]/SOURCES.json (deterministic, sorted)
C) docs/ci/[target_slug]/CAPABILITY_MATRIX.md
D) docs/ci/[target_slug]/THREAT_MODEL.md
E) docs/ci/[target_slug]/INTEGRATION_PLAN.md
F) docs/ci/[target_slug]/EVAL_PLAN.md
G) PR_STACK_PLAN.md (stacked PRs with gates + acceptance tests)
H) If any code is proposed: implement at least one “MVP slice” behind a feature flag with tests.

## PHASE 0 — INPUT NORMALIZATION
1. Identify the “target surface”:
   - Product claims, architecture diagrams, API docs, user workflows, deployment model.
2. Capture sources:
   - Build SOURCES.json with fields:
     - id (stable), title, url, retrieved_at (date only), content_hash (sha256 of excerpt), license_hint, notes
   - Deterministic sorting: by url asc, then id asc.

## PHASE 1 — HARVEST (FACTS ONLY)
Produce CAPABILITY_MATRIX.md:
- Rows: capabilities (agent orchestration, KG schema, ingestion, ER, graph queries, vector/hybrid search, UI, connectors, RBAC/audit, evals, ops)
- Columns: {Target, Summit-now, Gap, Opportunity, Risk, Evidence(source_id)}
No “marketing” language; use testable statements.

Produce THREAT_MODEL.md:
- Attack surface: authn/authz, ingestion, connectors, prompts/tools, KG mutations, multitenancy, audit integrity
- Abuse cases: data poisoning, prompt injection, connector credential exfiltration, graph inference leakage
- Controls observed in target (source-backed), controls missing, controls Summit should add

## PHASE 2 — SUBSUME (SUMMIT FIT)
Produce INTEGRATION_PLAN.md with:
- Mapping to Summit modules:
  - agent spine impacts (registry/contracts/routing)
  - connector framework impacts (auth, rate limiting, provenance)
  - knowledge graph impacts (schema diff, migrations, constraints)
  - retrieval impacts (GraphRAG, hybrid search, caching)
- A minimal implementation slice:
  - feature flag name
  - public API shape (types)
  - data model additions (migrations)
  - tests and eval hooks

## PHASE 3 — SURPASS (NEW ADVANTAGE)
Produce 3 “surpass moves” that are:
- Measurable (latency, cost, accuracy, analyst time-to-insight)
- Enforceable (CI checks / policy gates)
- Hard to replicate (network effects, governance automation, eval harness)

Each surpass move must include:
- hypothesis
- design sketch
- eval metric
- failure mode & rollback plan

## PHASE 4 — MOAT & GATE (CONTROL POINTS)
Define moat gates as repository-enforced controls:
- Example categories:
  - provenance: source-cited transformations
  - integrity: append-only audit, tamper evidence
  - safety: prompt/tool sandboxing, connector least privilege
  - quality: eval thresholds, regression budgets
Write each as: Gate Name → What it prevents → How enforced → Evidence artifact

## PHASE 5 — PR STACK (MERGEABLE)
Write PR_STACK_PLAN.md with 3–7 PRs:
- PR title, scope, files changed, risk level, rollout strategy, acceptance tests
- Each PR must be independently mergeable and pass CI
- Deterministic artifacts only (stable sorting, no timestamps except stamp.json)

## STOP CONDITIONS
- If sources are insufficient, ship “docs-only” PR stack: SOURCES + matrices + plans + eval harness scaffolding.
- Do not fabricate. Mark unknowns explicitly.
