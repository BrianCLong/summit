# CompanyOS Track B Fabric Blueprints (IntelGraph, Maestro Conductor, Governance, Security, Audit, Resilience, Templates, FinOps)

## 1) IntelGraph v1 — Provenance-First Knowledge Graph

### 1.1 Architecture Decision Record (ADR)
- **Node types:** User, Account, Tenant, Team, IdentityProvider, Service, Component, Dataset, Artifact (file/model/image), Run (job/pipeline), Deployment, Build, Commit, Incident, Alert, Ticket, Policy, Environment, Region, SecretVersion, EvidenceBundle.
- **Edge types (directed, time-versioned):** `PERFORMS(User→Run)`, `OWNS(Account→Service|Dataset|Artifact)`, `DEPLOYS(Deployment→Service)`, `BUILDS(Build→Artifact)`, `PRODUCES(Run→Artifact|Dataset)`, `CONSUMES(Service|Run→Dataset|Artifact)`, `OBSERVES(Service→Incident)`, `REMEDIATES(Run→Incident)`, `RELATES_TO(Incident→Dataset|Artifact|Service)`, `APPROVES(User→Deployment|Policy)`, `GOVERNED_BY(Service|Dataset→Policy)`, `LOCATED_IN(Resource→Region)`, `DERIVED_FROM(Artifact|Dataset→Artifact|Dataset)`, `MENTIONS(Ticket→Incident|Service|Dataset)`, `EMITS(Service→Event)`, `SIGNED_BY(Artifact→User|Service)`, `EVIDENCES(EvidenceBundle→Edge|Node)`.
- **Provenance envelope (attached to every edge):** `{ actor_id, actor_type (user/service), actor_authn (svid/mTLS/jwt), source_system, observed_at, effective_at, expires_at?, reason, evidence_refs[], integrity_hash, signature, ingestion_version, confidence (0–1), privacy_tier, pii_flags, tenant_id }`.
- **Governance:** All edges must include tenant and region; write-path enforces policy via OPA hooks; append-only immutable ledger copies to `prov-ledger` package.

### 1.2 Access Patterns (<1s targets)
- `Artifact lineage`: upstream/downstream within 3 hops (Commit → Build → Artifact → Deployment → Service → Dataset → Feature/User). Index on `artifact_id`, edge type, and `effective_at`.
- `Incident impact`: traverse from Incident to affected Services, Deployments, Datasets, and Users with filters by region/tenant.
- `Change audit`: time-bounded edge queries (by `observed_at` and actor) for a resource ID.
- `Service surface`: all incidents, deployments, datasets linked to Service Y (fan-in/out ≤200 typical; bounded traversal depth 4).
- `Provenance validation`: fetch edge plus integrity hash + signature chain.

### 1.3 Schema & Storage
- **Storage:** Graph-on-relational using PostgreSQL + pgvector/JSONB for attributes; optional Neo4j read-replica for exploratory queries. Primary tables: `nodes(id, type, tenant_id, region, body jsonb, valid_from, valid_to)`, `edges(id, src_id, dst_id, type, tenant_id, region, provenance jsonb, valid_from, valid_to, deleted boolean default false)`, GIN indexes on `type`, `tenant_id`, `region`, `body`, and BRIN on temporal fields. Integrity hashes stored in `prov_ledger(chain_id, edge_id, hash, prev_hash, signature, created_at)`.
- **Partitioning:** `tenant_id` hash-partitioned; `region` sub-partitions. Cross-region replication uses logical decoding + per-tenant allowlist. Sovereign tenants can be isolated to dedicated clusters.
- **Versioning:** bitemporal (`valid_from/valid_to` + `observed_at`). Schema migrations via Alembic/Prisma-style changelog with compatibility views; GraphQL schema versioned via header `X-IntelGraph-Version` with additive changes default.

### 1.4 Ingest Pipelines
- **CI/CD ingest:** GitHub/GitLab webhooks → Event Bus → `intelgraph-ingestor` worker. Upserts Commit, Build, Deployment nodes; edges `BUILDS`, `DEPLOYS`, `APPROVES`. Idempotent via `natural_key = {tenant_id, source_system, external_id}`; dedupe with `ON CONFLICT DO UPDATE` and hash comparison. Provenance captures webhook signature + actor.
- **Data Spine lineage ingest:** Data Spine emits lineage (Dataset A → Derived Dataset B). Kafka topic `lineage.v1` → `intelgraph-lineage-consumer` → upsert Dataset/Artifact/Run nodes + `DERIVED_FROM` edges with transformation metadata and privacy tiers. Idempotent via `run_id + dataset_id` composite key; late-arriving events accepted with corrected `effective_at` and superseded temporal window.

### 1.5 Query APIs
- **GraphQL/REST:** `/graph/related?artifact_id=X` returns node, neighbors (≤4 hops), provenance summaries; `/graph/service/{service_id}/surface` returns incidents, deployments, datasets with filters (`since`, `region`).
- **Example (curl):** `curl -H "Authorization: Bearer $TOKEN" "https://intelgraph/api/graph/related?artifact_id=art_123&depth=4"`.
- **SQL-esque (pg + pgRouting):** `SELECT * FROM edges WHERE src_id = :artifact_id OR dst_id = :artifact_id ORDER BY observed_at DESC LIMIT 200;`
- **GraphQL example:**
  ```graphql
  query ServiceSurface($id: ID!, $since: DateTime) {
    service(id: $id) {
      id
      deployments(since: $since) { id version status provenance { actorId sourceSystem } }
      incidents { id severity status }
      datasets { id name classification }
    }
  }
  ```

### 1.6 Definition of Done
- **Demo path:** Commit → Build → Artifact → Deployment → Service → Dataset → Feature toggle → User cohort; provenance chips visible at each hop; integrity hash chain validated.
- **Docs:** "Publish to IntelGraph" guide (per-ingestor contract, auth, tenant/region headers) and "Query IntelGraph" guide (GraphQL/REST/SQL patterns, pagination, RBAC filters).

## 2) Maestro Conductor (MC) v1 — Orchestration Layer

### 2.1 Execution Model & ADR
- **Plan:** Declarative DAG of steps with dependencies, policies, timeouts, retries, compensations, and rollout/rollback hooks. Steps carry `action_type` (http, script, workflow, manual), `sensitivity` (low/medium/high), `approval_policy`, `success_condition`, `on_failure`.
- **Run:** Instantiated Plan with context (env vars, artifacts, tenant, region, requester). Run states: `pending → evaluating_policies → running → waiting_manual → success | failed | canceled | rolled_back`. Step states tracked independently.
- **Failure semantics:** Exponential backoff retries with jitter; compensations executed in reverse dependency order; manual intervention required when policy denies, compensations fail, or guardrail trip; runbook links stored per step.

### 2.2 Workflow Engine
- **Service:** MC API + scheduler + worker pool. Stores Plans/Runs in PostgreSQL; emits events to Audit Spine & IntelGraph (`PLAN_CREATED`, `RUN_STARTED`, `STEP_TRANSITIONED`, `RUN_COMPLETED`). Supports cron and ad-hoc triggers.
- **State transitions:** event-sourced; deterministic replays; at-least-once execution with idempotent step handlers (idempotency keys per step-run).

### 2.3 Policy Integration
- **OPA/ABAC hooks:**
  - Plan approval: evaluate `plan_approval.rego` with requester, plan metadata, risk score.
  - Step execution: `step_guard.rego` called before sensitive actions; can require step-up auth or break-glass.
  - Sensitive outputs: redact via policy-managed field list.
- **Identity:** mTLS + SPIFFE IDs between MC and executors; short-lived tokens for steps invoking external systems.

### 2.4 Developer API
- **Spec:** YAML (`mcplan.yaml`) with schemas for plan metadata, steps, policies, secrets refs. Node/TS SDK builds + validates; CLI `mc plan submit`.
- **Example — Safe deploy with canary + rollback:** canary rollout 10% → health check → 50% → 100% or rollback via previous artifact; gates on error budget and OPA approval.
- **Example — Incident mitigation:** detect incident → page on-call → cordon traffic → apply feature flag → run fix script → verify metrics → uncordon.

### 2.5 Definition of Done
- **Demo:** Run deployment plan with policy checks; failure at 50% triggers rollback step automatically; events visible in Audit Spine and IntelGraph.
- **Guide:** "Define and register a Plan" (YAML + SDK) and "Connect executors" (auth, policy hooks, observability).

## 3) Governance & Policy Packs v1 — OPA Bundles

### 3.1 Policy Taxonomy & ADR
- Domains: Identity (authN/Z), Service access, Data access/classification, Residency/export controls, DLP, Change management. Ownership: Security governs identity/residency/DLP; Data Gov owns data classification; Service owners co-own service policies; Change Advisory Board approves change policies. Changes require PR + peer review + simulation results.

### 3.2 Policy Bundles
- **Service-level access:** `service_access.rego` enforcing caller identity, method, origin CIDR, time-of-day, and risk score. Includes allowlisting for health checks.
- **Data residency:** uses Data Spine classification labels; blocks reads/writes across disallowed regions; supports `sovereign` tenants with stricter rules.
- **DLP:** prevents exporting PII/PCI/PHI to non-approved regions or channels; masks sensitive fields; rate-limits bulk exports.

### 3.3 Lifecycle & Distribution
- Versioned bundles stored in OCI registry (`companyos/policy-bundles:{semver}`) with signed manifests. Sidecars pull on interval with canary/gradual rollout and rollback via pinned version. Change log auto-emitted to Audit Spine.

### 3.4 Testing & Simulation
- Harness using `conftest` + fixtures; CI runs unit tests + golden cases; `dry-run` mode logs would-be denies with context. Policy impact report attached to PR.

### 3.5 Definition of Done
- Critical service (e.g., AuthZ Gateway) enforcing service-access + residency bundle. Playbook: author policy → add tests → run `make policy-test` → stage dry-run → canary rollout → full deploy with audit evidence.

## 4) Security Fabric v1 — Secrets & Service Identity

### 4.1 Threat & Trust Model ADR
- Trust boundaries per environment (dev/stage/prod) and per tenant. All service-to-service calls require authenticated identity; least-privilege; segregated VPCs. Risks: secret leakage in code/images/logs; MITM on internal calls; stolen tokens; over-privileged roles; insecure 3P egress.

### 4.2 Secret Management Integration
- Central manager (e.g., Vault/KMS/SM). Apps fetch at startup via sidecar/SDK; auto-refresh using lease renewal; secrets mounted as tmpfs; config uses secret references (`secret://db/primary`). CI redacts secrets, disallows plaintext via scanner; no secrets in container layers.

### 4.3 Service Identity
- SPIFFE/SVID certificates issued by control plane; short-lived (<24h). mTLS enforced for critical services; audience-restricted JWTs for edge/browser; bound service accounts for cloud APIs. Cert rotation automated with graceful reload.

### 4.4 Scanning & Guardrails
- Pre-merge: git-secrets + trufflehog; CI fails on findings. Runtime: egress firewall allowlist; logging redaction library for PII/credentials; anomaly detection on secret access (UEBA). Outbound calls to unknown endpoints blocked or alerted.

### 4.5 Definition of Done
- Reference service using mTLS + managed secrets end-to-end; secret rotation drill validated; runbook for suspected compromise (revoke credentials, rotate, audit logs, invalidate tokens, incident declare).

## 5) Audit Spine & Event Bus v1

### 5.1 Event Model & ADR
- **Event classes:** Audit (security-sensitive, immutable), Telemetry (metrics/trace), Business (domain events). Audit requires `who/what/when/where/why/how`, actor, resource, request id, tenant, region, outcome, integrity hash, signature chain.
- **Retention/access:** Audit retained ≥400 days; access via RBAC with reason logging; export requires approval and watermarking.

### 5.2 Event Bus & Storage
- Bus: NATS/Kafka with ordered partitions by tenant+resource. Durable audit log store: append-only object storage + index DB (Postgres/ClickHouse) keyed by time/actor/resource. Tamper-evident hash chain per tenant/partition; signatures using service identity keys.

### 5.3 Producers & Consumers
- SDKs (Node/TS/Python/Go) enforce schema, sign events, inject trace IDs. Example consumers: Audit Query API/UI; IntelGraph ingestor; anomaly detector.

### 5.4 Compliance Features
- Integrity verification endpoint; export packs signed and encrypted; WORM buckets for high-compliance tenants.

### 5.5 Definition of Done
- Two systems emitting audit events (e.g., AuthZ Gateway, MC). Demo query: actions on Account X last 30 days via index; runbook for new producer integration.

## 6) Resilience & Chaos Drill Kit v1

### 6.1 Resilience Model & ADR
- Failure modes: DB partition, message-bus outage, bad deploy, third-party outage, secrets rotation failure, cache stampede, runaway costs. Targets: Tier-0 RTO 15m/RPO 0; Tier-1 RTO 60m/RPO 15m; Tier-2 RTO 4h/RPO 1h. Graceful degradation: read-only mode for user workspace; queue write buffering with backpressure; partial feature flags when dependencies down.

### 6.2 Chaos Experiments
- Toolkit (non-prod) to inject latency/errors/blackholes per service with blast-radius caps; schedulable experiments via MC with labels. Metrics captured: error rate, p99 latency, queue depth, saturation.

### 6.3 Runbooks & Automation
- Runbooks for DB partition, bad deploy, 3P outage: triage steps, dashboards, MC plans for rollback/traffic shifting, comms templates. Scripts integrated with MC to automate rollback/cordon.

### 6.4 Validation
- Game day: simulate DB partition; measure MTTD/MTTR; update runbooks; capture evidence in Audit Spine and IntelGraph.

### 6.5 Definition of Done
- Evidence of controlled failure and recovery; document how to propose/run new experiments with approvals + rollback paths.

## 7) Template Factory v1 — Golden Path Scaffolds

### 7.1 Template Strategy & ADR
- Supported stacks: Node/TS + Express/Fastify; Python + FastAPI; Go + Fiber; Worker templates for event-driven jobs. Defaults: observability (OpenTelemetry, Prometheus), security (mTLS client, OPA hooks, secret refs), CI (lint/test/scan), infra manifests (Dockerfile, Helm chart), governance hooks (audit SDK, IntelGraph ingest stub).

### 7.2 Scaffolding Tool
- CLI `summit-template` prompts for service type, database need, region/residency, tenancy mode. Generates repo with CI/CD (GitHub Actions), policy bundle pins, MC plan stubs, Infrastructure-as-Code (Terraform modules references), and cost guardrails.

### 7.3 Starter Kits
- API service with DB: Express/Fastify + Prisma + Postgres; seeded with health, readiness, audit logging, OPA middleware, migration workflow.
- Event-driven worker: consumes from Event Bus/Kafka; structured logging, retry/backoff, idempotency keys, dead-letter queue; IntelGraph ingest sample handler.

### 7.4 Upgrade Path
- Template version manifest per repo; `summit-template doctor` shows drift; `summit-template apply --from vX --to vY` generates patch PR with changelog; conflicts surfaced for manual merge.

### 7.5 Definition of Done
- New service created via Template Factory deployed to non-prod with CI green; "New service in 30 minutes" walkthrough documents steps and commands.

## 8) FinOps & Capacity Railhead v1

### 8.1 Cost Model & ADR
- Allocation: per-tenant, per-service, per-team using tags/labels; shared costs apportioned via weighted usage. KPIs: cost per request, per tenant, per GB stored/egressed, per run; saturation vs spend; error-budget cost coupling.

### 8.2 Dashboards
- Dashboards (Grafana/Looker): top N costly services; cost & utilization trends; idle resources; anomaly detection timelines; unit-cost per tenant; savings opportunities.

### 8.3 Guardrails
- Budget alerts with thresholds (75/90/100%); pre-commit terraform policy to cap autoscaling; runtime SLO-aware scaling limits; early-warning alerts on cost per request regressions; kill-switch for runaway jobs.

### 8.4 Optimization Playbook
- Investigation steps: verify attribution, inspect recent deploys, check traffic anomalies, review instance right-sizing, caching efficacy, egress spikes. Remediations: cache enablement, throttling, job batching, storage tiering, deletion of stale data, reserved/spot mix tuning.

### 8.5 Definition of Done
- Detect cost outlier (e.g., runaway worker) with hypothetical remediation plan logged; doc explaining how teams use dashboards and act on alerts.

## 9) Cross-Fabric Integration Pattern (Forward-Looking Enhancement)
- **Evidence-linked graph-native governance:** MC emits every step event to Audit Spine and IntelGraph with signed provenance; policies include IntelGraph lookups (e.g., deny deploy if related Incident severity ≥3). Template Factory embeds default connectors. Chaos kit emits experiments and outcomes to IntelGraph for causal analysis. FinOps alerts feed MC runbooks to auto-throttle or rollback costly deployments.
- **Causal integrity overlays:** hash-chained evidence bundles attached to IntelGraph edges, exportable as C2PA claims; forward plan for privacy-preserving sharing using selective disclosure proofs.
