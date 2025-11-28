# Tranche #89–#96 Issue & Branch Plan

This plan converts prompts #89–#96 into discrete GitHub issues and ready-to-open branches with clear CI and feature-flag gates. Each issue is scoped to avoid DB/schema overlap and to merge cleanly behind the specified flags.

## Global conventions
- **Branch pattern:** `feat/<short-scope>` (e.g., `feat/ega-nba`, `feat/attack-coverage`).
- **Feature flags:** Respect the named flag per prompt (e.g., `EGA_NBA_ENABLED`, `ACMV_ENABLED`), default **off** until end-to-end validated.
- **CI gates:** Jest/unit + contract tests, Playwright E2E per prompt, plus k6/perf where specified. Canary+rollback enabled; no PII in logs.
- **Release safety:** Event emission only; no auto-collection or prod mutations beyond the prompt’s constraints.

## Issue breakdown

### #89 — Evidence Gap Analyzer & Next-Best-Action (EGA-NBA)
- **Title:** Implement Evidence Gap Analyzer & NBA recommender (feature-flagged)
- **Branch:** `feat/ega-nba`
- **Scope:** FastAPI service `/ai/gap-nba`; GET `/gaps/:caseId`, POST `/recommendations`, POST `/accept/:recId`; UI panel for “What to collect next”; events `gap.updated`, `nba.proposed|accepted|declined`.
- **CI/DoD:** Gold fixtures asserting gap vectors and top-3 NBA oracle match; Playwright review→accept→spawn runbook/ingest drafts; p95 ≤300ms on 50k-node subgraphs; feature flag `EGA_NBA_ENABLED`.
- **Notes:** Never auto-collect; consult LAC (#4) and Cost Guard (#6) before drafts; attach citations to rationales.

### #90 — ATT&CK Coverage Mapper & Control Validator (ACMV)
- **Title:** Deliver ATT&CK coverage mapper and validator
- **Branch:** `feat/attack-coverage`
- **Scope:** Python service `/ai/attack-coverage`; GET `/coverage/:caseId`, POST `/validate/:technique`, GET `/explain/:id`; UI heatmap + “validate control”; events `attack.coverage.updated|validated|failed`.
- **CI/DoD:** Coverage metrics reproduce fixtures; validator paths recorded; Playwright hole→validate→evidence; flag `ACMV_ENABLED`.
- **Notes:** Synthetic probes only (no real exploitation); provenance on mappings, no black-box scores.

### #91 — Model Serving Platform (MSP) & GPU Pool
- **Title:** Stand up model serving platform with canaries and GPU pool
- **Branch:** `feat/model-serving`
- **Scope:** FastAPI or Go service `/ai/model-serving`; register/deploy/rollback APIs; `/infer`; adapters (TS/Java/Python); dashboards for SLOs/canary compare/cost; KMS-backed secrets; resource classes and autoscaling via GWSP (#70).
- **CI/DoD:** Conformance tests per task; rollback proof; k6 throughput; p95 budgets per model family; flag `MSP_ENABLED`.
- **Notes:** Enforce tenant quotas, deterministic test mode, residency-aware placement (SRP #42).

### #92 — Chronos Engine: Time Normalization & Calendrics
- **Title:** Ship Chronos time normalization engine and UI
- **Branch:** `feat/chronos`
- **Scope:** Node/TS service `/services/chronos`; APIs `/parse`, `/normalize`, `/align`, `/explain/:token`; UI timeline with conflict flags and tooltips; holiday caches and calendar conversions.
- **CI/DoD:** Fixtures for DST edges/leap seconds/multi-calendar names; Playwright paste→normalized+explain; flag `CHRONOS_ENABLED`.
- **Notes:** Preserve originals; expose uncertainty ranges; tag region/jurisdiction to LAC.

### #93 — Runtime Security & eBPF Telemetry (ReST)
- **Title:** eBPF runtime security telemetry with policy hits
- **Branch:** `feat/runtime-security`
- **Scope:** Go + eBPF collectors for syscall/net policies; rule engine; OTEL export; UI overlays for policy hits/anomalies; events `rest.policy.hit|anomaly|cleared`.
- **CI/DoD:** Synthetic attack corpus with FP bounds; chaos drill (blocked escape); Grafana dashboards; flag `REST_ENABLED`.
- **Notes:** Overhead <3%; no payload capture; optional deny-by-default per env; ZTM (#68) identities and region-local stores.

### #94 — Data Catalog & Lineage Explorer (DCLE)
- **Title:** Data catalog and lineage explorer (feature-flagged)
- **Branch:** `feat/data-catalog`
- **Scope:** Node/TS + Postgres service `/platform/catalog`; dataset registry, glossary, lineage edges from signed manifests; UI search + lineage graph; events `catalog.dataset.published|deprecated|lineage.updated`.
- **CI/DoD:** Golden lineage fixtures with round-trip checks; Playwright lineage drill-down; a11y checks; flag `DCLE_ENABLED`.
- **Notes:** Read-only lineage; no PII in metadata; versioned changes.

### #95 — Egress DLP & Export Quarantine (EDLP)
- **Title:** Egress DLP with export quarantine
- **Branch:** `feat/egress-dlp`
- **Scope:** Python workers `/security/egress-dlp`; rules (regex/NER/structural), DP transforms (#20), quarantine queue; UI inbox with toggles; hooks into Brief/Disclosure (#13/#7), Interop (#71), API GW (#15) persisted queries; events `dlp.blocked|redacted|released`.
- **CI/DoD:** Sensitive corpus FP/FN bounds; Playwright export→blocked→fix→release; flag `EDLP_ENABLED`.
- **Notes:** Fail-closed for P0; residency enforced; LeakTrace (#48) watermark on release; dual-control overrides.

### #96 — Analyst Flow Analytics & Coaching Insights (AFAI)
- **Title:** Analyst flow analytics with privacy-safe telemetry
- **Branch:** `feat/flow-insights`
- **Scope:** Node/TS `/ops/flow-insights`; DP-guarded event grammar; funnels/time-to-task/heatmaps; suggestion engine; UI dashboards with inline coach marks; exports to Compliance Center (#64).
- **CI/DoD:** DP accounting tests; accuracy vs. synthetic truth; Playwright instrument→analyze→suggest; flag `AFAI_ENABLED`.
- **Notes:** Opt-in only; ε budgets per tenant; no keystrokes/content—IDs and timings only.

## Decision prompt
- If leadership wants immediate execution, proceed to create the above issues and branches with CI gates. Otherwise, confirm whether to prioritize sprints for #97–#104 next.
