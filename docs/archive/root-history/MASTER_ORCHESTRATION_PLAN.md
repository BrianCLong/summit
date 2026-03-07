# IntelGraph Master Orchestration Plan (v2 Lean-Flow)

## Purpose and Scope

This plan operationalizes the IntelGraph Master Orchestration Prompt v2 by translating the 11 epics into an executable, 5-day slicing model with governance, quality, and evidence controls. It is optimized for flow efficiency, small batch delivery, and verifiable outputs while respecting cost, security, privacy, and availability guardrails.

## Guiding Principles

- **Flow & Small Batches**: Deliver increments ≤5 days with INVEST-ready stories and tight WIP limits per value stream stage.
- **Evidence First**: Every slice must produce artifacts, tests, SLO evidence, and provenance (hash tree + inputs→transforms) with rollback notes.
- **Secure by Default**: OIDC/JWT, ABAC via OPA, mTLS, field-level encryption, and provenance ledger wiring are mandatory across services.
- **Cost & SLO Guardrails**: Adhere to the provided p95 performance budgets and monthly cost caps with 80% alerting thresholds.
- **Parallel Execution with Dependencies**: Run epics in parallel where independent; enforce dependency checks before downstream promotion.

## Architecture & Execution Topology

- **Workcells per Epic**: Assign cross-functional workcells (PRD, DM, ING, API, FE, SEC/PRIV, OBS/SRE, OPS/QA/DOC) per epic with MC as approver.
- **Control Plane**: Use Meta-Orchestrator for scheduling, dependency gating, and evidence bundling; attach provenance IDs to every job.
- **Data & Graph Layer**: Neo4j primary with Postgres for metadata/audit, Redis for cache, Kafka/Redpanda for ingest streaming; OPA sidecar for ABAC; OIDC provider for JWT issuance; mTLS mesh.
- **CI/CD**: Turbo + pnpm workspace with pr-quality-gate workflow; evidence bundle job emits checksums, SBOM/SARIF, and acceptance harness results.
- **Observability**: OTel spans/metrics/logs standard; Grafana dashboards for SLOs, burn-rate alerts, and cost; synthetic probes for top flows; chaos drills staged via SRE.

## 5-Day Slice Cadence (Per Epic)

1. **Day 0 Prep**: Confirm scope/non-goals, DoR/DoD alignment, risk register updates, and budget bands. Create ADRs and dependency map.
2. **Day 1-2 Build**: Implement thin slice (schema/config/docs/tests). Wire security controls and provenance hooks. Keep batch size minimal.
3. **Day 3 Validate**: Run acceptance harness (Given/When/Then), lint/type/test, perf smoke vs SLO targets, and policy simulations.
4. **Day 4 Harden**: Address findings, add observability (OTel, logs, metrics), verify rollback path, finalize evidence bundle.
5. **Day 5 Ship**: Canary/feature-flag rollout, post-deploy validation, PIR template readiness, and stakeholder demo cadence update.

## Cross-Epic Alignment Highlights

- **EP1 Product & Governance**: Maintain VSM, JTBD, OKRs aligned to SLO/cost; enforce DoR/DoD and ADR linkage in PRs; keep stakeholder cadence calendar and pricing bands live.
- **EP2 Data & Semantics**: Versioned entity/edge catalog with privacy labels, residency tags, and Neo4j constraints; schema diff tool + linter as CI gate; golden graph fixtures for tests.
- **EP3 Ingest**: Connector SDK (S3/HTTP) with provenance attach, dedupe/upsert patterns, backpressure/DLQ, redaction/tokenization, schema drift alerts, and restart-safe state.
- **EP4 GraphQL/API**: SDL v1 with resolver batching/dataloader, OIDC/JWT authn + OPA ABAC, rate limits/quotas, persisted queries, paging/backpressure, query cost analyzer, cache strategy, Neo4j DAL, subscriptions p95 ≤250ms, standard error model, pact tests, and OTel hooks.
- **EP5 Frontend**: React/MUI/Cytoscape app scaffold with OIDC flow, search builder, graph viewer, inspector panels, filters/facets, tables/exports, realtime UX, accessibility (WCAG AA), performance budgets, i18n, privacy toolbar, demo/safe mode, telemetry consent, flags, docs, and e2e tests.
- **EP6 Security/Privacy**: STRIDE threat model, KMS/rotation, mesh mTLS, field-level encryption, ABAC rego tests, secrets hygiene, DPIA/DSR flows, SCIM provisioning, WebAuthn optionality, immutable audit chain, pen-test readiness, backup/restore drills, warrant/authority binding, secret rotation drills.
- **EP7 Observability/Reliability**: OTel everywhere, Prom business metrics, structured log schema, sampling plan, Grafana dashboards, burn-rate alerts, synthetic probes, capacity/scaling guides, chaos drills, Neo4j/Postgres runbooks, failover plans, sharding guide, on-call SOP, PIR template, FinOps dashboards, perf baselines.
- **EP8 AI/RAG**: Corpus/license audit, chunk/embed strategy, hybrid index build, RAG orchestrator with enforced citations, guardrails, prompt library, eval harness, token budgets, GDS jobs, explainability UI, safety red-team findings, model registry, offline batch flows, flags, privacy-safe modes, export with citations, A/B telemetry.
- **EP9 CI/CD & DevEx**: Monorepo layout, branch protections, lint/format/type gates, test pyramid with ≥80% cov, SBOM/scans, build caching, compose dev stack, Helm charts, Terraform baseline, Argo/canary rollout, OPA simulation, evidence bundles, secrets management, Infracost, golden seeds, CDN for static, release automation, dev docs.
- **EP10 Compliance & Audit**: Ledger service, claim↔evidence schema, signed export manifest, license/TOS classifier, policy reasoner, access reviews, residency gates, legal hold, DSR workflow, redaction APIs, audit hooks, compliance dashboards, SOC2 readiness, data sharing contracts, encryption posture, key rotation, IR playbook, evidence on release.
- **EP11 Release & GTM**: Release cadence/calendar, tagging script, post-deploy validation, enablement plan, solution demos, public docs site, training assets, changelog automation, migration guides, sandbox tenants, feedback funnel, pricing review, EOL policy, release notes template, advisory council cadence, KPI roll-ups, GTM one-pager.

## Dependency Management & Risk Controls

- Use dependency tags in backlog.csv; enforce pre-flight checks before downstream tasks (e.g., EP2 schema before EP4 resolvers).
- Maintain RAID register with mitigations and owners; top risks: security regressions, schema drift, ingest backpressure, cost overruns, SLO breaches.
- Feature flags + canary defaults; rollback via Helm/Argo values and data migrations with forward/backward compatibility.

## Evidence & Provenance Workflow

- Each PR bundles: artifacts, test outputs, SLO checks, cost deltas, dashboards/screenshots, hash tree (inputs→transform→outputs), and rollback notes.
- Acceptance harness (Given/When/Then) wired to CI; pact/contract tests for APIs and schema linter for data contracts.
- Attach provenance IDs to events/logs/metrics and ledger entries for tamper evidence.

## Testing & Quality Gates

- Unit + integration + property tests per package; pact tests for GraphQL; Playwright for FE; k6 for ingest throughput; chaos drills for resilience.
- CI gates: lint/format/typecheck, schema linter, security scans (SBOM/SARIF), policy simulation (OPA), coverage threshold ≥80% for touched code, perf smoke vs SLO, evidence bundle upload.

## Rollout, Monitoring, and Rollback

- **Rollout**: Canary with traffic shaping and rate limits; feature flags for risky paths; persisted queries/allowlist before enablement.
- **Monitoring**: OTel traces, Prom metrics (SLOs, cost), structured logs with provenance IDs; synthetic probes; burn-rate alerts; dashboards per service.
- **Rollback**: Automated Helm/Argo rollback, DB migration rollback plan, cached persisted queries restore, feature flag killswitch, and ingest replay with idempotent upserts.

## Innovation Opportunities (Forward-Looking)

- **Adaptive Query Costing**: Dynamic cost models combining historical latency with graph topology features to pre-empt expensive GraphQL queries.
- **Provenance-Aware Feature Flags**: Flags that include provenance conditions (source trust level, residency) to gate features dynamically.
- **RAG Budget Optimizer**: Token-aware routing that shifts between vector/BM25 and graph-based retrieval based on latency/cost envelopes.
- **Intelligent Backpressure**: OTel-driven feedback loop adjusting connector concurrency based on p95 ingest latency and DLQ depth.

## Post-Merge Validation Plan

- Run acceptance harness, pact suite, and schema linter; verify dashboards and burn-rate alerts; execute post-deploy validation job; capture PIR template for any incident; update stakeholder cadence/calendar.
