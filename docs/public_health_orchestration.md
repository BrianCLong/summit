# IntelGraph Public Health & Outbreak Intelligence Orchestration

This document tailors IntelGraph's platform patterns to the Public Health & Outbreak Intelligence variant described in the IntelGraph Master Orchestration Prompt. It provides an executable blueprint for aligning governance, data pipelines, analytics, and operational SLOs to the mandated epics and non-negotiables.

## Guiding Principles

- **Purpose limitation:** Public-health use only, enforced with ABAC purpose tags (`public-health`, `research`, `training`) and warrant/authority binding for sensitive views.
- **Privacy by default:** PHI retained for 30 days unless statutory retention or legal hold applies; standard data 365 days. Field-level encryption, mTLS, and provenance ledger are mandatory.
- **SLO adherence:** API p95 reads ≤350 ms, writes ≤700 ms, subscriptions ≤250 ms; ingest ≥1,000 ev/s/pod with ≤100 ms pre-storage latency.
- **Cost guardrails:** ≤$0.10 per 1k ingested events; ≤$2 per 1M GraphQL calls with 80% alerting threshold.
- **Auditability:** Immutable provenance, OIDC/JWT auth, OPA/ABAC enforcement, deterministic backfills, and reversible backouts.

## Reference Architecture

### Data Intake & Interop

- **Adapters:** HL7 v2 ORU^R01 ELR, eCR (FHIR/CDA), syndromic (ESSENCE), wastewater/env CSV/JSON, mobility aggregates with DPIA gating.
- **Routing & residency:** Gatekeeper service applies jurisdiction-based routing and residency labels; DLQ + replay for lossless recovery.
- **Provenance:** Every ingest attaches signer/hash/time/lab claims; deterministic dedup and linkage keyed on specimen/patient IDs.

### Canonical Model & Graph

- **Entities:** Person/case, specimen, lab result, exposure event, contact, location, facility, vaccine, intervention.
- **Schemas:** Line list with suspected/probable/confirmed status, constraints/indexes for graph + SQL, versioned case definitions (CSTE/WHO).
- **Quality & lints:** Schema linter, golden graph fixtures, missingness/outlier checks, and rollback scripts for schema changes.

### Detection & Analytics

- **Signals:** Case counts, test positivity, syndromic, wastewater, mobility, and genomic hooks.
- **Models:** Epi curves and growth rates, nowcasting, Rt (Cori/Wallinga), SEIR baselines, spatial/kriging, scenario planning, and uncertainty bands.
- **Alerts:** Outbreak signal rules per disease, anomaly/cluster detectors, alert scoring and fusion with human triage queue and WHO/IHR notification triggers.

### Interventions & Case Management

- **Workflows:** Case management UI, contact tracing workbench, vaccination/prophylaxis tracking, outcome monitoring, and equity/access flags.
- **Evidence:** Intervention binder with provenance and reversible backout to pause risky ER or public exports.

### Observability, SLOs & FinOps

- **Telemetry:** OpenTelemetry everywhere with tenant/region labels, SLO dashboards for p95/99 and error budgets, synthetic probes from ELR/eCR→case path.
- **Equity & cost:** Equity metrics by demographics/ZIP, FinOps boards for $/lab/$/case/$/alert, alert hygiene to suppress noise.

## Delivery Tracks (Epics → Deliverables)

- **Epic 1: Governance & Legal** — boundary diagrams, legal bases, MOUs/DUAs, purpose/residency labels, HIPAA public health exception rules, retention map, incident SOP, backout/containment runbooks.
- **Epic 2: Ingest & Interop** — source registry, adapters, dedup/linking, provenance library, DLQ/replay, residency gates, golden fixtures, per-feed kill switches.
- **Epic 3: Canonical Model** — entities/edges, line list schema, terminology maps, constraints/indexes, consent labels, provenance claims, schema linter, golden graph, data quality rules, rollback plan.
- **Epic 4: Entity Resolution & Linking** — PHI-safe ER strategy, blocking/similarity libraries, contact/household graph, exposure modeling, adjudication UI, unmerge/audit, drift monitors, purpose gates, backout.
- **Epic 5: Analytics & Forecasting** — signal catalog, epi curves, nowcasting, Rt, SEIR, spatial models, scenarios, uncertainty treatment, bias checks, explainability, cost-quality tradeoffs, observability, backout.
- **Epic 6: Detection & Early Warning** — outbreak rules, anomaly/cluster detectors, genomic linkage, alert fusion, FP controls, triage UI, WHO/IHR notifications, observability, throttling/backout, evidence packs.
- **Epic 7: Interventions & Case Management** — intervention taxonomy, case UI, tracing workbench, vaccination schema, referrals, outcomes, equity flags, evidence binder, DR/failover, observability, backout.
- **Epic 8: Public Dashboards & Comms** — KPI framework, public dashboard, de-identified exports with DP bounds, media kit, accessibility/localization, public API with purpose gates, snapshots, misinfo playbooks, observability, backout, evidence packs.
- **Epic 9: Privacy Engineering** — de-ID policy, quasi-identifier catalog, k/l/t + DP layer, geo/date generalization, tokenization service, consent/opt-out, minimization, audits, backout, evidence binder.
- **Epic 10: Observability & FinOps** — OTel spans/metrics, SLO dashboards, equity metrics, synthetic probes, FinOps boards, alert hygiene, evidence packs, PIR template, SLA boards, telemetry freeze.
- **Epic 11: Release & Field Ops** — release cadence, post-deploy validation, compliance pack, field ops runbooks, training/playbooks, migration guides, KPI roll-up, changelog automation, E2E acceptance packs, EOL guidance, release freeze.

## Execution & Controls

- **SLO verification:** Per-service p95 targets monitored via dashboards; ingestion lag and freshness tracked with synthetic probes; regression tests gate deployments.
- **Security & privacy controls:** OIDC/JWT + OPA/ABAC with purpose tags, mTLS, field-level encryption, immutable provenance ledger, residency routing, reversible backouts for datasets and ER links.
- **Testing strategy:** Unit + integration for adapters and ER libs; golden fixtures for ingest; property-based tests for dedup; CI gates via schema linter and model evaluation thresholds; Playwright/UX SLAs for human-in-loop flows.
- **Rollbacks:** DLQ/replay for ingest, schema rollback scripts, ER unmerge, public-data freeze, telemetry safe mode, and per-feed kill switches.

## Forward-Looking Enhancements

- **Causal inference for interventions:** Add synthetic control and Bayesian structural time series modules to quantify intervention impact with policy simulations.
- **Adaptive cost-aware routing:** Dynamic workload sharding using real-time FinOps metrics to keep ingestion/unit costs under thresholds while honoring residency.
- **Privacy-preserving learning:** Federated model hooks with secure aggregation for cross-jurisdiction collaboration without PHI movement.
