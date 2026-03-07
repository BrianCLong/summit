# Summit Architecture Whitepaper (GA Edition)

## Executive Summary

- Summit is an intelligence analysis platform that couples a TypeScript/Node API, a React client, and a graph-first data plane (PostgreSQL + Neo4j) packaged with Redis, Elasticsearch, Prometheus, Grafana, Jaeger, and Alertmanager for observability and control. It runs as a pnpm workspace with Dockerized dependencies and health-checked services. 【F:docker-compose.dev.yml†L1-L205】
- The system addresses investigation-to-report workflows by enforcing policy-by-default access, multi-tenant residency controls, and export provenance while preserving analyst speed through cached graph queries and governed LLM routing. 【F:server/src/context/tenant.ts†L61-L212】【F:server/src/db/migrations/007_export_manifests.sql†L1-L111】【F:server/src/services/llm/LLMRouter.ts†L17-L121】
- Target users are enterprise and government teams that require verifiable controls (provenance, residency, SBOMs, SLOs) and need operational kill switches, cost ceilings, and audit trails built into the stack rather than bolted on. 【F:server/src/middleware/safety-mode.ts†L17-L74】【F:server/src/services/llm/policies/CostControlPolicy.ts†L4-L89】【F:server/src/db/migrations/007_export_manifests.sql†L120-L207】

## System Overview

- **Service topology:** Docker Compose wires Postgres (case metadata), Neo4j (graph store), Redis (queues/cache), Elasticsearch (search), API (Express/GraphQL), dev gateway, Web client, websocket server, SLO exporter, Prometheus, Grafana, Jaeger, Loki, Alertmanager, and AI sandbox; each service declares health checks and Prometheus scrape labels. 【F:docker-compose.dev.yml†L1-L340】
- **Data flow:** Client → Gateway → API → Postgres/Neo4j with Redis-backed caches; exports are materialized into manifest-tracked bundles with integrity hashes, and metrics are emitted to Prometheus and scraped into Grafana dashboards. 【F:docker-compose.dev.yml†L120-L262】【F:server/src/db/migrations/007_export_manifests.sql†L1-L111】
- **Governed pipelines:** LLM calls traverse the LLMRouter (policy selection + guardrails) before provider execution; exports and policy decisions feed Prometheus-backed governance metrics for go/no-go dashboards. 【F:server/src/services/llm/LLMRouter.ts†L17-L121】【F:server/src/governance/analytics/governance-metrics-service.ts†L20-L120】

## Governance by Design

- **Enforced ownership:** CODEOWNERS assigns mandatory reviewers for server, policies, GraphQL contracts, docs, and workflows to prevent unowned changes. 【F:CODEOWNERS†L1-L18】
- **GA gate baseline:** The `required-gates` workflow blocks merges without lint, unit tests, contract tests, E2E, OPA policy simulation, CycloneDX SBOM, and provenance verification, mirroring the GA readiness bar. 【F:.github/workflows/required-gates.yml†L5-L31】
- **Quality lanes:** `pr-quality-gate` runs lint, typecheck, security audit, unit tests, and golden-path smoke with full stack bootstrapping, providing early CI evidence for governance sign-off. 【F:.github/workflows/pr-quality-gate.yml†L15-L102】

## Security & Supply Chain Integrity

- **SBOM + provenance:** GA release workflow builds artifacts, generates CycloneDX SBOMs, signs and attests container images with Cosign, and emits SLSA provenance metadata. 【F:.github/workflows/release-ga.yml†L9-L37】
- **Provenance verification:** CI generates SHA-256 manifests for build artifacts and verifies them to detect tampering before release packaging. 【F:.ci/gen-provenance.js†L1-L34】【F:.ci/verify-provenance.js†L1-L34】
- **Dependency risk gating:** Required gates run OPA policy tests and SBOM generation on every protected branch PR; audits run in `pr-quality-gate` to surface high/critical issues early. 【F:.github/workflows/required-gates.yml†L18-L31】【F:.github/workflows/pr-quality-gate.yml†L60-L89】
- **Path to SLSA L3+:** Air-gapped SLSA L3 pipeline defines attested, offline-capable builds with FIPS toggles and media controls, providing the scaffolding to elevate provenance to SLSA L3+ when fully activated. 【F:.github/workflows/slsa-l3-airgap-build.yml†L1-L75】

## Multi-Tenant Isolation & Safety

- **TenantContext enforcement:** Every request resolves tenant context from Postgres with residency class, allowed regions, export restrictions, quotas, and feature entitlements; cross-tenant access without ownership raises explicit GraphQL errors. 【F:server/src/context/tenant.ts†L61-L212】【F:server/src/context/tenant.ts†L250-L319】
- **Residency and region checks:** Region validation blocks writes outside the tenant’s region without an export token and enforces stricter rules for restricted/sovereign tenants. 【F:server/src/context/tenant.ts†L214-L268】
- **Blast-radius controls:** Global kill switches and safe-mode middleware short-circuit mutating or high-risk routes, returning 503s while maintaining read-only access. 【F:server/src/middleware/safety-mode.ts†L17-L74】

## LLM Governance & Cost Control

- **Router with policies:** LLMRouter applies routing policies before selecting providers; defaults favor cost-control with optional latency overrides, ensuring policy-based provider selection per task type. 【F:server/src/services/llm/LLMRouter.ts†L34-L104】
- **Budget ceilings:** CostControlPolicy tracks global and per-tenant spend, filters providers when budgets are exceeded, and prefers cheapest eligible models; budgets are defined in the router config. 【F:server/src/services/llm/policies/CostControlPolicy.ts†L4-L89】【F:server/src/config/llm-router.config.ts†L1-L38】
- **Abuse & exfiltration defenses:** PIIGuardrail redacts sensitive tokens pre/post-call; router observability logs every LLM invocation with success/failure labels for downstream alerting. 【F:server/src/services/llm/guardrails/PIIGuardrail.ts†L1-L32】【F:server/src/services/llm/LLMRouter.ts†L104-L134】

## Observability & Reliability

- **Metrics surface:** DeploymentMetrics middleware exports HTTP latency, error rates, health check status, feature-flag cache hits, deployment counters, and rollbacks through prom-client, feeding Prometheus/Grafana. 【F:server/src/middleware/deployment-metrics.ts†L1-L118】
- **Governance dashboarding:** Governance metrics service pulls Prometheus queries, caches in Redis, and updates gauges for validation rate, compliance gaps, and risk scores with p95 latency targets. 【F:server/src/governance/analytics/governance-metrics-service.ts†L20-L120】
- **Error budgets & kill switches:** SLOBudgetManager tracks SLOs, burn rates, and defines kill switches that trigger rollback, stop-deployment, or circuit-breaker actions when budgets fall below thresholds. 【F:src/slo/SLOBudgetManager.ts†L1-L85】【F:src/slo/SLOBudgetManager.ts†L120-L203】
- **Operational signals:** Compose stack provisions Prometheus, Alertmanager, Grafana, Jaeger, Loki, and promtail with service health checks to ensure telemetry continuity. 【F:docker-compose.dev.yml†L190-L340】
- **Resilience drills:** Release-train stage validation runs smoke, health, GraphQL introspection, and latency probes against the release candidate before promotion, ensuring reliability regressions are caught with production-like signals. 【F:.github/workflows/release-train.yml†L439-L485】

## GA Validation & Evidence

- **Release-candidate governance:** The release-train workflow enforces GA validation for every release candidate by running the `validate-whitepaper` gate, guaranteeing governance and policy coverage stay in lock-step with the documented controls. 【F:.github/workflows/release-train.yml†L41-L191】
- **Evidence bundle traceability:** The whitepaper references attested SBOMs, Cosign signatures, and SLSA provenance to satisfy evidence-bundle requirements before a release candidate is allowed to proceed to staging promotion. 【F:.github/workflows/release-ga.yml†L7-L37】【F:.ci/gen-provenance.js†L1-L34】
- **Reliability assurances:** Stage validation and SLO budget checks feed into release summaries to prove the candidate meets error-budget, latency, and readiness thresholds before the GA go/no-go checkpoint. 【F:.github/workflows/release-train.yml†L439-L485】

## Auditability & Evidence

- **Export manifests:** Deterministic export manifests store hashes, transform chains, verification status, and download audit logs; GA gate metric function enforces ≥95% manifest integrity. 【F:server/src/db/migrations/007_export_manifests.sql†L1-L207】
- **Appeal and policy trails:** Governance metrics and policy decision logs feed Prometheus-backed analytics, enabling traceable validation rates and compliance gap tracking per tenant. 【F:server/src/governance/analytics/governance-metrics-service.ts†L74-L120】
- **Evidence bundles:** Provenance manifest generation and SBOM attestation steps create verifiable evidence artifacts for release packages. 【F:.ci/gen-provenance.js†L1-L34】【F:.github/workflows/release-ga.yml†L18-L36】

## Operational Control Plane

- **Feature-flag console:** Safety-mode middleware consumes cached feature flag state, enabling centralized kill switches and safe-mode toggles for risky endpoints without redeploy. 【F:server/src/middleware/safety-mode.ts†L17-L74】
- **Runbook-driven response:** Assistant runbook defines SLOs, dashboards, canary/rollback steps, and feature flag toggles (e.g., `ASSISTANT_ENABLED` kill switch) to standardize incident handling. 【F:server/RUNBOOKS.md†L5-L68】
- **Command surfaces:** DeploymentMetrics and governance metrics expose HTTP endpoints via Prometheus to drive go/no-go dashboards and operational reports. 【F:server/src/middleware/deployment-metrics.ts†L1-L118】【F:server/src/governance/analytics/governance-metrics-service.ts†L20-L120】

## Threat Model & Limits

- **Tenancy boundaries:** Cross-tenant resource access is rejected unless ownership matches; residency violations for write/export operations are denied unless explicit export tokens are present. 【F:server/src/context/tenant.ts†L214-L319】
- **Mutation safety:** Global kill switch blocks mutating HTTP verbs and GraphQL mutations when activated, limiting blast radius during incidents. 【F:server/src/middleware/safety-mode.ts†L17-L74】
- **LLM guardrails:** Current PII guardrails rely on pattern-based redaction; they do not yet include model-aware prompt injection defenses and should be complemented with upstream filters. 【F:server/src/services/llm/guardrails/PIIGuardrail.ts†L1-L32】
- **Budget tracking scope:** Cost ceilings are in-memory and require persistent backing (e.g., Redis) for multi-instance enforcement; until then, they apply per-process. 【F:server/src/services/llm/policies/CostControlPolicy.ts†L4-L89】

## Future Roadmap (Non-Speculative)

- **OPA enforcement expansion (future):** Existing policy test gates and residency enforcement will be extended to fully externalized OPA bundles for write paths and export approvals. (Future—supported by current policy test workflow and residency middleware.) 【F:.github/workflows/required-gates.yml†L25-L31】【F:server/src/context/tenant.ts†L214-L319】
- **Per-tenant cryptographic isolation (future):** Export manifest hashing and download audits are in place; next step is per-tenant keying for manifest/bundle encryption to harden sovereign workloads. (Future—builds on manifest pipeline.) 【F:server/src/db/migrations/007_export_manifests.sql†L1-L207】
- **External attestations (future):** Release GA and SLSA L3 air-gap pipelines already sign and attest images; roadmap adds third-party attest verifiers and WORM storage for evidence bundles. (Future—leverages existing Cosign/SLSA steps.) 【F:.github/workflows/release-ga.yml†L18-L36】【F:.github/workflows/slsa-l3-airgap-build.yml†L1-L75】
