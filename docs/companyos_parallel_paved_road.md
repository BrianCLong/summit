# CompanyOS Parallel Paved-Road Playbooks

This document captures eight self-contained prompts that can be handed to parallel CompanyOS teams or ChatGPT threads. Each prompt includes the deliverables requested by the user: golden templates, policy fabric, observability kit, data spine, reliability and release, developer ergonomics, product vertical slice, and risk/compliance automation.

---

## Prompt 1 — Golden Path Platform (Repos, CI/CD, Templates)

### Golden Repo Templates

**API Service Template**
- Purpose: Stateless HTTP/GraphQL API with typed handlers.
- Layout:
  - `src/` with `handlers/`, `services/`, `models/`, `config/`, `middleware/`.
  - `tests/` with unit + contract tests; `fixtures/` sample payloads.
  - `infra/` with Terraform/K8s manifests; `docker/` for images.
  - `config/` containing env schema (`env.example`, `schema.json`).
  - `feature-flags/` with sample flag definition + expiry/cleanup checklist.
  - `scripts/` for lint/test/dev; `Makefile` or `taskfile`.
- Conventions: 12-factor env; secrets via vault/SM; typed (TS/Go); default CORS/Helmet; health/readiness endpoints.

**Batch Worker Template**
- Purpose: Event/queue driven job runner.
- Layout:
  - `src/` with `jobs/`, `schedulers/`, `adapters/`, `config/`.
  - `tests/` with deterministic fixtures; `fixtures/` sample events.
  - `infra/` with cron/queue definitions; `observability/` dashboards.
  - `feature-flags/` for kill-switch and ramp-up toggles.
  - `scripts/` for local runner and replay harness.
- Conventions: Idempotent handlers; checkpointing; backoff/jitter; dead-letter queues; signed container image.

**Frontend Template**
- Purpose: SPA/SSR React app with typed API client.
- Layout:
  - `src/` with `components/`, `pages/`, `hooks/`, `state/`, `api/`, `styles/`, `feature-flags/`.
  - `public/` assets; `tests/` with unit + component + accessibility smoke.
  - `config/` for env schema and CSP defaults; `scripts/` for lint/build/preview.
  - `infra/` for CDN/cache rules and edge auth; `storybook/` samples.
- Conventions: Strict TS, ESLint/Prettier; feature flags with expiry issue; env injection at build; secrets only server-side; default security headers.

### Paved-Road CI/CD (pseudo-YAML)

```yaml
name: golden-ci
on: [pull_request, push]
jobs:
  lint-test-sast:
    runs-on: ubuntu-latest
    steps:
      - checkout
      - setup-language
      - cache-deps
      - run: npm run lint && npm test --coverage
      - run: sast-scan .
      - run: secret-scan .
  sbom-sign-scan:
    needs: lint-test-sast
    steps:
      - checkout
      - build: build artifact
      - run: sbom generate --format spdx -o sbom.json
      - run: cosign sign --key env://COSIGN_KEY artifact
      - run: vuln-scan artifact --fail-on high --budget 0-critical
  deploy-canary:
    needs: sbom-sign-scan
    steps:
      - deploy to canary env
      - run: smoke-tests --env canary
      - run: observe error_rate<1%, p95<300ms, saturation<70%
      - if failure: trigger rollback
      - if success and policy pass: promote to prod
```

**Gates & Policies**
- Lint/tests/coverage: quality bar; fail PR on regressions.
- SAST/secret scan: block on findings; waivers require ticket + expiry.
- SBOM generation + signing: provenance enforcement; SBOM stored alongside artifact.
- Vulnerability scan with budget (0 critical, configurable high/medium).
- Canary deploy with automated metrics guardrail; rollback on violation.
- Attestation recorded: commit, builder, tests run, SBOM hash, signature.

### Developer On-Ramp

- Create new service: `pnpm dlx create-companyos <template> new-service`. Answers prompt set up repo, env schema, feature flag sample, CI config.
- Run locally: `npm install`, `npm run dev` (API/Frontend) or `npm run worker:dev` (batch) with `dev-compose` for deps.
- Tests: `npm test` (+ `npm run test:e2e` for frontend), coverage ≥80% touched code.
- Ship to prod: merge to main triggers pipeline → signed artifact → canary → promotion after guardrails.
- Definition of Ready: template used, env schema defined, feature flag planned, runbook stub, metrics defined.
- Definition of Done: tests/coverage pass, SAST/secret clean, SBOM attached, artifact signed, canary metrics steady, rollback plan validated, docs updated.

### ADR Stubs
- **ADR: Repository Templates and Layout** — Choose standard template per service type; enforce typed code, env schema, feature flag expiry, observability defaults.
- **ADR: CI/CD Gates on the Paved Road** — Require lint/tests, SAST, secret scan, SBOM + signing, vuln budget, canary with policy gates, automated rollback.
- **ADR: Artifact Signing & Provenance Strategy** — Cosign-based signing; attestations include SBOM digest, build metadata; verify at deploy.

---

## Prompt 2 — Identity & Policy Fabric (AuthN, AuthZ, OPA/ABAC)

### Identity Model (minimal schema)
- `subjects`: {`id`, `type` (user|service), `org_id`, `workspace_id`, `status`, `created_at`}.
- `attributes`: {`id`, `name`, `value`, `scope` (subject|org|workspace), `subject_id?`, `org_id?`, `workspace_id?`, `source`, `ttl` } (examples: jurisdiction=EU, clearance=high, data_domain=finance).
- `roles`: {`id`, `name`, `org_id`, `description`}.
- `role_bindings`: {`subject_id`, `role_id`, `workspace_id`, `expires_at`}.
- `policies`: stored as versioned bundles with metadata {`bundle_id`, `version`, `stage`, `checksum`, `created_by`}.

### Policy-as-Code
- Layout: `policies/<domain>/<service>/<stage>/<version>/policy.rego` with `metadata.yaml` (owner, change log, tests). Promotion: dev→staging→prod via signed bundle and checksum.
- Example policies (pseudo-OPA):
  - **EU Data Residency**: deny if `resource.region != "eu"` AND `resource.contains_pii == true`.
  - **Export Approval + Logging**: allow export only if `input.context.approval_ticket` present AND `log_event("export", attrs)`; else deny with obligation `require_approval`.
  - **Step-up Auth**: require MFA if `action in {delete, transfer}` OR `resource.sensitivity == "high"`.
  - **DLP Redaction**: allow read but obligation `mask_fields` when `subject.attributes.clearance < resource.required_clearance`.

### AuthZ Integration Pattern
- Request payload: `{"subject": {"id","type","attributes"}, "action": "read|write|delete|export", "resource": {"id","type","owner","region","contains_pii","required_clearance"}, "environment": {"ip","device_trust","time","auth_strength"}}`.
- Response: `{"decision": "allow|deny", "reason": "policy.id", "obligations": ["mask_fields","require_mfa","log_event"], "audit_id": "uuid"}`.
- SDK interface:
  - `authorize(subject, action, resource, environment) -> Decision {allow:boolean, obligations:list, reason:string, audit_id}`.
  - `with_obligations(handler, decision)` helper to enforce masking/MFA prompts.

### ADR Stubs
- **ADR: Canonical Identity & Attribute Model** — Define subjects, attributes, role bindings, and scoping (org/workspace) for ABAC.
- **ADR: Policy Bundle Layout & Promotion** — Versioned OPA bundles per domain; signed promotion from dev→staging→prod with tests.
- **ADR: Enforcement Integration Standard** — All services call central PDP/SDK with subject/action/resource/environment; obligations supported; audit IDs logged.

---

## Prompt 3 — Observability First (Metrics, Logs, Traces, SLO Kits)

### Observability SDK
- API (language-agnostic):
  - `startTrace(ctx): TraceCtx` (generates/propagates trace_id, span_id).
  - `logger = getLogger(ctx)`; `logger.info(event, fields)` emitting structured log with `trace_id`, `span_id`, `correlation_id`, `user_id?`.
  - `metrics.record("request_duration_ms", value, tags)`; `metrics.increment("requests_total", tags)`; `metrics.increment("errors_total", tags)`.
  - Middleware hooks for HTTP servers and queue consumers to auto-wrap requests/jobs.
- Example usage:
  ```
  const ctx = startTrace(request);
  metrics.increment("http_requests_total", {route:"/orders", method:"GET"});
  const timer = metrics.timer("http_request_latency_ms", {route:"/orders"});
  logger.info("fetch_orders.start", {user: subject.id});
  // handler...
  timer.stop();
  logger.info("fetch_orders.success", {count: orders.length});
  ```

### Golden Dashboards & SLOs
- SLO templates:
  - API availability: 99.95% success over 30d (burn alerts at 2%/1h, 5%/6h).
  - API latency: 99% < 300ms over 30d.
  - Batch job success: 99% jobs succeed per 7d window; max p99 duration target.
- Dashboard widgets: golden signals (latency p50/p95/p99, error rate, traffic, saturation), dependency health, error budget burn down, top N error types, trace exemplars, canary vs prod comparison, SLO compliance table.

### Logging & Event Taxonomy
- Levels: `DEBUG` (dev only), `INFO` (state changes), `WARN` (retryable anomalies), `ERROR` (user-impact), `FATAL` (crash/restart).
- Required fields: `timestamp`, `service`, `env`, `trace_id`, `span_id`, `correlation_id`, `subject_id?`, `action`, `resource`, `outcome`, `latency_ms`, `request_id`, `version`.
- PII handling: structured fields allow redaction; classify fields; default to hashing/masking sensitive values; audit logs separated stream with stricter retention.
- Audit vs app logs: audit logs immutable, append-only, include `actor`, `verb`, `target`, `policy`, `decision`, `obligations`, `ip`, `device`, `signature`.

### ADR Stub
- **ADR: CompanyOS Observability Standard** — Mandatory tracing middleware, structured logging schema, golden metrics, SLO templates, and dashboard starter packs per service type.

---

## Prompt 4 — Data Spine (Schemas, Lineage, Residency, CDC)

### Canonical Data Model v0
- Entities: `customer`, `account`, `workspace`, `user_profile`, `document`, `event`.
- Versioning: `schema_version` per entity; additive changes allowed; breaking changes require new version path (`v2`) with dual-write/dual-read window; semantic versioning for schemas with `deprecated_after` metadata.
- Example fields:
  - `customer`: id, legal_name, jurisdictions[], created_at, classification, schema_version.
  - `account`: id, customer_id, status, billing_tier, region, created_at.
  - `workspace`: id, account_id, name, region, data_domains[], retention_policy_id.
  - `document`: id, workspace_id, type, classification, storage_region, checksum, created_at, lineage_ref.
  - `event`: id, workspace_id, actor, action, resource, region, payload_ref, schema_version.

### Data Classification & Residency Matrix
- Categories:
  - PII: residency locked to subject region; retention default 3y; encrypt in transit+at rest; access logged.
  - Sensitive: region-constrained (org region); retention 1y; HSM-managed keys; MFA required.
  - Restricted: single-region; retention 6m; strong access review; no export.
  - Non-sensitive: region-flexible; retention per product (default 2y); standard encryption.
  - Telemetry: aggregated; retention 90d raw/1y aggregates; region = deployment region.
  - Audit: immutable; retention 7y; dual-region replication allowed if policy; signed logs.

### Lineage & CDC
- Lineage metadata attached to assets: {`source_system`, `ingest_time`, `transform_chain`[], `policies_applied`[], `producer_service`, `checksum`, `schema_version`, `classification`, `region`}.
- Data flow representation: graph edges `source -> transform -> sink` stored in lineage catalog; each edge carries policy context (e.g., residency, masking).
- CDC pattern: change streams emit events to `cdc.<entity>.v<schema_version>` topics with envelope `{op: c/u/d, before?, after?, ts, producer, trace_id, checksum, classification, region}`. Consumers enforce policy gate based on classification/residency before write.
- Example lineage record: `document 123` produced by `ingest-service` from `upload` → `pii-detector(masked)` → stored in `doc-store-eu`, policies `[eu_residency, pii_masking]`.
- Example CDC event: `{op:"u", entity:"account", after:{id:"a1", billing_tier:"pro"}, ts:"...", schema_version:"1.2.0", trace_id:"...", region:"eu-west-1", classification:"pii"}`.

### ADR Stubs
- **ADR: Canonical Data Spine** — Defines core entities, schema versioning rules, dual-write/dual-read migration approach.
- **ADR: Data Residency & Classification Policy** — Category matrix, retention, encryption, export controls, and enforcement hooks for services/ETL.

---

## Prompt 5 — Reliability & Release (Canary, Rollbacks, Error Budgets)

### Standard Release Pattern
- Deploy as canary with traffic ramps: 1% → 10% → 50% → 100% with hold periods (e.g., 10m) and health checks (readiness probes, synthetic checks, key SLOs).
- Decision metrics: error rate, p95 latency, saturation, synthetic success, canary vs baseline diff.
- Pipeline outline: build → tests → deploy canary → run smoke/synthetic → evaluate metrics → auto-promote or rollback → record attestation.

### Rollback Controller
- Inputs: metrics streams, alert manager, deployment metadata, feature flag state.
- Triggers: error rate >1% over 5m, p95 latency +30% vs baseline, synthetic failure >2 consecutive, pod crashlooping, manual abort.
- Actions: halt promotion, shift traffic to previous stable, mark release unhealthy, notify on-call, capture diagnostics, create incident link.
- Pseudo-API/state:
  - `POST /rollback` {deployment_id, reason, metrics_snapshot}
  - `GET /state/{deployment_id}` -> {phase: canary|promoted|rolling_back|rolled_back, indicators}
  - State machine: `canary` → `promoted` → `steady` or `rollback_pending` → `rolled_back`.

### Error Budget Policy
- Budgets derived from SLOs (e.g., 99.9% → 43.2m/month). Burn alerts at 25%, 50%, 75%.
- If budget exhausted: release freeze except urgent fixes; require approval from SRE lead; post-incident review before unfreeze; additional canary duration + synthetic coverage.

### ADR Stubs
- **ADR: Standard Release Pattern** — Canary ramp steps, metrics gates, synthetic checks, promotion criteria, rollout vs rollback path.
- **ADR: Error Budget Enforcement** — Budget calculation, burn alerts, release freeze rules, escalation and unfreeze conditions.

---

## Prompt 6 — Developer Ergonomics (Local Dev, Fixtures, Smoke Tests)

### Local Dev Stack
- Use `dev-compose.yaml` per template: services + local deps (db, queue, cache). Hot-reload enabled via volume mounts and watch mode. Secrets via `.env.local` + `vault dev` injector; fall back to mock services when creds absent.
- First-run checklist: install deps, copy `.env.example` → `.env.local`, run `npm run dev:compose`, confirm health endpoints, run `npm test` and `npm run smoke`.

**Sample dev-compose layout**
```yaml
version: "3.9"
services:
  app:
    build: .
    command: npm run dev
    volumes: ["./src:/app/src", "./config:/app/config"]
    env_file: [.env.local]
    depends_on: [db, cache]
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: app
      POSTGRES_PASSWORD: devpass
  cache:
    image: redis:7
```

### Fixtures & Seed Data
- Fixtures stored under `fixtures/<domain>/<scenario>.json`; versioned with semantic tags and described in `fixtures/README.md`.
- Generation via script `npm run fixtures:generate` producing sanitized synthetic data; no real PII. Shared via artifact store with checksum and schema version.
- Seed script outline: `scripts/seed.js` loads fixtures into local deps; supports `--scenario smoke|perf|demo`.

### Smoke & Health Tests
- Standard suite (API service):
  - `GET /health` returns 200 and build info.
  - `GET /status` returns dependency states.
  - `POST /login` with demo user succeeds; `GET /me` returns profile.
  - `POST /documents` create/read lifecycle; `DELETE /documents/:id` soft-deletes.
  - Feature flag toggle path validated.
- Execution: pre-merge (CI), pre-deploy (staging), post-deploy (canary + prod). Failures block promotion/rollback.

### ADR Stub
- **ADR: CompanyOS Developer Ergonomics Standard** — dev-compose defaults, fixture generation/sharing, mandatory smoke tests per service type.

---

## Prompt 7 — Product Vertical (90-Day Value Feature with Telemetry)

### Problem & Outcome
- Primary user: Operations lead needing unified Control Tower view of service health and policy posture.
- Pain: Fragmented dashboards, slow incident detection (>20m), unclear ownership.
- Success in 90 days: median time-to-detect <5m; 50 weekly active Control Tower users; 90% of critical services onboarded.

### Feature Slice (v1)
- User stories:
  - As an ops lead, I can see real-time service status (availability, latency, error budget) on one screen.
  - As an on-call engineer, I can drill into a service to view recent incidents, current canary state, and top errors.
  - As a compliance officer, I can view policy posture (SBOM presence, CVE budget status, residency breaches) per service.
- UX flow: Landing Control Tower → list of services with status badges, SLO and burn bars → click into service detail showing metrics, deployments, policy flags, and recent alerts → feedback button.
- Acceptance criteria: data auto-refresh ≤30s; filters by domain/region; click-through latency <1s; service detail shows last deploy + rollback status; feature-flagged rollout; accessibility AA.

### Instrumentation & Rollout
- Telemetry: page views, filter usage, service drill-down clicks, time-to-first-meaningful-render, API latency/error metrics, feature flag exposure, feedback submissions.
- Tracking plan: event taxonomy `control_tower.page_view`, `service_drilldown.open`, `policy_card.click`, `feedback.submit`; metrics exported to analytics + observability.
- Rollout: feature flag `control_tower_v1`; cohort by internal teams first; staged rollout 10%→50%→100%; solicit feedback via in-app survey; kill switch available.

### ADR Stub
- **ADR: Control Tower v1 Scope & Metrics** — Defines target user, success metrics, v1 feature set, telemetry/tracking, and rollout via feature flags.

---

## Prompt 8 — Risk & Compliance Automation (SBOM, CVE Budget, Audit Export)

### SBOM & Vulnerability Pipeline
- SBOM generation during build using SPDX/CycloneDX; stored in artifact repo with digest; linked in release manifest.
- CVE budget: 0 critical; ≤2 high with approved exceptions; medium/low allowed with SLA (30/90 days). Builds fail if budget exceeded or SBOM missing.
- Pipeline steps: secret scan → SAST → deps scan → build → SBOM generate → sign artifact + SBOM → vuln scan vs budget → attestation emit → deploy gate checks.

### Attestation & Policy Gates
- Attestation schema: {`build_id`, `git_commit`, `builder`, `timestamp`, `tests_passed`, `sast_result`, `secret_scan_result`, `sbom_digest`, `artifact_digest`, `vuln_report`, `cve_exceptions`, `provenance_signature`}.
- Policy rules: block deploy if missing attestation, SBOM absent, signature invalid, CVE budget exceeded, or required tests not executed. Require approval for exceptions with expiry.

### Audit Export & Reporting
- Audit trail per release: commits included, artifacts digests, SBOM link, tests/scans results, policy decisions, deployer identity, approvals, timestamps, rollback history.
- Disclosure Pack: summary PDF/JSON + attachments containing SBOM, vuln report, attestation, policy evaluation log, deployment changelog, rollback plan, evidence of controls.
- Example audit record: `{release:"2026.02.15", commits:[...], artifact:"sha256:...", sbom:"sbom-2026.02.15.json", tests:{unit:"pass", sast:"pass"}, policy_gate:"passed", approvals:["sre_lead"], deployed_at:"...", rolled_back:false}`.

### ADR Stub
- **ADR: Compliance Automation Pipeline** — SBOM generation/storage, signing, CVE budget enforcement, attestations, deploy-time policy gates, and disclosure pack export.

