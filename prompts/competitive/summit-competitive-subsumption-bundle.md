# SUMMIT — COMPETITIVE SUBSUMPTION & TRANSCENDENCE BUNDLE v1
Target: [COMPETITOR_OR_PROJECT_URL]
Summit repo: https://github.com/BrianCLong/summit/
Invocation mode: Evidence-first, patch-first, minimal blast radius, deterministic outputs.

## 0) Non-Negotiables (IP / Integrity / Determinism)
- Use ONLY public information present at the target URL(s) and their linked public docs/issues/releases.
- NO copying of code. NO reproducing large verbatim text. Prefer paraphrase + concept extraction.
- Respect licenses: identify license(s) and classify what is safe to reuse (ideas/patterns) vs. what requires attribution or cannot be imported.
- Produce deterministic artifacts:
  - Stable ordering (alphabetical where applicable)
  - No timestamps in deterministic files (runtime metadata goes in stamp.json if needed)
  - Pin versions for any tooling recommendations (actions, deps).
- Security: do not propose malware, credential theft, or intrusive scraping beyond terms/robots. Keep OSINT ethical.

## 1) Mission (STRICT ORDER)
1. Harvest: extract value (capabilities, patterns, benchmarks, threats, lessons).
2. Subsume: integrate into Summit natively (modules/APIs/data model/workflows/ops/governance).
3. Surpass: introduce architectural and product leaps that materially outperform.
4. Moat & gate: build defensible differentiation + hard control points + assurance.

## 2) Inputs (Required)
- Target URL(s): [list]
- Target category: (choose) {OSINT tool, graph platform, agent framework, RAG system, connector ecosystem, observability, infra}
- Summit constraints:
  - Stack: Node.js + Postgres + Redis + Qdrant + Knowledge Graph (Neo4j/graph layer)
  - Multi-agent orchestration + governance/evidence bundles
  - CI/CD uses GitHub Actions and branch protection
- Hard limits:
  - Time budget: [N hours] (if unknown, assume 6h)
  - PR limit: <= 5 PRs in stack
  - Each PR: <= 400 LOC net new unless unavoidable

## 3) Phase A — Public-Surface Extraction (Deterministic)
Deliverable: `docs/competitive/<target_slug>/A_public_surface.md`

A1. System map (from public docs):
- Components, boundaries, deployment model, extension points
- Data stores, queues, caches, indexes (if stated)
- API surfaces, SDKs, plugin architectures, connectors
- Observability/security posture (as documented)
- Release model, versioning, and changelog rhythms

A2. Interface inventory:
- CLI commands
- HTTP/gRPC endpoints (if documented)
- SDK entrypoints and configuration model
- Eventing hooks / webhooks
- Data formats (schemas, contracts)

A3. Behavior & workflows:
- User journeys (ingest → enrich → analyze → export)
- Failure modes and resiliency posture (as stated)
- Scaling and performance claims (capture exact numbers if present; otherwise label as “claim”)

A4. Evidence log:
- For each extracted claim, include:
  - Source URL
  - Section heading
  - Confidence {high/med/low}
  - Notes

## 4) Phase B — Pattern Distillation (No Code Copy)
Deliverable: `docs/competitive/<target_slug>/B_patterns.md`

For each domain, produce:
- “Pattern card” format (stable ordering):
  - Name
  - Problem solved
  - Public evidence (links)
  - Why it works
  - Summit mapping (where it would live)
  - Implementation sketch (original, not derivative)
  - Risks / tradeoffs
  - Test strategy
Domains:
- Architecture & services decomposition
- Data engineering & pipelines
- Knowledge graph modeling & entity resolution
- RAG / retrieval strategy
- Agent orchestration & prompt systems
- UX workflows / DX ergonomics
- Ops: deploy, observe, secure, release

## 5) Phase C — Summit Integration Plan (PR-stack Oriented)
Deliverable: `docs/competitive/<target_slug>/C_integration_plan.md`

C1. Gap & synergy matrix:
- Target capability → Summit current state → delta → ROI → risk

C2. PR stack plan (<= 5 PRs):
Each PR must include:
- Scope (files/modules)
- Net new LOC estimate
- Backward compatibility notes
- Required checks & gates
- Evidence artifacts produced

C3. “Stop conditions”:
- If license risk is non-trivial
- If feature duplicates existing Summit capability without measurable gain
- If it expands blast radius beyond constraints

## 6) Phase D — Transcendence (Benchmarkable Outperformance)
Deliverable: `docs/competitive/<target_slug>/D_transcendence.md`

D1. 10x candidates (must be measurable):
- Latency, throughput, recall@k, cost/query, time-to-first-insight, connector build time, etc.

D2. Summit-only advantages (use our strengths):
- GraphRAG + provenance + multi-agent governance
- Connector SDK + evidence bundles
- Deterministic CI gates

D3. Innovations to ship (≥ 10) that are hard to replicate:
Examples (select only those that map cleanly to Summit):
- Policy-enforced agent actions with audit trails
- Provenance-first retrieval (citation and lineage per node/edge)
- Graph consistency validators (graph↔relational parity checks)
- Multi-model arbitration with cost/quality routing
- Declarative connector manifests with test harness + replay
Each must include:
- What it is
- Why competitor can’t easily copy
- How we implement (module + API)
- How we verify (tests + metrics)

## 7) Phase E — Moat & Gates (Controls as Product)
Deliverable: `docs/competitive/<target_slug>/E_moat_gates.md`

E1. Gates (enforced in CI):
- Supply chain integrity (pinned actions, SBOM, provenance attestations)
- Branch protection verification (machine-checked)
- Deterministic evidence bundle generation & validation
- Security scanning + secret detection + dependency policy

E2. Moats (defensible differentiators):
- Data network effects: graph enrichment loops (privacy-safe)
- Workflow lock-in: connector ecosystem + marketplace-ready manifests
- Performance moat: benchmark suite + published targets
- Enterprise moat: RBAC, audit, compliance mapping

E3. “Assurance artifacts”:
- Evidence index, control mapping, benchmark reports

## 8) Required Output Artifacts (File Tree)
Create/update ONLY within:
- `docs/competitive/<target_slug>/`
- `docs/ga/evidence_map.yml` (if needed)
- `scripts/ci/` (only if adding gates)
- `.github/workflows/` (only if required for gates)

Artifacts:
- A_public_surface.md
- B_patterns.md
- C_integration_plan.md
- D_transcendence.md
- E_moat_gates.md
- `manifest.json` (deterministic): extracted_sources[], pattern_cards[], planned_prs[], gates[], metrics[]
- `stamp.json` (runtime-only metadata; may include timestamps)

## 9) Completion Criteria
- Every major claim has a source link + confidence label.
- At least 5 high-leverage pattern cards are produced.
- PR-stack plan is mergeable and within constraints.
- At least 3 gates are concretely specified (even if not implemented yet).
- At least 3 benchmark metrics are defined with measurement approach.

## 10) Safety / Legality Checklist (Must Pass)
- No proprietary text/code copied.
- License(s) identified; reuse plan compliant.
- No scraping that violates terms/robots.
- No intrusive or unethical OSINT.

END.

---

## Optional: “Fast Mode” Addendum (when you want velocity)

If you want this to run as a tight sprint driver, add this at the bottom of the prompt:

* **Timebox**: 90 minutes.
* **Minimum ship**: produce A/B/C + manifest.json; D/E may be outlines but must include measurable metrics/gates.
* **No PRs in fast mode**—only plans + file scaffolding.
