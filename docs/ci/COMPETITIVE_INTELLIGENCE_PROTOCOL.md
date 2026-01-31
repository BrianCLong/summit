# Competitive Intelligence Subsumption & Transcendence Protocol (Summit Edition)

This protocol operationalizes competitive intelligence (CI) extraction into merge-train-ready
execution. It enforces determinism, evidence, license hygiene, CI gates, PR stack slicing, and
agent-to-agent contracts for Summit workstreams.

## Operating Constraints (Non-Negotiables)

- **Public-only**: Use only content explicitly available in the target’s public materials
  (repo, docs, blog posts, public talks).
- **No verbatim lift**: Do not copy code, tests, docs, configs, or prompt text beyond minimal
  quoted snippets for analysis.
- **License enforcement**: Record target license(s). If incompatible or unclear, restrict to
  **concept-level extraction only**.
- **Deterministic outputs**: Stable ordering; no timestamps in deterministic artifacts.
  Runtime metadata belongs only in a stamp file.
- **Patch-first**: Deliver value in small PRs with minimal blast radius and measurable gates.

## Mission

Systematically extract high-leverage concepts, patterns, and operational techniques from a target
and subsume them into Summit as:

1. Shippable modules/APIs/workflows.
2. Measurable superiority vs. baseline.
3. Gated controls that preserve integrity and prevent regressions.

## Phase 0 — Intake & Scope Lock (Hours, Not Days)

### Inputs (Must Be Explicit in the Report Header)

- `target_name`
- `target_urls` (repo + docs + any public materials)
- `target_license` + compatibility verdict
- `summit_commit` / branch
- `analysis_window` (what was examined)

### Output

- `docs/ci/targets/<target_name>/intake.md`
- `docs/ci/targets/<target_name>/source_index.yml` (URL list + what each source contains)

**Gate:** If license is incompatible or unclear → switch to **concept-only mode**.

## Phase 1 — Value Extraction (Structured, Auditable)

### Extraction Taxonomy (Normalized Fields)

For each finding, produce a record:

- `id`: stable (e.g., `CI.<target>.<domain>.<slug>`)
- `domain`: `architecture | agents | graph | data | ux | ops | security | dx`
- `type`: `pattern | technique | mechanism | control | metric | workflow`
- `claim`: one-sentence description
- `evidence`: URL + exact location (file path + line range or doc section)
- `why_it_matters`: impact statement tied to Summit goals
- `adoption_cost`: `low | medium | high`
- `risk`: `low | medium | high` (license/complexity/maintenance/security)
- `summit_mapping`: where it would land (module/path/service)
- `testability`: how to verify it works

### Output

- `docs/ci/targets/<target_name>/extraction.yml` (machine-readable)
- `docs/ci/targets/<target_name>/extraction.md` (human-readable synthesis)

**Gate:** Every “claim” must have evidence. No evidence → exclude.

## Phase 2 — Compatibility & Integration Design (Summit-Specific)

### Required Mapping Analysis

- **Architecture mapping**: where it fits in Summit’s current stack
  (graph, storage, retrieval, agents, ingestion).
- **API surface**: what new interfaces are introduced; compatibility with existing
  SDK/connector patterns.
- **Data model**: what nodes/edges/entities are impacted; migration plan if needed.
- **Ops & security**: secrets boundaries, RBAC implications, auditability, provenance hooks.
- **Performance**: expected wins + measurement method.

### Output

- `docs/ci/targets/<target_name>/integration_plan.md`
- `docs/ci/targets/<target_name>/risk_register.md`

**Gate:** Integration plan must specify owner module, tests, and rollback path.

## Phase 3 — PR Stack Execution (Mergeable Slices)

### PR Slicing Rules

Each PR must be:

- ≤ ~300 lines changed unless justified.
- Includes tests.
- Includes documentation update.
- Includes evidence link(s).
- Passes lint/typecheck/unit tests.

Additional rules:

- Prefer **feature flag / config gate** for new behavior.
- No PR may introduce a new dependency without:
  - License check.
  - Version pinning policy compliance.
  - SBOM/provenance hooks maintained.

### Required PR Types (Typical Sequence)

1. **Foundational plumbing** (schemas/types/interfaces)
2. **Collector/adapter** (ingest/translate)
3. **Core logic** (new capability)
4. **Golden tests** (behavioral invariants)
5. **Docs + runbooks** (ops clarity)
6. **Benchmarks** (before/after)

### Outputs Per PR

- `docs/ci/targets/<target_name>/pr_<nn>.md` (what changed, why, evidence, tests, risks)
- Update to `docs/ci/targets/<target_name>/progress.yml`

**Gate:** Every PR must declare at least one measurable outcome:
latency, throughput, cost, reliability, or developer time.

## Phase 4 — Transcendence (Surpass, Not Match)

This phase must produce differentiators the target does not provide or cannot easily replicate.

### Required Transcendence Categories (Pick at Least 2)

- **Assurance moat**: provenance, deterministic evidence, policy gates, audit graph.
- **Agentic moat**: multi-agent orchestration with bounded autonomy + escalation rules.
- **Graph moat**: deeper reasoning primitives (explanations, counterfactuals, lineage, drift).
- **Operational moat**: deploy hygiene, failure containment, cost governance.
- **DX moat**: zero-config onboarding, strong SDK ergonomics, introspection tooling.

### Output

- `docs/ci/targets/<target_name>/transcendence_plan.md`
- `docs/ci/targets/<target_name>/competitive_scorecard.md`

**Gate:** Transcendence items must include a defendability rationale
(why others struggle to copy).

## Phase 5 — Moat & Gates (Turn Advantages into Controls)

### Gate Types (Explicit)

- **Quality gates**: golden tests + regression suites.
- **Security gates**: policy-as-code checks, secret hygiene, dependency scanning.
- **Supply-chain gates**: provenance + SBOM rules.
- **Scale gates**: load tests, rate limits, backpressure semantics.
- **Enterprise gates**: RBAC, audit logging, retention policies, export controls (if relevant).

### Output

- `docs/ci/targets/<target_name>/gates.md`
- CI workflow updates (only if needed) with pinned actions and deterministic steps.

**Gate:** Every new moat must have at least one enforcement gate.

## Deliverable Template (Summit CI Report)

```markdown
# Analysis Report: <TARGET_NAME>

- Repository: <URL>
- License: <LICENSE> (compatibility: <OK | CONCEPT-ONLY | BLOCKED>)
- Analysis Date: <YYYY-MM-DD>
- Summit Baseline: <commit/branch>

## 1) Extraction Summary
- Findings count: <N>
- Top 5 high-leverage patterns:
  1. ...
  2. ...
- Immediate adoption candidates:
  - ...

## 2) Evidence Map
Each claim references public evidence (link + exact location).
- CI.<target>.ops.<slug>: <evidence>
- ...

## 3) Integration Plan
- Target module(s): ...
- API changes: ...
- Data model changes: ...
- Testing strategy: ...
- Rollback plan: ...

## 4) PR Stack Plan
PR-01: ...
PR-02: ...
PR-03: ...
Each PR includes tests + measurable outcome.

## 5) Transcendence Plan
- Differentiators we ship beyond the target:
  - ...
- Why they’re defensible:
  - ...

## 6) Gates & Assurance
- New/updated CI gates:
  - ...
- Evidence artifacts produced:
  - ...

## 7) Metrics
- Baseline vs after:
  - Latency: <x → y>
  - Cost: <x → y>
  - Quality: <x → y>
```

## Execution Rubric (How to Avoid Vibes-Driven CI)

- If you can’t cite it, it doesn’t exist.
- If you can’t test it, it doesn’t ship.
- If you can’t measure it, it isn’t “better.”
- If you can’t gate it, it isn’t a moat.
