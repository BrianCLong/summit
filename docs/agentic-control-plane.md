# Summit Agentic Control Plane: Product & Architecture Blueprint

## Overview
This blueprint defines the production-grade Summit Agentic Control Plane that unifies DevOps/PR agent factories, governance & compliance automation, and ROI/reliability observability across GitHub, CI, and enterprise environments.

## Objectives
- Ship a licensable control-plane vertical slice that proves merge velocity, quality, and reliability uplift.
- Provide governance-by-default: immutable event trail, policy packs, mTLS/PQC identity, and SOC2/NIST-aligned controls.
- Offer ROI clarity with live metrics, baselines, and uplift reporting per tenant, pipeline, and agent portfolio.

## Core Surfaces
1. **DevOps/PR Agent Factory**
   - One-click pipelines: `summit agent run --pipeline pr-security` spawns PR reviewers/fixers with rate-limited backpressure, YAML taxonomy maintenance, and GitHub App identities.
   - Security: mTLS with PQC-ready keys (hybrid Kyber + Ed25519 for transition), short-lived certs from internal CA, per-agent SVID issuance.
   - Guardrails: branch protection hooks, policy-as-code on allowed file scopes, sandboxed tool execution with resource ceilings.

2. **Governance + Compliance Layer**
   - Continuous scanners for PRs/configs/agent actions against SOC2/NIST mappings and tenant policy packs.
   - Immutable ledger: append-only event log with hash-chained records and optional C2PA-style attestations per automated action.
   - Access: multi-tenant RBAC/ABAC, per-tenant secrets domains, tamper-evident audit artifacts exportable to GRC.

3. **ROI & Reliability Dashboard**
   - Metrics: PR lead time, review turnaround, context-switch reductions, defect escape rate, incident MTTR, SLO adherence.
   - Portfolios: per-agent/pipeline/tenant ROI cards with baseline vs uplift, budget utilization, and reliability posture.
   - Export: CSV/Parquet snapshots, webhook feeds to BI, and Grafana-compatible dashboards.

## Architecture
- **Control Plane API** (NestJS Fastify mode): GraphQL + REST façade exposing agent factory, policy checks, metrics reads, and event ingestion. gRPC gateway serves runner sidecars.
- **Event Bus**: NATS JetStream for command/control; Kafka or Redpanda as optional long-retention ledger sink. Topic schema: `cp.commands.*`, `cp.events.*`, `cp.audit.*`.
- **Workflow Orchestrator**: Temporal with worker queues per tenant and per pipeline class. Activities: `ingestWebhook`, `fetchBaseline`, `runPolicyPack`, `autoFix`, `emitCheck`, `appendLedger`, `updateROI`. All activities idempotent, with deterministic timeouts and exponential backoff.
- **Identity & Trust**: SPIFFE/SPIRE for mTLS SVID issuance; PQC hybrid certs (Kyber + Ed25519) stored in HSM or HashiCorp Vault Transit. Step-up signing for high-risk actions.
- **Data Plane Adapters**: GitHub App webhooks, GitHub Checks API, CI adapters (GitHub Actions, Jenkins, GitLab), and CLI runner for air-gapped tenants.
- **Storage**:
  - Postgres: tenants, policies, metrics baselines, pipeline configs, ROI rolls, audit pointer index.
  - Object store: artifacts, attestations, exported audit bundles.
  - Event ledger: append-only table with hash chain + Merkle roots persisted per epoch; optional export to Parquet on object storage.
- **Observability**: OpenTelemetry tracing, Prometheus metrics (pipeline durations, policy failures, ROI deltas), structured logs with tenant/agent IDs. Trace sampling elevated for failed or policy-denied runs.

### Service Boundaries (deployable units)
- **api-gateway**: GraphQL/REST/gRPC gateway with authz middleware and request signing verification.
- **orchestrator**: Temporal server/worker pair with pipeline definitions and activity workers.
- **policy-engine**: OPA/Rego server with hot-reloadable policy packs and bundle provenance checks.
- **ledger-writer**: Append-only event recorder exposing Merkle root anchoring and attestation generation.
- **metrics-roi**: Metrics ETL, baseline calculator, uplift scorer, and Grafana datasource proxy.
- **adapters-github**: Webhook ingress, Checks API publisher, GitHub App token minting, and branch protection enforcer.
- **runner-sandbox**: Firecracker/gVisor-powered tool execution with egress policies and rate limiting.
- **cli**: `summit agent` commands with offline cache for air-gapped mirroring.

### Data Contracts
- **Ledger event**: `{id, run_id, seq, tenant_id, kind, payload_json, prev_hash, hash, merkle_root, sig, created_at}`; signed by ledger-writer SVID and mirrored to object storage every 10 minutes.
- **Policy decision**: `{run_id, pack_id, input_sha, decision, rationale[], controls[]}`. Hash committed into ledger and referenced in GitHub Check summary.
- **ROI observation**: `{tenant_id, run_id, metric, value, baseline, uplift, confidence}` with aggregation windows (P7D, P30D, P90D).

### Vertical Slice (MVP)
- **Scenario**: GitHub PR tagged `control-plane:pr-security` triggers agent pipeline with tenant isolation enforced via SPIFFE trust domain and Temporal namespace.
- **Flow**:
  1. GitHub webhook → api-gateway verifies HMAC + GitHub App JWT, looks up tenant policy pack, and issues short-lived agent identity.
  2. Orchestrator executes activities: baseline metrics lookup → static analysis (ESLint/Semgrep) → policy sweep (license, secrets, IaC drift) → auto-fix patch → submit GitHub Check run with SARIF + threaded comments → gate merge via required status.
  3. Governance recorder writes hash-chained events (start, findings, patches, approvals) and emits C2PA attestation for applied changes plus in-toto layout for supply-chain evidence.
  4. Metrics service updates ROI dashboard: PR lead time prediction, defect risk delta, MTTR impact estimate, velocity uplift projection, and budget burn vs target.
- **Interfaces**: CLI `summit agent run --pipeline pr-security --pr <id>` and API `POST /pipelines/pr-security/run` with tenant context. Additional hook: `POST /tenants/{id}/attestations/export` for audit handoff.

### Security & Compliance
- Threat model: webhook spoofing, policy bypass, ledger tampering, agent prompt injection, cross-tenant leakage, downgrade attacks on crypto, time-of-check/time-of-use gaps on branch protection.
- Controls:
  - mTLS + request signing for all internal hops; GitHub App JWT verification at ingress and status revalidation before merging.
  - Policy-as-code engine (OPA/Rego) with allow/deny + rationale; per-tenant pack selection enforced before execution and on every re-run; bundle signatures checked against Sigstore keyring.
  - Sandboxed tool runners (Firecracker/microVM or gVisor) with egress policies; rate limiter per tenant/agent; seccomp/BPF profiles per tool class.
  - Immutable audit: hash chain + periodic Merkle root anchoring; storage encryption at rest; access logs with user/agent attribution; tamper alarms when ledger gaps detected.
  - PQC readiness: hybrid certs, Kyber key rotation every 7 days, downgrade detection, and CRL/OCSP stapling for revoked SVIDs.

### Data Model (initial tables)
- `tenants(id, name, compliance_profile, trust_domain, created_at)`
- `agent_pipelines(id, tenant_id, name, type, config_json, slo_targets, temporal_namespace)`
- `runs(id, pipeline_id, tenant_id, status, started_at, ended_at, git_ref, git_repo, initiator, attestation_uri)`
- `events(id, run_id, seq, kind, payload_json, prev_hash, hash, created_at, anchored_at)`
- `metrics_baselines(tenant_id, metric, baseline_value, window, source)`
- `metrics_observations(id, tenant_id, run_id, metric, value, window_start, window_end)`
- `policy_packs(id, tenant_id, name, version, source_repo, checksum, signature_uri)`
- `attestations(id, run_id, type, uri, digest, issued_by)`
- `budget_rollups(id, tenant_id, window, spend, target, variance)`

### Interfaces & APIs
- **GraphQL**: `runPipeline(pipelineId, prUrl, tenantId)`, `pipelineRuns(filter)`, `agentPortfolios`, `roiSummary(tenantId)`.
- **REST**:
  - `POST /pipelines/{pipelineId}/run`
  - `GET /runs/{id}`
  - `GET /tenants/{id}/roi`
  - `POST /policies/{packId}/evaluate`
- **CLI**: `summit agent run --pipeline pr-security --repo <url> --pr <num> --tenant <id> --attest --export-ledger`.

### Observability & SLOs
- Metrics: `pipeline_duration_seconds`, `policy_violation_total`, `auto_fix_applied_total`, `roi_delta`, `pr_lead_time_hours`, `mttr_hours`.
- Logs: JSON with `tenant_id`, `agent_id`, `run_id`, `policy_pack`, `decision`, `latency_ms`.
- Alerts: SLO burn for pipeline latency, failure rates, ledger append errors, webhook auth failures.

### Deployment Hardening
- **Profiles**: air-gapped (CLI + Git mirror), standard (GitHub webhooks + Actions), and hybrid (control-plane central, runners per-tenant VPC). Air-gapped flow batches webhook payloads via signed bundle and uses `summit agent mirror` for repo sync.
- **Kubernetes baseline**: Helm chart with PodSecurityStandards restricted, runtimeClass for gVisor/Firecracker, NetworkPolicies denying egress except allowlists, Vault injector for secrets, and node affinity for runner isolation.
- **Secrets**: sourced from Vault/KMS; no static tokens. PQC key rotation every 7 days. GitHub App keys stored in HSM-backed secrets engine.
- **Backup/DR**: Postgres PITR enabled; ledger and artifact buckets versioned; daily Merkle root anchor stored offsite.

## Testing Strategy
- Unit: policy evaluation, ledger hash chaining, metrics normalization.
- Integration: webhook → pipeline → GitHub Check → ledger write → ROI update (happy path + failure injection).
- Property-based: hash chain invariants, idempotent replays of runs, and rate limiter fairness.
- Security: signature forgery tests, sandbox escape attempts, privilege escalation checks.
- Performance: throughput targets (p95 < 90s per PR pipeline on medium repo), ledger writes <50ms p95.

## Governance & Audit Artifacts
- Automatically produce: SARIF for findings, attestation bundles (in-toto/C2PA), and audit CSVs per run.
- Ledger export supports Parquet for BI and long-term retention with checksum manifests.
- Reviewer checklists baked into PR comments; approvals require policy clean bill and attestation presence.

### Runbooks
- **On-call**: rotate daily, with runbook covering webhook auth failures, Temporal backlog spikes, ledger append errors, and GitHub rate-limit handling.
- **Change management**: policy pack updates require signed bundle + canary namespace, auto-roll back on deny-rate regression >5%.
- **Incident response**: disable pipelines per tenant via feature flag, revoke SVIDs via SPIRE, and replay ledger gaps from object storage snapshots.

## ROI & Reliability Reporting
- Baselines pulled per tenant; uplift calculated per metric with confidence intervals.
- Portfolio ranking: weighted ROI score combining velocity gain, defect reduction, and reliability uplift.
- Dashboard feed: Prometheus → Grafana panels; weekly CSV digest to finance/ops.

## Innovation: IntelGraph-augmented Policy Reasoner
- Leverage IntelGraph signals (code provenance, developer-context graph, incident history) to prioritize checks and propose fixes ranked by expected ROI and reliability impact.
- Adaptive agent portfolios: auto-tune pipelines based on portfolio performance and tenant compliance drift.

## Next Steps for Implementation
- Scaffold `pipelines/pr-security` service with webhook ingress, OPA integration, ledger writer, and Temporal workflow registration.
- Add CLI binding `summit agent run` that proxies to control-plane API and prints attestation URIs; include offline mirror flag for air-gapped tenants.
- Stand up Postgres migrations for tables above; add NATS/JetStream topic schema for commands/events and retention policies.
- Wire OpenTelemetry and Prometheus exporters; define Grafana dashboard JSON for MVP metrics and SLO burn charts.
- Prepare compliance runbook: SOC2 CC6/CC7 mappings, NIST 800-53 controls for logging/identity; pre-bake evidence export pipeline.
