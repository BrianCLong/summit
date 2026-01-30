# Competitive Intelligence Subsumption & Transcendence Protocol — Summit Edition (v1.1)

## Scope

Applies to any competitor product/repo/docs/videos/blogs/demos that are **publicly accessible**. Targets include OSINT platforms, agent orchestration stacks, graph analytics, RAG/GraphRAG, and investigation UIs.

## Prime Directive

**Harvest → Subsume → Surpass → Moat+Gate** with:

* **Evidence-first** outputs
* **Patch-first** integration
* **Deterministic artifacts** (stable ordering, no timestamps, reproducible summaries)
* **License + attribution compliance**
* **No copying of non-trivial code or proprietary text**

---

## 0) Guardrails (Non-Negotiables)

### Allowed inputs

* Public web pages, public repos, published papers, public videos, public documentation, public pricing pages.

### Disallowed actions

* No credentialed access, no scraping behind auth/paywalls without explicit permission.
* No copying non-trivial code, prompts, or proprietary datasets.
* No “clone UI pixel-perfect” reproduction from closed-source products.

### Required outputs for every claim

* **Claim → Evidence pointer → Confidence level**
* Evidence pointer must be a stable URL + section name (or repo file path + line range).

### License handling

* Detect license type and declare whether we can:

  * **Adopt** (compatible)
  * **Adapt conceptually** (re-implement)
  * **Do not use** (incompatible/restricted)
* If unclear: default to **concept-only**.

---

## 1) Execution: Multi-Agent Workplan (Summit Bundle)

### Master Agent: “Subsumption Director”

Produces: a PR stack plan + evidence bundle manifest + gates.

Sub-agents (parallel):

1. **Surface Mapper** — enumerates public surfaces (docs, API refs, integrations, UX flows).
2. **Systems Extractor** — architecture/dataflow/resilience patterns inferred strictly from public artifacts.
3. **Graph & Retrieval Analyst** — KG schema, entity resolution signals, retrieval strategies, vector usage.
4. **Agent Orchestration Analyst** — coordination patterns, tool calling, eval loops, safety boundaries.
5. **Moat Engineer** — differentiators, gates, enterprise controls, lock-in vectors.

Each sub-agent must output:

* `findings.md` (bullets + citations)
* `claims.yml` (claim/evidence/confidence)
* `opportunities.yml` (integration items scored)
* `risks.yml` (license/security/operational)

---

## 2) Phase 1 — Evidence-Backed Extraction (Days 1–10)

### A. Public Surface Inventory

Deliverables:

* **Surface Map** (table): docs, product pages, API docs, SDKs, integrations, blog posts, demos, release notes.
* **Capability Taxonomy** (tagged): collection, enrichment, graphing, collaboration, automation, reporting.

Acceptance:

* ≥95% of discoverable surfaces captured (by unique URL count + site search coverage).
* Every surface item has a **source + date accessed**.

### B. Architecture & Design Patterns (Publicly inferable)

Extract only what is evidenced by:

* diagrams, docs, SDK structure, config formats, public API conventions, talk transcripts.

Deliverables:

* `architecture_inferences.md` with:

  * components list (confidence levels)
  * observed contracts (API shapes, event models)
  * operational posture (SaaS vs hybrid; stated scaling claims)

### C. Data Engineering & Graph Model

Deliverables:

* `graph_model_hypotheses.md`:

  * entity types + relationships (only evidenced)
  * ER/dedup approaches (explicitly stated or strongly implied)
  * retrieval patterns (keyword/graph traversal/vector hybrid)

### D. Agent/AI System Patterns

Deliverables:

* `agentic_patterns.md`:

  * orchestration topology (hierarchical, swarm, planner-executor)
  * tool boundary model
  * evaluation loops (human-in-the-loop, auto-grading, regression tests)

### E. Product/UX Workflows

Deliverables:

* `workflow_decomposition.md`:

  * onboarding steps
  * investigation loops
  * analyst collaboration primitives
  * “time-to-first-insight” friction points

### F. Operational Excellence Signals

Deliverables:

* `ops_posture.md`:

  * deployment options (self-hosted/SaaS)
  * observability claims
  * security/compliance assertions
  * integration ecosystem maturity

---

## 3) Phase 2 — Summit Integration (Days 11–20)

### Compatibility Matrix (Summit Stack)

Map findings to Summit’s likely primitives:

* Graph store: Neo4j / Postgres graph adjacencies
* Retrieval: GraphRAG + vector DB (e.g., Qdrant)
* Orchestration: multi-agent tool calling, registry, policies, telemetry hooks
* Connectors: CompanyOS SDK pattern

Deliverables:

* `integration_matrix.yml`
  Fields:

  * `capability`
  * `summit_module_target`
  * `delta` (new/replace/enhance)
  * `effort` (S/M/L)
  * `risk` (license/security/complexity)
  * `acceptance_tests`

### Patch-First PR Stack Output

Produce a **mergeable PR stack** plan:

* PR1: schema/contracts (non-runtime)
* PR2: minimal feature slice behind a flag
* PR3: observability + eval harness
* PR4: docs + evidence bundle wiring

Acceptance:

* Each PR has:

  * deterministic tests
  * rollback plan
  * feature flag / config gate
  * evidence IDs mapped to docs

---

## 4) Phase 3 — Surpass (Days 21–30)

### “Transcendence Moves” (must be measurable)

Pick 3–5 “can’t easily replicate” composites that combine:

* graph-native reasoning
* agent autonomy with governance
* high-trust provenance + auditability
* connector ecosystem scaling

Deliverables:

* `surpass_plan.md` with:

  * benchmark definition (latency/cost/quality)
  * evaluation protocol
  * minimum viable implementation slices

Examples of surpass vectors (generic, you’ll tailor per target):

* **Graph-verified RAG**: citations validated by graph constraints
* **Investigation replay**: deterministic “case run” reproducibility
* **Entity lineage**: provenance from ingestion → resolution → assertions → reports
* **Agent safety gates**: policy-aware tool calling with audit events

Acceptance:

* Every surpass claim has an eval metric + pass/fail bar.

---

## 5) Phase 4 — Moat + Gates (Days 31–40)

### Moat Mechanisms (buildable and enforceable)

Deliverables:

* `moat_and_gates.yml`:

  * enterprise gates (RBAC, audit logs, export controls)
  * scale gates (multi-tenant controls, caching, workload isolation)
  * AI gates (private model routing, eval regression, policy enforcement)
  * ecosystem gates (connector marketplace contracts, versioned transforms)
  * data gates (curated corpora, benchmark datasets, labeled resolution sets)

Acceptance:

* Each gate includes:

  * enforcement point (where in system)
  * telemetry events
  * test coverage requirement

---

## 6) Phase 5 — Continuous Competitive Intelligence Loop (Ongoing)

Deliverables:

* `watchlist.yml` (sources + cadence)
* `diff_log.md` (deterministic weekly rollup)
* `alerts.md` (only high-signal changes)

Acceptance:

* “No noise” rule: only changes that affect capability, pricing, compliance, or integrations.

---

# Required Output Format (Single Target Run)

Use this template verbatim for each target analysis run:

```markdown
# Analysis Report: <TARGET_NAME>

Repository/Product: <URL(s)>
Analysis Date: <YYYY-MM-DD>
Summit Reference: <commit/tag>

## 1) Evidence Ledger
| Claim | Evidence Pointer | Confidence (H/M/L) | Notes |
|------|-------------------|--------------------|------|

## 2) Capability Taxonomy
- Collection:
- Enrichment:
- Graph/Link Analysis:
- Agent/Automation:
- Collaboration/Casework:
- Reporting/Export:
- Security/Compliance:
- Integrations:

## 3) Extracted Patterns (Concept-Level)
### Architecture
### Data Engineering / KG
### Retrieval / RAG
### Agent Orchestration
### UX Workflows
### Ops & Security

## 4) Integration Plan (Summit PR Stack)
- PR1:
- PR2:
- PR3:
- PR4:

## 5) Surpass Plan (Benchmarked)
- Benchmark:
- Eval harness:
- Implementation slices:

## 6) Moat + Gates
- Gate 1:
- Gate 2:
- Gate 3:

## 7) License / IP Review
- License(s) observed:
- Allowed use:
- Required attribution:
- Risk items:

## 8) Acceptance Criteria
- [ ] Deterministic artifacts
- [ ] Tests + eval harness
- [ ] Feature flags
- [ ] Evidence IDs mapped
- [ ] Rollback plan
```

---

## Summit-Ready Repo Artifact Layout

Suggested drop-in directory structure for runs (keeps everything auditable):

```text
docs/competitive/
  targets/
    <target_slug>/
      run_<YYYY-MM-DD>/
        sources.yml
        claims.yml
        findings.md
        integration_matrix.yml
        surpass_plan.md
        moat_and_gates.yml
        risks.yml
        license_review.md
        evidence_ledger.md
```

---

## Practical Upgrade: Scoring Model (Deterministic)

To prevent “cool ideas” from diluting velocity, score each opportunity:

* **Value (0–5)**: user impact + differentiation
* **Fit (0–5)**: aligns with Summit primitives
* **Effort (0–5)**: inverse (lower is better)
* **Risk (0–5)**: inverse (lower is better)

Priority = `2*Value + Fit + (5-Effort) + (5-Risk)`
