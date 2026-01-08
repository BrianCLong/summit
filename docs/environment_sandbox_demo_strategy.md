# CompanyOS Sandbox, Staging, and Demo Environments

## Purpose and Principles

- Deliver safe, production-like environments for engineers, QA, sales, and customers without risking live data.
- Enforce least privilege, strong isolation, and deterministic configuration promotion from local → CI → dev → staging → pre-prod → demo → production.
- Prefer synthetic or sanitized data with deterministic seeding; enable opt-in mirrors only with controls (masking, access gates, monitoring).

## Environment Taxonomy

### Environment Matrix

| Environment | Purpose                                              | Data Policy                                                  | Access & Controls                                                             | Configuration/Policies                                                                             |
| ----------- | ---------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Local       | Developer inner loop, rapid iteration                | Synthetic fixtures; no customer data                         | Developer accounts only; default deny egress; env vars via `.env.local`       | Feature flags default-on for work in progress; permissive logging; mock external services          |
| CI          | Automated verification (unit, lint, integration)     | Synthetic fixtures, ephemeral datasets                       | CI service identities; sealed secrets; no interactive access                  | Immutable images; deterministic seeds per job; fail-fast gates on secrets scan                     |
| Dev         | Team shared integration                              | Synthetic + optional sanitized sample sets                   | Eng team SSO; role-based access; write gates via approvals; audit logging     | Auto-provisioned infra per service; feature flags toggleable; can connect to non-prod dependencies |
| Staging     | Pre-release validation mirroring prod topology       | Sanitized replicas with irreversible masking; no raw PII     | Restricted SSO groups; change windows; DB access read-mostly; SOC2 logging    | Config parity with prod (autoscaling, quotas, TLS, WAF); chaos toggles allowed                     |
| Pre-prod    | Release candidate dress rehearsal, load & resiliency | Sanitized + volumetric representative data; synthetic spikes | Release managers + SRE only; break-glass for writes; perf dashboards required | Frozen config; canary + blue/green testing; strict error budgets; DR drills                        |
| Demo        | Sales/training experiences                           | Curated synthetic content; safe “breakable” flows            | Sales/CS SSO; ephemeral elevated roles; auto-reset jobs                       | Opinionated defaults; guardrails against destructive ops; reset timers; scripted scenarios         |
| Production  | Customer-facing                                      | Live data with full compliance controls                      | Customer RBAC; support/SRE on-call; least privilege; just-in-time elevation   | Locked configuration; observability SLAs; WAF + DLP + anomaly detection; feature flags default-off |

### Configuration & Policy Differentiators

- **Secrets:** Managed via vault; unique secret sets per environment; short-lived tokens in CI/dev/demo.
- **Networking:** Local mocks → CI isolated network → dev/staging/pre-prod VPCs with peering to shared services → production VPC with stricter egress and DLP.
- **Data:** Synthetic-first; sanitized clones only after masking and referential integrity validation; time-skew and noise injection in non-prod analytics.
- **Observability:** Verbose logging in lower envs; sampling and PII scrubbing in staging/pre-prod; production follows compliance redaction pipelines.
- **Change Control:** Local/CI free-form; dev requires review for shared services; staging/pre-prod use change windows and approvals; production uses deployment train with automated rollbacks.

## Sandbox Tenant Patterns

- **Types:**
  - Per-engineer (feature spikes), per-team (integration), per-feature/branch (review apps).
- **Isolation:** Dedicated namespace per sandbox (Kubernetes namespace + isolated database schema/instance); network policies deny east-west traffic; per-sandbox secrets.
- **Creation Flow (API/CLI example):**

  ```sh
  # CLI
  companyos sandbox create \
    --owner alice@company.com \
    --template feature-default \
    --ttl 72h \
    --seed synthetic:v1 \
    --feature-flags onboarding,async-billing

  # API (REST)
  POST /sandboxes
  {
    "owner": "alice@company.com",
    "template": "feature-default",
    "ttl_hours": 72,
    "seed_profile": "synthetic:v1",
    "feature_flags": ["onboarding", "async-billing"]
  }
  ```

- **Policy Checks (pre-create webhook):**
  - Validate owner SSO group and quota (max N sandboxes/owner).
  - Enforce TTL (default 48–72h) with auto-scheduler to delete resources and revoke secrets.
  - Require template approval (infra + data classification) and seed profile (synthetic by default).
  - Block external egress unless explicitly allowed; ensure logging/metrics collectors attached.
  - Create audit event for sandbox lifecycle (create/extend/delete) in provenance ledger.
- **Data Seeding Strategies:**
  - Synthetic deterministic seeds for repeatability (cover edge cases, fraud/billing noise).
  - Sanitized snapshots for integration with masking, k-anonymity, and irreversible hashing of identifiers.
  - Opt-in mirrored subsets with contract tests and DLP scanners, only in pre-prod/staging with approvals.
- **Lifecycle Automation:**
  - TTL-based teardown (namespaces, DBs, secrets). Extend requires approval beyond 7 days.
  - Nightly sweep removes idle sandboxes (no traffic >24h).
  - Snapshot + restore hooks to reproduce bugs across engineers.

## Demo and Trial Experiences

- **Opinionated Demo Tenants:** Pre-loaded with exemplar data (multi-tenant, roles, workflows) and best-practice config (alerting, dashboards, policies enabled).
- **Safe Breakable Flows:**
  - Chaos-friendly paths (retry storms, permission denials, webhook failures) with quick-restore.
  - Role-play scripts for admin/manager/agent personas with reversible actions only.
- **Automation & Reset:**
  - Cron/Cloud Scheduler hourly job: `companyos demo reset --tenant demo-*` to reseed data, rotate credentials, purge webhooks, reset feature flags.
  - Demo content versioned; rollback-able bundles (fixtures + media) with checksum validation.
  - Real-time guardrails: rate limits, delete protections, webhook stubs for third parties.

## Readiness Checklist: “Feature is Ready for Staging/Demo if…”

- [ ] Feature flags defined with defaults for staging/demo; rollout plan documented.
- [ ] Synthetic + sanitized seed data updated with new entities/edge cases.
- [ ] Observability: logs/metrics/traces added; redaction verified; dashboards updated.
- [ ] Security: threat model updated; secrets in vault; permissions reviewed; egress rules defined.
- [ ] Reliability: idempotent migrations; rollback/feature-kill switch defined; chaos/test hooks added.
- [ ] Docs: operator runbook entry + demo script snippet; changelog note prepared.
- [ ] Tests: unit/integration updated; CI passing; staging smoke tests scripted.
- [ ] Sandbox/Demo automation: seed bundle versioned; reset job validated; TTL policies applied.

## Forward-Looking Enhancements

- **Ephemeral Preview Envs:** GitOps-driven preview namespaces per PR using templated Helmfile/ArgoCD with synthetic seeds and automated smoke tests.
- **Data Differential Privacy Layer:** On-the-fly query rewriting for non-prod analytics to enforce ε-differential privacy budgets.
- **Synthetic Data Generator v2:** LLM + statistical generators producing domain-consistent scenarios with coverage scoring.
- **Progressive Delivery:** Automate canary + feature-flag sampling from staging → pre-prod → production with policy-as-code gates.
