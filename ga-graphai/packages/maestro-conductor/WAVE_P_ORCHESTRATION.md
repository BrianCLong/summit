# Wave P Orchestration — Performance + Scale + Regression Guardrails

This playbook captures the Wave P assignments, guardrails, and Codex prompts for the Maestro Conductor to dispatch. It follows the provided global rules: produce one atomic PR per agent, prefer additive changes, gate behavior changes behind default-off flags, keep CI green, and avoid touching shared docs indexes outside the Docs Indexer scope.

## Assignments & Allowlists

- **P1 — Load Test Harness (offline, deterministic) (new)**
  - Allowlist: `tools/perf/harness/run.ts`, `tools/perf/harness/scenarios/**`, `test/perf-harness/**`, `docs/perf/LOAD_TEST_HARNESS.md`
  - Non-goals: No real network calls; simulate handlers.
- **P2 — Perf Metrics Schema + Baseline Artifact (new)**
  - Allowlist: `schemas/perf/PerfMetrics.v0.1.json`, `tools/perf/baseline/perf-baseline.json`, `test/perf-metrics/**`, `docs/perf/PERF_METRICS_SCHEMA.md`
  - Non-goals: No live measurement required.
- **P3 — Perf Budget Checker (warn-only) (new)**
  - Allowlist: `scripts/perf/check-perf-budget.ts`, `test/perf-budget/**`, `docs/perf/PERF_BUDGETS.md`, `.github/workflows/perf-budget.yml`
  - Non-goals: Do not fail PR initially.
- **P4 — Perf Regression Diff Reporter (new)**
  - Allowlist: `scripts/perf/diff-perf.ts`, `test/perf-diff/**`, `docs/perf/PERF_DIFFS.md`
  - Non-goals: No GitHub comments required; artifact output sufficient.
- **P5 — Query Perf Budgets Config + Checker (new)**
  - Allowlist: `ops/perf/query-budgets.yaml`, `scripts/perf/check-query-budgets.ts`, `test/query-budgets/**`, `docs/perf/QUERY_BUDGETS.md`
  - Non-goals: No DB benchmarking; use fixture query stats.
- **P6 — Profiling Toggle Stub (flagged OFF) (new)**
  - Allowlist: `server/src/perf/profiling.ts`, `test/profiling/**`, `docs/perf/PROFILING.md`
  - Non-goals: No runtime profiler integration; stub interface ok.
- **P7 — “Perf Regression Triage” Runbook (docs-only)**
  - Allowlist: `docs/perf/PERF_TRIAGE_RUNBOOK.md`
  - Non-goals: No code changes.
- **P8 — Nightly Perf Workflow (optional, medium) (new)**
  - Allowlist: `.github/workflows/nightly-perf.yml`, `docs/perf/NIGHTLY_PERF.md`
  - Non-goals: Must be non-flaky; uses harness + fixtures only.
- **P-DI — Docs Indexer Wave P**
  - Allowlist: `README.md` (docs links section only), `docs/index.md` or `docs/README.md` (links only)
  - Non-goals: Links only; CI green.

## Merge Choreography

- Merge first: **P2** (schema) before **P3/P4** if referenced.
- **P1** is independent but helpful before **P8**.
- **P3** and **P4** run in parallel.
- **P5** is independent.
- **P6** is independent.
- **P7** docs anytime.
- **P8** after **P1/P2** stable.
- **P-DI** last.

Conflict avoidance: each agent stays within their allowlist; only P-DI touches README/docs index.

## Codex Prompts (copy/paste ready)

```text
P1 — Codex Prompt: Load Test Harness (offline, deterministic)

Objective:
ONE atomic PR adding a deterministic load test harness that runs scenario simulations against in-process handlers (no network).

ALLOWLIST:
- tools/perf/harness/run.ts
- tools/perf/harness/scenarios/**
- test/perf-harness/**
- docs/perf/LOAD_TEST_HARNESS.md

Deliverables:
1) harness:
   - runs N virtual requests with concurrency model (simulated scheduler)
   - outputs PerfMetrics JSON (no wall-clock; use simulated durations from scenario)
2) scenarios:
   - baseline API route scenario
   - ingestion scenario
3) tests for deterministic outputs given seed/fixtures
4) docs

Non-goals:
- No real timing/IO

Acceptance:
- [ ] deterministic
- [ ] CI green
```

```text
P2 — Codex Prompt: Perf Metrics Schema v0.1 + Baseline Fixture

Objective:
ONE atomic PR defining PerfMetrics.v0.1 schema and providing a baseline fixture artifact.

ALLOWLIST:
- schemas/perf/PerfMetrics.v0.1.json
- tools/perf/baseline/perf-baseline.json
- test/perf-metrics/**
- docs/perf/PERF_METRICS_SCHEMA.md

Deliverables:
1) schema: p50/p95/p99, error_rate, throughput, scenario metadata
2) baseline JSON adheres to schema
3) tests validate baseline against schema
4) docs

Non-goals:
- No live measurement

Acceptance:
- [ ] deterministic
- [ ] CI green
```

```text
P3 — Codex Prompt: Perf Budget Checker (warn-only)

Objective:
ONE atomic PR adding a warn-only perf budget check that validates PerfMetrics against budgets.

ALLOWLIST:
- scripts/perf/check-perf-budget.ts
- test/perf-budget/**
- docs/perf/PERF_BUDGETS.md
- .github/workflows/perf-budget.yml

Deliverables:
1) checker:
   - inputs: perf-metrics.json + budgets config (inline defaults ok)
   - outputs: report JSON + human summary
   - exit code 0 (warn-only) but clearly indicates breaches
2) tests with pass/fail fixtures
3) workflow runs on PR and uploads artifacts
4) docs

Non-goals:
- Do not fail PR initially

Acceptance:
- [ ] deterministic
- [ ] CI green
```

```text
P4 — Codex Prompt: Perf Regression Diff Reporter

Objective:
ONE atomic PR adding a diff tool that compares baseline vs current PerfMetrics and highlights regressions.

ALLOWLIST:
- scripts/perf/diff-perf.ts
- test/perf-diff/**
- docs/perf/PERF_DIFFS.md

Deliverables:
1) diff tool:
   - inputs: baseline.json, current.json
   - outputs: diff.json + markdown summary
   - deterministic ordering
2) tests with fixtures
3) docs

Non-goals:
- No GitHub comments required (artifact output sufficient)

Acceptance:
- [ ] deterministic
- [ ] CI green
```

```text
P5 — Codex Prompt: Query Perf Budgets Config + Checker

Objective:
ONE atomic PR adding query budgets config and a checker that validates fixture query stats against those budgets.

ALLOWLIST:
- ops/perf/query-budgets.yaml
- scripts/perf/check-query-budgets.ts
- test/query-budgets/**
- docs/perf/QUERY_BUDGETS.md

Deliverables:
1) budgets yaml:
   - query_name, p95_ms_budget, max_rows, notes
2) checker:
   - input: fixture query-stats.json
   - output: report JSON + summary
3) tests for pass/fail fixtures
4) docs

Non-goals:
- No DB benchmarking

Acceptance:
- [ ] deterministic
- [ ] CI green
```

```text
P6 — Codex Prompt: Profiling Toggle Stub (flagged OFF)

Objective:
ONE atomic PR adding a profiling interface stub and a feature flag to enable “profiling mode” (no real profiler integration required).

ALLOWLIST:
- server/src/perf/profiling.ts
- test/profiling/**
- docs/perf/PROFILING.md

Deliverables:
1) profiling.ts:
   - startSpan/endSpan stubs, no-ops unless PROFILING_ENABLED=true
   - deterministic in tests
2) tests for flag behavior
3) docs for future integration

Non-goals:
- No runtime profiler integration

Acceptance:
- [ ] deterministic
- [ ] CI green
```

```text
P7 — Codex Prompt: Perf Regression Triage Runbook (docs-only)

Objective:
ONE atomic PR adding a runbook for perf regressions: reproduce, bisect, measure, mitigate.

ALLOWLIST:
- docs/perf/PERF_TRIAGE_RUNBOOK.md

Deliverables:
- Steps:
  - run harness
  - generate metrics + diff
  - interpret p95/error/throughput changes
  - common root causes
  - rollback/flag strategy
  - when to move budget from warn-only to required
Acceptance:
- [ ] only this file changed
```

```text
P8 — Codex Prompt: Nightly Perf Workflow (deterministic fixtures)

Objective:
ONE atomic PR adding a nightly workflow that runs the perf harness against fixtures and publishes baseline + diff artifacts (no flakiness).

ALLOWLIST:
- .github/workflows/nightly-perf.yml
- docs/perf/NIGHTLY_PERF.md

Deliverables:
1) nightly workflow:
   - schedules daily
   - runs harness + diff tool with fixed fixtures
   - uploads artifacts
2) docs describing artifacts and how to update baseline

Non-goals:
- No live load tests
- No flaky timing

Acceptance:
- [ ] stable/deterministic
- [ ] CI green
```

```text
P-DI — Codex Prompt: Docs Indexer Wave P

Objective:
ONE atomic PR updating shared docs indexes to link Wave P docs.

ALLOWLIST:
- README.md (docs links section only)
- docs/index.md or docs/README.md (links only)

Add links to:
- docs/perf/LOAD_TEST_HARNESS.md
- docs/perf/PERF_METRICS_SCHEMA.md
- docs/perf/PERF_BUDGETS.md
- docs/perf/PERF_DIFFS.md
- docs/perf/QUERY_BUDGETS.md
- docs/perf/PROFILING.md
- docs/perf/PERF_TRIAGE_RUNBOOK.md
- docs/perf/NIGHTLY_PERF.md

Acceptance:
- [ ] links only
- [ ] CI green
```

## Notes

- Each prompt should be executed as a single atomic PR with warn-only perf gates where specified.
- Keep behavior changes behind default-off flags unless changes are purely additive and non-breaking.
- Avoid touching files outside each agent’s allowlist; shared index updates are reserved for P-DI.
