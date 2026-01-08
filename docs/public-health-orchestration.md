# Public Health & Outbreak Intelligence Orchestration Plan

This document adapts the IntelGraph master orchestration prompt to a public health context with audit-ready execution guidance. It distills the parallel epics into concrete deliverables, operating guardrails, and verification hooks suitable for health department deployments.

## Operating Principles

- **Purpose limitation:** Public health only; enforce purpose tags across ABAC/OPA and data contracts.
- **Privacy & residency:** Default standard retention 365 days; PHI short retention 30 days unless statutory; jurisdiction-aware routing with residency controls.
- **Security:** OIDC/JWT, mTLS, field-level encryption for PHI, immutable provenance ledger, and warrant/authority bindings for sensitive views.
- **SLO targets:** API reads p95 ≤ 350ms; writes p95 ≤ 700ms; subscriptions ≤ 250ms; ingest ≥ 1,000 ev/s per pod p95 ≤ 100ms pre-storage; graph 1-hop ≤ 300ms and 2–3 hops ≤ 1,200ms.
- **Cost guardrails:** ≤ $0.10 / 1k ingested events and ≤ $2 / 1M GraphQL calls (alert at 80%).
- **Equity & transparency:** DPIA/equity reviews per release, public notices for data use, and open data exports with de-identification.

## Epic Execution Snapshot (parallel track)

- **EP1 Governance & Legal:** Boundary diagrams (boundary.md), HIPAA public health exception guidance, purpose/residency labels, authority bindings, retention map, MOUs/DUAs, DPIA/equity review, and incident/breach SOP with backout paths.
- **EP2 Ingest & Interop:** Source registry covering ELR/eCR/syndromic/wastewater/mobility, HL7 v2 ELR adapters, FHIR/CDA eCR bridge, syndromic/wastewater adapters, deterministic dedup/linking, provenance attachment, DLQ+replay, residency gatekeeper, observability dashboards, golden fixtures, and per-feed backout switches.
- **EP3 Canonical Model & Graph:** Entities/edges schema, line list spec with case status, terminology mappings, constraints/indexes, consent/purpose labels, provenance claims, schema linter, golden graph fixture, data quality rules, runnable docs, and rollback plan.
- **EP4 Entity Resolution & Linking:** PHI-safe ER strategy, blocking/similarity libraries, contact/household graph links, exposure modeling, human-in-the-loop adjudication UI, unmerge/audit, drift monitors, purpose gates, and backout controls.
- **EP5 Analytics & Forecasts:** Signal catalog, epi curves/growth rates, delay-aware nowcasting, Rt estimation, SEIR baselines, spatial/kriging models, scenario planning, uncertainty bands, bias/robustness checks, explainability surfaces, cost-quality curves, observability, and pinned baselines for backout.
- **EP6 Detection & Early Warning:** Outbreak signal rules, anomaly and cluster detection pipelines (graph-aware), genomic/epi linkage hooks, alert scoring/fusion, false-positive controls, human review queue, partner/IHR notifications, observability, throttling backouts, and evidence packs.
- **EP7 Interventions & Case Management:** Intervention taxonomy, case management UI, contact tracing workbench, vax/prophylaxis tracking, referrals, outcome tracking, equity/access flags, intervention evidence binder, DR/failover, observability on time-to-notify/isolate, and backout.
- **EP8 Public Dashboards & Comms:** KPI framework, public dashboard with a11y/i18n, de-identified open data exports with DP bounds, media briefing kit, rate-limited public/research API with purpose gates, versioned snapshots, mis/disinformation playbooks, observability, and freeze backout.
- **EP9 Privacy & De-Identification:** Safe Harbor/expert determination policy, quasi-identifier catalog, k-anonymity/l-diversity/t-closeness algorithms, geo/date generalization, differential privacy layer, tokenization/PE/FFX, consent/opt-out, minimization, audit/access reviews, and revoke shared datasets.
- **EP10 Observability & FinOps:** OTel with tenant/region labels, SLO dashboards with error budgets, equity metrics (outcomes by demographics/zip), synthetic probes, FinOps boards with alerts, alert hygiene playbooks, evidence bundles, PIR templates, shared SLA boards, and telemetry freeze.
- **EP11 Release & Field Ops:** Release cadence (weekly→stg, biweekly→prod), post-deploy validation gates, compliance pack, field ops runbooks, training/playbooks, migration guides, KPI roll-up, changelog automation, E2E acceptance packs, EOL/de-feature comms, and release freeze backout.

## Immediate Delivery Cadence

- **Artifacts & evidence:** Each task emits artifact, verification with SLO evidence, provenance manifest, and rollback/backout path; attach cryptographic hashes where applicable.
- **Parallelization:** Run all epics concurrently with RACI (MC as approver) and sprint-level progress checkpoints: progress %, epi KPIs (Rt/growth/incidence), SLO/cost burn, equity metrics, evidence links.
- **Controls:** Enforce purpose tags in ABAC/OPA, residency routing per jurisdiction, DLQ/replay for ingest, schema linting in CI, and per-feed/model backout toggles.

## Forward-Looking Enhancements

- **Adaptive workload routing:** Use cost-aware, latency-sensitive routing to select cloud regions/providers per jurisdiction while honoring residency.
- **Provenance-first analytics:** Default all analytical outputs to embed provenance claims (signer/hash/time/source), enabling downstream evidence packs and reproducibility.
- **Equity-aware alerting:** Integrate equity metrics into alert scoring to prioritize interventions where disparities are detected.
