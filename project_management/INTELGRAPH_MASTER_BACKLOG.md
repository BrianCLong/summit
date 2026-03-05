# IntelGraph Master Backlog

## EPIC 01 — Backlog, Scope & Stakeholder Alignment
**Owner**: Product • **Supporting**: Architecture, Security, Compliance, Cost, QA

- [x] **EP01-T01** [Artifact](docs/project/STAKEHOLDERS.md) Stakeholder map & RACI; identify decision owners.
- [ ] **EP01-T02** Problem statements & objectives per stakeholder persona.
- [ ] **EP01-T03** In‑scope vs out‑of‑scope list with rationale and cutlines.
- [ ] **EP01-T04** Personas & primary jobs‑to‑be‑done; top 5 success metrics.
- [ ] **EP01-T05** Story mapping: end‑to‑end slice for Day‑0 release.
- [ ] **EP01-T06** Non‑functional requirements: SLOs, availability, latency budgets.
- [ ] **EP01-T07** Risk register with likelihood/impact; mitigations & owners.
- [ ] **EP01-T08** Compliance & privacy constraints matrix (PII, retention, residency).
- [ ] **EP01-T09** Cost envelope & unit economics targets; alert thresholds.
- [ ] **EP01-T10** Dependency graph across epics; identify critical path.
- [ ] **EP01-T11** Acceptance Criteria template & verification steps standard.
- [ ] **EP01-T12** Evidence template & provenance manifest fields.
- [ ] **EP01-T13** Weekly release cadence & demo plan; definition of ready.
- [ ] **EP01-T14** Success measures/OKRs; baseline & target.
- [ ] **EP01-T15** Governance calendar; change‑control and waiver process.
- [ ] **EP01-T16** Communication plan: channels, cadence, recipients, public logs.
- [ ] **EP01-T17** Risk‑based prioritization (MoSCoW) across epics.
- [ ] **EP01-T18** Stakeholder sign‑off package; e‑signature + hash in ledger.
- [x] **EP01-T19** Backlog grooming session #1 → publish epic/story/task IDs.

## EPIC 02 — Architecture & ADRs
**Owner**: Architecture • **Supporting**: Product, Security, Data, DevOps, SRE

- [x] **EP02-T01** [Artifact](docs/architecture/c4-context.mmd) C4 Context diagram; external systems & trust boundaries.
- [ ] **EP02-T02** C4 Container diagram; services, data stores, queues, gateways.
- [ ] **EP02-T03** C4 Component diagram for API, ingest, provenance, UI.
- [ ] **EP02-T04** Deployment diagram (single region + read replicas; sharding).
- [ ] **EP02-T05** ADR: Graph store, sharding/partitioning, backup/restore.
- [ ] **EP02-T06** ADR: API gateway & GraphQL approach (federation vs single schema).
- [ ] **EP02-T07** ADR: Multitenancy/ABAC model; tenant routing and isolation.
- [ ] **EP02-T08** ADR: Secrets & key management; rotation strategy.
- [ ] **EP02-T09** ADR: Streaming backbone & message schemas; exactly‑once goals.
- [ ] **EP02-T10** ADR: Caching & invalidation layers; read/write patterns.
- [ ] **EP02-T11** ADR: Search/index strategy; text/geo/temporal.
- [ ] **EP02-T12** ADR: Schema migration/versioning; back/forward compatibility.
- [ ] **EP02-T13** ADR: Feature flags & kill‑switches; runtime policy toggles.
- [ ] **EP02-T14** ADR: Rate limiting, quotas, backpressure, and fail‑open/close.
- [ ] **EP02-T15** ADR: Multi‑region DR and RTO/RPO targets.
- [ ] **EP02-T16** Threat model baseline (STRIDE) + mitigations per component.
- [ ] **EP02-T17** Performance budgets per interface; SLI→SLO mapping.
- [ ] **EP02-T18** Rollback/Backout patterns (DB, schema, config, code).
- [ ] **EP02-T19** Architecture review & sign‑off; ledger record.

## EPIC 03 — Data Modeling & Graph Schema
**Owner**: Data • **Supporting**: Architecture, Security, Provenance, QA

- [ ] **EP03-T01** Canonical entity/edge inventory; taxonomy & synonyms.
- [ ] **EP03-T02** Ontology mapping to business concepts; normalization rules.
- [ ] **EP03-T03** Label/property design (nodes/relationships) with types.
- [ ] **EP03-T04** Index/constraint plan; cardinality and uniqueness.
- [ ] **EP03-T05** Temporal modeling (valid‑time/transaction‑time); versioning.
- [ ] **EP03-T06** Soft delete vs tombstones vs archival marking.
- [ ] **EP03-T07** Entity resolution (dedupe) rules & confidence scoring.
- [ ] **EP03-T08** PII tagging & retention tier tags on properties.
- [ ] **EP03-T09** Provenance property set & lineage paths.
- [ ] **EP03-T10** Sample synthetic datasets; anonymization approach.
- [ ] **EP03-T11** Golden test fixtures for unit/integration.
- [ ] **EP03-T12** Cypher style guide & cost hints; query best‑practices.
- [ ] **EP03-T13** Data quality checks (completeness, validity, drift).
- [ ] **EP03-T14** GDS algorithm plan (similarity, community, pathfinding).
- [ ] **EP03-T15** Persisted sample queries + expected latency envelopes.
- [ ] **EP03-T16** Migration scripts (forward/back) with checksum.
- [ ] **EP03-T17** Data catalog pages; glossary; ownership metadata.
- [ ] **EP03-T18** Residency matrix (region/tenant); export formats.
- [ ] **EP03-T19** Review & sign‑off; record in ledger.

## EPIC 04 — API & GraphQL Gateway
**Owner**: API • **Supporting**: Security, Data, DevOps, QA, SRE

- [ ] **EP04-T01** GraphQL SDL for core types/queries/mutations/subscriptions.
- [ ] **EP04-T02** Authn flows (OIDC); token lifetimes; refresh; scopes.
- [ ] **EP04-T03** Authz via OPA (ABAC): policies, attributes, decision logs.
- [ ] **EP04-T04** Rate limits, quotas, burst handling; tenant‑aware.
- [ ] **EP04-T05** Persisted queries & safelisting; cache keys.
- [ ] **EP04-T06** Pagination, filtering, sorting contracts; relay‑style where useful.
- [ ] **EP04-T07** Mutations for ingest; idempotency keys & dedupe.
- [ ] **EP04-T08** Subscriptions transport; fan‑out latency targets.
- [ ] **EP04-T09** Input validation & error taxonomy; trace correlation IDs.
- [ ] **EP04-T10** Versioning & deprecation policy; compatibility tests.
- [ ] **EP04-T11** N+1 prevention (dataloaders/batching); resolver SLIs.
- [ ] **EP04-T12** Admin/ops endpoints (OpenAPI) & auth hardening.
- [ ] **EP04-T13** Contract tests (consumer/provider); mocked data.
- [ ] **EP04-T14** Performance harness; P95/P99 latency checks in CI.
- [ ] **EP04-T15** API docs & runnable examples; Postman/insomnia collections.
- [ ] **EP04-T16** Canary routing & feature flag wiring.
- [ ] **EP04-T17** Audit/provenance hooks on all mutations.
- [ ] **EP04-T18** SLA/SLO doc for tenants; escalation path.
- [ ] **EP04-T19** Review & sign‑off; ledger record.

## EPIC 05 — Ingestion Pipelines (Batch & Streaming)
**Owner**: Ingest • **Supporting**: Data, Security, Provenance, DevOps, SRE

- [ ] **EP05-T01** S3/CSV connector MVP (schema mapping, dedupe, provenance attach).
- [ ] **EP05-T02** HTTP pull/push connectors (REST JSON; pagination; retries).
- [ ] **EP05-T03** File‑drop connector for air‑gapped deployments.
- [ ] **EP05-T04** Mapping DSL for source→canonical schema; validation rules.
- [ ] **EP05-T05** Idempotency strategy & duplicate suppression.
- [ ] **EP05-T06** Backpressure & flow‑control; queue sizing.
- [ ] **EP05-T07** Dead‑letter queue & quarantine workflow.
- [ ] **EP05-T08** Replay & checkpointing; exactly‑once best‑effort.
- [ ] **EP05-T09** Transformation library (clean/normalize/enrich).
- [ ] **EP05-T10** Provenance enrichment (source, time, hash, operator).
- [ ] **EP05-T11** Throughput/latency benchmarking per connector.
- [ ] **EP05-T12** PII detection/redaction rules; format‑preserving encryption.
- [ ] **EP05-T13** Multi‑tenant isolation & ABAC on ingest paths.
- [ ] **EP05-T14** Cost metering per event and per connector.
- [ ] **EP05-T15** Monitoring dashboards & alerts for backlog/lag/errors.
- [ ] **EP05-T16** Connector SDK docs & examples; template repo.
- [ ] **EP05-T17** Day‑2 connectors roadmap (GCS/Azure/JDBC/webhooks/bus).
- [ ] **EP05-T18** Blue/green deploy & rollback for connectors.
- [ ] **EP05-T19** Review & sign‑off; ledger record.

## EPIC 06 — Privacy, Security & Compliance
**Owner**: Security • **Supporting**: Compliance, Data, API, DevOps

- [ ] **EP06-T01** Data classification policy; tagging implementation.
- [ ] **EP06-T02** Retention policy & tiering (ephemeral‑7d…legal‑hold).
- [ ] **EP06-T03** Purpose limitation & consent tracking; enforcement checks.
- [ ] **EP06-T04** Field‑level encryption & key hierarchies; HSM/KMS wiring.
- [ ] **EP06-T05** Secrets management & rotation runbook.
- [ ] **EP06-T06** SCIM provisioning & deprovisioning flows.
- [ ] **EP06-T07** WebAuthn MFA and session hardening.
- [ ] **EP06-T08** Audit policy: what/when/who; tamper‑evidence rules.
- [ ] **EP06-T09** Access reviews and joiner/mover/leaver automation.
- [ ] **EP06-T10** SAST/DAST/SCA pipelines; gate thresholds.
- [ ] **EP06-T11** SBOM generation & license/TOS scanning; exceptions.
- [ ] **EP06-T12** Privacy impact assessment & DPIA templates.
- [ ] **EP06-T13** Pen‑test engagement & remediation tracking.
- [ ] **EP06-T14** Incident response runbook; tabletop exercise.
- [ ] **EP06-T15** Warrant/authority binding and legal request workflow.
- [ ] **EP06-T16** Policy‑as‑code test suite (OPA/rego) integrated in CI.
- [ ] **EP06-T17** Data residency/geo‑fencing enforcement tests.
- [ ] **EP06-T18** Compliance evidence binder (auto‑collected).
- [ ] **EP06-T19** Review & sign‑off; ledger record.

## EPIC 07 — Provenance & Auditability
**Owner**: Provenance • **Supporting**: Security, Data, DevOps, SRE

- [ ] **EP07-T01** Provenance ledger design (append‑only, hash‑chained).
- [ ] **EP07-T02** Event schema (who/what/when/why/where/how) + IDs.
- [ ] **EP07-T03** Hash manifest format & content‑addressed storage.
- [ ] **EP07-T04** Export signing & verification CLI.
- [ ] **EP07-T05** Verification routine in CI/CD and at read paths.
- [ ] **EP07-T06** Tamper‑evidence checks & alerting.
- [ ] **EP07-T07** User‑facing provenance viewer (UI) with filters.
- [ ] **EP07-T08** Provenance query API & access controls.
- [ ] **EP07-T09** Evidence bundle packager for releases.
- [ ] **EP07-T10** Chain‑of‑custody processes for data imports/exports.
- [ ] **EP07-T11** Air‑gapped resync protocol & cryptographic proof steps.
- [ ] **EP07-T12** Redaction with proofs (selective disclosure).
- [ ] **EP07-T13** Storage lifecycle policy & retention enforcement.
- [ ] **EP07-T14** Performance tests under high write volume.
- [ ] **EP07-T15** Compliance mapping (audit frameworks) + crosswalk.
- [ ] **EP07-T16** Backfill strategy for legacy actions.
- [ ] **EP07-T17** Alert runbooks for provenance anomalies.
- [ ] **EP07-T18** Documentation & examples; SDK snippets.
- [ ] **EP07-T19** Review & sign‑off; ledger record.

## EPIC 08 — Frontend & UX (React + MUI + Cytoscape)
**Owner**: Frontend • **Supporting**: Product, Data, Provenance, Security, QA

- [ ] **EP08-T01** Design tokens & theme (light/dark); accessibility baseline.
- [ ] **EP08-T02** Navigation shell, layout, and routing.
- [ ] **EP08-T03** Auth screens (OIDC), tenant switcher, session UX.
- [ ] **EP08-T04** Graph explorer with Cytoscape: pan/zoom, styles, highlights.
- [ ] **EP08-T05** Query builder (persisted queries; templates).
- [ ] **EP08-T06** Data lineage & provenance overlays.
- [ ] **EP08-T07** Ingest dashboard (throughput, lag, DLQ, costs).
- [ ] **EP08-T08** Provenance viewer (search, filters, signatures).
- [ ] **EP08-T09** Error boundaries, toasts, and fallback states.
- [ ] **EP08-T10** Accessibility (WCAG 2.1 AA) checks automated.
- [ ] **EP08-T11** i18n scaffolding; string externalization.
- [ ] **EP08-T12** Offline/air‑gapped modes; file drop flows.
- [ ] **EP08-T13** Tutorial, empty states, and sample datasets.
- [ ] **EP08-T14** Usage metering UI per tenant.
- [ ] **EP08-T15** Performance budgets (TTI/LCP) + profiling.
- [ ] **EP08-T16** E2E tests (Playwright) + visual regression.
- [ ] **EP08-T17** Telemetry events (OpenTelemetry) from UI actions.
- [ ] **EP08-T18** Docs site: how‑to, API explorer, examples.
- [ ] **EP08-T19** Review & sign‑off; ledger record.

## EPIC 09 — AI/Analytics & RAG
**Owner**: AI/Analytics • **Supporting**: Data, Security, Product, SRE, Cost

- [ ] **EP09-T01** Embedding/feature strategy; formats and dims.
- [ ] **EP09-T02** Chunking policy & dedupe for documents/records.
- [ ] **EP09-T03** Vector store selection & tenancy/isolation rules.
- [ ] **EP09-T04** Retrieval policies (filters, k, MMR); eval grid.
- [ ] **EP09-T05** Citation enforcement & source attribution.
- [ ] **EP09-T06** Prompt templates with guardrails & refusal modes.
- [ ] **EP09-T07** Automated eval harness (quality, safety, latency, cost).
- [ ] **EP09-T08** Explainability surfaces (why this node/edge/source).
- [ ] **EP09-T09** Cost caps/quota per tenant; budget alerts.
- [ ] **EP09-T10** Provider failover strategy & observability.
- [ ] **EP09-T11** Safety filters (PII/PHI, toxicity, jailbreak tests).
- [ ] **EP09-T12** Grounded generation flows using persisted queries.
- [ ] **EP09-T13** Vectorization pipeline integrated with ingest.
- [ ] **EP09-T14** Metrics: hit rate, hallucination rate, time‑to‑first‑token.
- [ ] **EP09-T15** Red‑team datasets; adversarial prompts; regression.
- [ ] **EP09-T16** Dataset governance: licenses/TOS, retention, consent.
- [ ] **EP09-T17** Feature flags & staged rollout criteria.
- [ ] **EP09-T18** Release gating on eval + SLOs + cost.
- [ ] **EP09-T19** Documentation & operator runbook.

## EPIC 10 — CI/CD, IaC & Environments
**Owner**: DevOps • **Supporting**: Security, SRE, QA, Architecture

- [x] **EP10-T01** [Artifact](docs/project/REPO_SCAFFOLDING_REPORT.md) Repo scaffolding; language/toolchain baselines.
- [ ] **EP10-T02** Branch protection rules; PR templates; CODEOWNERS.
- [ ] **EP10-T03** CI gates: lint, type, unit/integration/e2e coverage.
- [ ] **EP10-T04** Build pipelines; SBOM; vulnerability scanning.
- [ ] **EP10-T05** Container hardening; provenance (SLSA/attestations).
- [ ] **EP10-T06** Terraform stacks (dev/stage/prod) + remote state.
- [ ] **EP10-T07** Helm charts & overlays; canary parameters.
- [ ] **EP10-T08** Secrets management in CI/CD; sealed secrets.
- [ ] **EP10-T09** Ephemeral preview environments per PR.
- [ ] **EP10-T10** Progressive delivery: canary/blue‑green; auto‑rollback.
- [ ] **EP10-T11** Seed data & migration runners; checksums.
- [ ] **EP10-T12** Policy simulation stage (OPA) pre‑deploy.
- [ ] **EP10-T13** Cost guardrails & budget policies in pipeline.
- [ ] **EP10-T14** Dependency update bot & approval workflow.
- [ ] **EP10-T15** Release notes auto‑gen + evidence bundles.
- [ ] **EP10-T16** DR drill scheduler; report generator.
- [ ] **EP10-T17** Post‑deploy validation scripts & smoke tests.
- [ ] **EP10-T18** IaC docs & runbooks; ownership map.
- [ ] **EP10-T19** Review & sign‑off; ledger record.

## EPIC 11 — Observability & SRE
**Owner**: SRE • **Supporting**: DevOps, API, Ingest, Data, Security, Cost

- [ ] **EP11-T01** OpenTelemetry instrumentation plan (services/UI/DB/queues).
- [ ] **EP11-T02** Metrics schema (SLIs) and retention; exemplars.
- [ ] **EP11-T03** Logging baseline; structured logs; PII scrubbing.
- [ ] **EP11-T04** Distributed tracing for critical paths.
- [ ] **EP11-T05** Dashboards (latency, errors, saturation, traffic, costs).
- [ ] **EP11-T06** SLO burn‑rate alerts & alert routing (on‑call).
- [ ] **EP11-T07** Synthetic checks & contract monitors (API/GraphQL).
- [ ] **EP11-T08** Load tests (k6) & performance regression gates.
- [ ] **EP11-T09** Chaos experiments (pod kill, network, disk, dependency).
- [ ] **EP11-T10** Capacity planning & autoscaling policies.
- [ ] **EP11-T11** On‑call runbooks; rotations & escalation matrix.
- [ ] **EP11-T12** Post‑deploy validation & rollback criteria.
- [ ] **EP11-T13** Incident management templates; comms, RCAs.
- [ ] **EP11-T14** Error budget policies and feature freeze triggers.
- [ ] **EP11-T15** Cost observability (per tenant/API/query/event).
- [ ] **EP11-T16** Multi‑region failover tests & RTO/RPO verification.
- [ ] **EP11-T17** Health/readiness endpoints & dependency checks.
- [ ] **EP11-T18** Audit of logs/metrics/traces retention & privacy.
- [ ] **EP11-T19** Review & sign‑off; ledger record.
