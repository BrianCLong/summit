# Sprint Plan — CompanyOS Policy Spine (2 weeks)

**Sprint theme:** "CompanyOS Policy Spine"  
**Horizon:** 2 weeks (Track A now-value + Track B moat-building)

## Sprint Goal
Ship a pilot-ready CompanyOS Policy Spine with versioned bundles delivered by `cos-policy-fetcher`, runtime ABAC enforcement in at least one CompanyOS service, and golden-path observability, SBOMs, and rollback coverage.

## Success Criteria (Definition of Done)
- One pilot tenant configured with a real policy set (e.g., founder-only financials, geo-restricted data export).
- `cos-policy-fetcher` reliably pulls and caches bundles; metrics and alerts cover success/failure, last success, and bundle versions.
- At least one CompanyOS-facing service consumes bundles and enforces one ABAC rule in a production-like dev environment.
- Health endpoints, SBOMs/signatures, and rollback playbooks exist for components in the policy spine.

## Track A — Now Value

### A1. Harden `cos-policy-fetcher` (policy distribution spine)
- [ ] Add structured env config with validation (`COS_POLICY_SOURCE`, `COS_TENANT_ID`, `COS_POLICY_REFRESH_INTERVAL`); fail fast on invalid config.
- [ ] Add resilience: retries with backoff; on-disk cache of last-good bundle; boot from cache if upstream unavailable.
- [ ] Observability: metrics (`cos_policy_fetch_success_total`, `cos_policy_fetch_failure_total`, `cos_policy_last_success_timestamp`, `cos_policy_bundle_version`), structured logs with correlation IDs.
- [ ] CI/tests: unit tests for config validation, retry, cache fallback; integration test against fake policy source.
- **Acceptance:** During outage, continues serving cached bundle and surfaces degraded metrics; invalid config exits non-zero with clear message.

### A2. Policy Bundles v1 (versioned, auditable, testable)
- [ ] Define schema (id, version, tenant_id, scope, rules, tags, provenance such as created_by/at + ADR link).
- [ ] Repo structure under `controls/companyos/policies/` (subfolders per tenant/environment).
- [ ] Validation tool/CLI: schema validation + engine compile (e.g., OPA/rego) with readable report.
- [ ] CI gate on changes under `controls/companyos/` running validation; provide `make validate-policies` (or equivalent).
- **Acceptance:** At least two bundles for pilot tenant (e.g., founders-only-sensitive-docs, geo-restricted-data-export). Validation fails on schema/compile errors; bundles reference ADR ids.

### A3. Runtime Enforcement in a CompanyOS service
- [ ] Integrate `cos-policy-fetcher` into a CompanyOS-facing service; load tenant bundle on startup.
- [ ] Implement one ABAC rule (e.g., role `Founder` AND allowed country for `/company/financials`).
- [ ] Decision logging: tenant id, principal id, resource, action, policy id/version, decision, reason.
- [ ] Define behavior for missing/unreadable bundles (default-deny or documented degraded mode).
- [ ] E2E synthetic test covers allow (200) and deny (403 with reason).
- **Acceptance:** Dev/prod-like env enforces allow/deny paths; logs present per decision; smoke test wired to CI; behavior on missing bundles documented.

### A4. CompanyOS Admin — Read-only Policy View
- [ ] API endpoint to list active bundles for a tenant (id, version, description, tags, last_updated_at).
- [ ] UI Policies tab/panel with table + tag filter; empty and error states with runbook link.
- [ ] Accessibility check (labels, keyboard nav) and basic tests (API + UI).
- **Acceptance:** Pilot tenant admins can view active bundles; no mutating actions; a11y validated.

## Track B — Moats / Platform

### B1. CompanyOS Service Golden Path Template
- [ ] Service template with `/health`, `/health/ready`, `/metrics`, structured logging with trace IDs, and p95 latency metric sample handler.
- [ ] Scaffolding command (e.g., `make new-companyos-service`) generating compilable/testable service.
- [ ] Docs: quickstart for using template; migrate or create at least one reference service from template.

### B2. SBOM + Signing for CompanyOS artifacts
- [ ] Identify artifacts (Docker images, Helm charts, binaries for `companyos/` and `clients/cos-policy-fetcher`).
- [ ] SBOM generation in CI (Syft/CycloneDX), stored as build artifacts and attached to releases.
- [ ] Signing step (e.g., cosign) and verification gate pre-deploy; basic vuln scan with CVE budget.
- **Acceptance:** Every artifact has SBOM + signature; verification succeeds in pipeline; CVE threshold logged/enforced.

### B3. SLOs, Dashboards, and Runbooks for the Policy Spine
- [ ] Define SLOs: fetch availability (e.g., 99.5% under 2s), decision latency (e.g., 95% < 50ms).
- [ ] Grafana dashboard for `cos-policy-fetcher` and enforcement metrics; alerts for no recent success, elevated error rates.
- [ ] Runbook `RUNBOOKS/companyos-policy-spine.md` with symptom → diagnosis → actions, rollback for policy bundles and code, and comms template.
- **Acceptance:** Dashboard labeled “CompanyOS Policy Spine”; alerts validated in dev; runbook linked from alerts.

## Cross-Cutting: Architecture & Evidence
- [ ] ADR in `adr/` for CompanyOS Policy Spine (status: Accepted) covering architecture, trust boundaries, failure modes, performance, and data classification; referenced from bundle headers and fetcher README.
- [ ] Evidence checklist per story: tests updated, CI green (policy validation, SBOM/signing), observability hooks added, docs/readmes updated, runbook in place, release notes include CompanyOS section.

## Board & Execution Notes
- Create two swimlanes: Track A (Now-value) and Track B (Moats). Each story (A1–A4, B1–B3) as epic with subtasks above.
- Explicit owners: platform/infra for A1, B2, B3; policy/product for A2; service team for A3/A4; architecture for ADR.
- Definition of ready: policy bundle schema chosen; mock policy source for integration tests available; pilot tenant id defined.
- Definition of done: acceptance criteria met, tests + CI green, observability verified in dev, rollback path tested, documentation linked.

## Risks & Mitigations
- **Policy source instability:** mitigate with cache-first boot and fetch retries/backoff; add alert for stale bundles.
- **ABAC rule regressions:** enforce default-deny on missing bundles; add synthetic allow/deny tests in CI.
- **Supply chain gaps:** block releases without SBOM/signature; add verification step in deploy pipeline.
- **Operational blind spots:** dashboards + alerts + runbook; add chaos drill for fetch outages.
