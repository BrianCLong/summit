# 2026 Q2 Commercialization & Series A Readiness Plan

## Objectives
- Achieve a $1M ARR trajectory via 20 pilots converting to 5 paid contracts.
- Ship multi-tenant SaaS with an air-gapped enterprise deployment option at 99.9% uptime.
- Secure a $5M Series A term sheet by end of June with a defensible FedRAMP Moderate path.

## Milestones by Month
### April: Pilot Acceleration (20 LOIs)
- Sign 20 LOIs with prioritized gov/commercial design partners.
- Stand up pilot orchestration playbook (GovFastlane + AirGap Pro variants) with automated outreach workflow (`pilot-onboarding.yml`).
- Deliver TAXII/STIX 2.1 ingest/export bundle, ELK/Splunk bi-directional bridge, and SLA dashboard beta.
- KPI: $250k qualified pipeline, 10 pilots active, 99% pilot environment availability.

### May: Multi-Tenant SaaS MVP
- Deploy multi-tenant control plane (tenant ABAC via OPA, Stripe metered billing, sharded storage).
- Target scale: 100 tenants, 1M users/month; replicas 10; Neo4j enterprise cluster; 10TB sharded storage.
- Usage-based billing GA (metering -> invoicing), SLA dashboard GA (RED metrics + breach alerts), and FedRAMP Moderate ATO package drafted.
- KPI: $500k ARR run-rate, 99.9% uptime, MTTR <30m, MTBF >30d.

### June: Series A Roadshow
- Finalize Series A deck and data room (traction, security posture, market, product roadmap).
- Execute 15+ investor meetings; secure $5M term sheet @ $25M pre-money.
- Close 5 paid contracts from pilot cohort; convert 50% of remaining pilots to expansion plan.
- KPI: 3x valuation support (pipeline, contracts, compliance evidence), <5% churn forecast, NPS >70.

## Critical Path Workstreams (Week 1 Focus)
- **Gov Connectors (TAXII/STIX 2.1)**: Full bundle ingest/export with prior CSV coverage; signed-off by Backend.
- **Enterprise Integrations (ELK/Splunk Bridge)**: Bi-directional sync with authz mapping; signed-off by Integrations.
- **Compliance (FedRAMP Moderate)**: ATO package + audit trail mapped to SLSA (#10148); owned by Security.
- **Revenue (Usage-Based Billing)**: Stripe integration + tenant metering; owned by Platform.
- **Commercial (SLA Dashboard)**: RED metrics, 99.9% uptime monitoring, breach alerts; owned by Observability.

## Architecture Snapshot
- **Control Plane (SaaS)**: Multi-tenant API gateway, OPA tenant-ABAC, Stripe metered billing, per-tenant isolation (DB schemas + sharded storage), RED/SLO telemetry exported to Grafana.
- **Data Plane (Air-Gapped Enterprise)**: Offline bundle with TAXII/STIX ingest/export, ELK/Splunk sync, signed artifact pipeline; optional Carahsoft channel for FedRAMP accelerators.
- **Data Layer**: Neo4j enterprise cluster (HA), object storage sharding (10TB), tenant-scoped backups; retention and BYOK for gov tenants.
- **Resilience**: Target 99.9% uptime; HA replicas (10), MTTR <30m; chaos drills pre-launch.

## Execution Playbooks
- **Pilot Playbook**: 30-day free pilot (<10k nodes), $5k/mo post-pilot tiers; GovFastlane (90-day ATO) and AirGap Pro ($25k one-time + $2k/mo support).
- **GTM Motions**: Auto-prospect outreach (workflow run), weekly pipeline review, value proof via SLA dashboard and compliance artifacts.
- **Migration Ops**: Apply values-prod diff (replicas 10, Neo4j enterprise cluster, storage 10TB sharded, OPA tenant-ABAC, billing stripe-metered); verify via helm upgrade command.

## Metrics & Reporting
- **Pilots**: Target 20 (vs Q1 actual 5); active/converted ratio weekly.
- **Revenue**: $500k ARR run-rate; $1M ARR trajectory.
- **Reliability**: Uptime 99.9%; MTTR/MTBF tracked on SLA dashboard.
- **Customer Health**: NPS >70; churn <5%.
- **Security/Compliance**: FedRAMP Moderate evidence completeness; ATO package status; audit trail coverage.

## Risks & Mitigations
- **Gov Sales Cycle**: Run commercial motion in parallel; prioritize fast-cycle industries.
- **FedRAMP Complexity**: Partner with Carahsoft; reuse SLSA controls; maintain evidence binder per control family.
- **Integration Fragility**: Contract tests for TAXII/STIX and ELK/Splunk bridges; fallbacks with retriable queues.
- **Billing Accuracy**: Metering idempotency and reconciliation jobs; Stripe test harness and alerting for anomalies.
- **Scalability**: Load/perf tests to 1M users/month; shard sizing reviews; backpressure/queue depth alerts.

## Series A Narrative
- **Problem**: OSINT silos reduce operational velocity for Gov/IC.
- **Solution**: Summit = IntelGraph + AI Copilot with multi-tenant + air-gapped parity.
- **Traction**: 20 pilots, $500k ARR trajectory, 5+ paid conversions.
- **Team**: Ex-IC leadership + enterprise GTM experience.
- **Market**: $10B OSINT/AI analytics TAM.
- **Ask**: $5M @ $25M pre for scale-out (100 tenants, 1M users/month) and FedRAMP path.

## Next 2-Week Action Plan
- Lock Week 1 critical path deliveries (connectors, billing, SLA dashboard, FedRAMP evidence binder skeleton).
- Book pilot LOIs and schedule onboarding; run pilot-onboarding workflow daily.
- Stand up billing metering tests and SLA dashboards in staging; chaos test HA setup.
- Draft investor deck and data room structure; include security/compliance appendices.

## Operating Model & Owners
- **Program Management**: Weekly exec standup, milestone burndown, and LOI/contract tracker; Kanban via `Commercialization` project.
- **Engineering**: Backend (TAXII/STIX), Integrations (ELK/Splunk), Platform (billing/multi-tenancy), Security (FedRAMP), Observability (SLA dashboard).
- **GTM**: Sales/BD for pilots and LOIs, Marketing for narrative, Partnerships for Carahsoft and integration co-marketing.

## Technical Migration Checklist
- Helm upgrade: `helm upgrade summit-prod --set replicas=10 --set neo4j.enterprise=true` after validating values-prod diff.
- Apply values diffs: replicas 3→10, Neo4j community→enterprise-cluster, storage 100GB→10TB sharded, OPA ABAC→tenant ABAC, billing off→stripe-metered.
- Reliability gates: load test to 1M users/month, chaos drills on cluster failover, retry/backpressure tuning for connectors and billing events.
- Security/Compliance: enable signed artifacts, audit trails for ingest/export, evidence binder mapped to FedRAMP controls, SLSA pipeline attestation.

## Data Room & Series A Deliverables
- **Deck**: Problem, Solution (IntelGraph + AI Copilot), Traction (pilots + ARR), Market ($10B TAM), Team, Product roadmap, Financial model, Ask ($5M @ $25M pre).
- **Metrics**: Pilot KPIs, ARR progression, churn/NPS, uptime/MTTR/MTBF, cost per tenant benchmarks.
- **Compliance**: FedRAMP Moderate plan, ATO artifacts, audit trail coverage, vulnerability management cadence.
- **Product**: Multi-tenant SaaS architecture, air-gapped deployment guide, SLA dashboard screenshots, connector certifications.

## Observability & Billing Controls
- RED metrics per tenant (requests, errors, duration); SLO dashboards with 99.9% targets and breach alerts.
- Billing metering pipeline with idempotent event ingestion, delayed-durable queue, Stripe reconciliation job, and anomaly alerts.
- Per-tenant capacity policies (shards, rate limits) with automation to throttle or scale based on queue depth and error rates.

## Risk Register (Expanded)
- **Data Quality**: STIX/TAXII schema drifts → schema validation and contract tests per feed.
- **Vendor/Stripe Latency**: Graceful degradation and caching of pricing; circuit breakers on external calls.
- **Air-Gap Drift**: Monthly signed releases with checksum verification; offline license checks and upgrade playbook.
- **Talent Bandwidth**: Cross-functional tiger team for Week 1 critical path; clear DRI per deliverable.
