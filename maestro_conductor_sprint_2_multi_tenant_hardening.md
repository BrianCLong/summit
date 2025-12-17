# Sprint 2: Maestro Conductor — Multi-Tenant Hardening & Externalization

**Duration:** 2 weeks  
**Theme:** “Conductor as the shared automation fabric for many tenants (internal + white-label + SaaS)”

## Objectives (end-of-sprint truths)
1. **Multi-tenant Conductor is safe to share** – Isolation, noisy-neighbor protections, and per-tenant limits are enforced and observable.
2. **Conductor is productized for partners** – White-label knobs, config profiles, and docs let a design partner deploy with light help.
3. **Core CompanyOS workflows run on Maestro by default** – A real library of “golden” CompanyOS workflows is live and policy-gated.
4. **SaaS readiness for SRE + billing** – Rate limiting, incident runbooks, DR drills, and usage signals exist for hosted Conductor.

## Workstreams & Stories
### Workstream 1 — Multi-Tenant Isolation & Limits
- **Story 1.1 – Tenant Isolation & Resource Quotas**  
  _Goal:_ One tenant can’t starve or break others; guardrails are visible and tunable.  
  _Deliverables:_ Per-tenant max concurrent runs, max queued runs, max task concurrency, and execution classes (`standard`, `bulk`, `low-priority`) controlling scheduling.  
  _Acceptance:_ Quotas configurable via CompanyOS config/API; quota hits queue/defer with clear status/reason; quota-hit alerts/metrics; no cross-tenant impact in load tests; dashboards show utilization vs. quota; runbook: “What to do when a tenant hits Conductor quota.”

- **Story 1.2 – Data Boundary & Secret Scoping**  
  _Goal:_ No cross-tenant data leakage; secrets scoped to tenant/environment.  
  _Deliverables:_ Tenant + environment tags on workflow definitions, runs, log pointers, and secrets; secrets backend enforcing tenant namespaces and least-privilege for workers.  
  _Acceptance:_ Cross-tenant API calls rejected and logged with structured security events; tests simulate mis-tagging and verify policy blocks; secrets access logged with tenant/environment/workflow context; threat model doc updated for multi-tenancy and secrets.

### Workstream 2 — Workflow Developer Experience & SDK
- **Story 2.1 – Conductor Workflow SDK (TypeScript-first)**  
  _Goal:_ Internal/partner devs author typed workflows.  
  _Deliverables:_ TS SDK for defining workflows (steps, tasks, retries, timeouts), metadata (`risk_level`, `tenant_scope`, `category`, `tags`, `runbook_link`), and structured events/evidence hooks.  
  _Acceptance:_ SDK published as internal NPM package with docs; ≥2 workflows migrated; policy harness consumes metadata (e.g., `risk_level`); tests ensure type safety and readable failures for broken definitions.

- **Story 2.2 – “Golden” CompanyOS Workflows Library v1**  
  _Goal:_ CompanyOS defaults to Maestro for canonical flows.  
  _Deliverables:_ Three SDK-based workflows: Employee Onboarding, Tenant Provisioning/Bootstrap, and Incident Lifecycle. Each is risk-tagged, policy-gated, linked to runbooks/docs, and emits provenance receipts.  
  _Acceptance:_ Triggerable from Switchboard palette or New Workflow UI; demo runs end-to-end in staging with real-ish data.

### Workstream 3 — White-Label & Partner Readiness
- **Story 3.1 – Conductor Configuration Profiles (Internal / White-Label / Hosted SaaS)**  
  _Goal:_ Same binary, three deployment personas.  
  _Deliverables:_ Profile configs (`internal-edition`, `white-label-edition`, `hosted-saas`) toggling default policies, risk thresholds, limits/quotas, and logging/retention. Example files: `values.conductor.internal.yaml`, `values.conductor.white-label.yaml`, `values.conductor.saas.yaml`.  
  _Acceptance:_ Single flag/env var selects profile; profiles live as versioned code with comments; docs describe selection and per-tenant overrides.

- **Story 3.2 – Partner/Integrator Onboarding Guide**  
  _Goal:_ Competent partner can run Conductor + Switchboard for a demo tenant.  
  _Deliverables:_ Guide covering architecture, Helm/Terraform deploy via profile, first workflow with SDK, and identity/OPA wiring.  
  _Acceptance:_ Walk-through validated by non-core engineer; commands/snippets tested in CI; guide referenced from white-label kit.

### Workstream 4 — Hosted SaaS: Rate Limits, Incidents, DR
- **Story 4.1 – Tenant-Aware Rate Limiting & Abuse Protection**  
  _Goal:_ Prevent abuse and protect global SLOs.  
  _Deliverables:_ Tenant/IP-based API + workflow-trigger rate limits; abuse patterns & alarms (e.g., rapid create/cancel cycles).  
  _Acceptance:_ Limits configurable via profile or tenant override; structured errors and security/abuse events on limit hits; dashboards for top tenants by limit hits and global health; runbook: “Responding to rate-limit events or suspected abuse.”

- **Story 4.2 – DR Drill & Kill-Switch for Conductor**  
  _Goal:_ Pause dangerous automation and recover from failure with evidence.  
  _Deliverables:_ Policy-gated global kill-switch with evidence receipts and Switchboard surface (banner/status); documented DR runbook with RPO/RTO and backup/restore steps; staging DR drill simulating partial data loss or region outage.  
  _Acceptance:_ Kill-switch gated to specific roles, emits receipts; DR report with actions, recovery time, gaps; backups/restores observable with metrics/logs.

### Workstream 5 — FinOps & Usage-Based Pricing Inputs
- **Story 5.1 – Enriched Metering for Pricing Experiments**  
  _Goal:_ Finance/product can simulate pricing from real usage.  
  _Deliverables:_ Metering events enriched with workflow complexity hints (steps, external calls), duration bands, and data volume/weight estimates; pricing model dashboard or spreadsheet exploring per-run/per-task/blended axes.  
  _Acceptance:_ Enriched events live in metering store; ≥2 candidate pricing axes documented with pros/cons; per-tenant usage view includes runs, tasks, and complexity score; write-up: “Conductor Pricing Inputs v0.”

## Global Definition of Done (reaffirmed)
1. **Spec / ADR** captured with rationale and alternatives.
2. **Policy** updates to OPA/ABAC bundles plus simulation tests.
3. **Tests** for new critical paths (≥80% coverage target).
4. **Observability** metrics/logs/traces wired into dashboards.
5. **Provenance** receipts for key actions, visible in Switchboard.
6. **Runbooks & Docs** updated with snippets for non-trivial paths.
7. **Changelog** with performance + cost impact, especially multi-tenant/concurrency changes.

## Execution Blueprint (architecture, ops, and verification)
- **Isolation & Limits Architecture**:
  - Scheduler supports execution classes with weighted fair sharing; per-tenant tokens for concurrent runs/tasks and backlog ceilings. Default leak-free queueing with bulk deferral.
  - Admission control enforces tenant quota snapshot + circuit-breaker for misbehaving tenants; structured status reasons and tenant-scoped metrics (`quota_hits_total`, `queued_runs`, `running_tasks`).
  - Data boundary guard layer applies tenant/environment tags in DB schemas, object storage keys, logs, and provenance receipts; OPA denies cross-tenant accesses.

- **Secrets & Identity**:
  - Tenant-specific secret namespaces with KMS-backed encryption; worker identities limited to tenant scope via least-privilege policies; access logs annotated with tenant/env/workflow IDs.
  - Automated validation catches mis-tagged resources and fails fast in CI + runtime policy checks.

- **SDK & Developer UX**:
  - Typed workflow DSL exports metadata contracts and evidence hooks; lint rules forbid `any` on critical surfaces; definition validator fails with actionable errors.
  - Policy harness consumes `risk_level` and `tenant_scope` to gate approvals and kill-switch behavior.

- **White-Label Profiles**:
  - Profile selection via single env/flag; profiles stored as versioned YAML with comments and override guidance; defaults cover policies, limits, logging/retention.
  - Partner onboarding guide tied to Helm/Terraform profiles; CI job executes guide snippets to prevent drift.

- **SaaS Guardrails (Rate limiting + DR)**:
  - Tenant/IP rate-limits integrated with API gateway; structured abuse events with dashboards for hit rates and health.
  - Policy-gated kill-switch with ledgered toggles; DR runbook exercised in staging with evidence and gap tracking.

- **FinOps Metering**:
  - Enriched events emit complexity/duration/volume hints; per-tenant dashboards and pricing simulation workbook.

## Validation & Runbooks (minimum set)
- **Load & Noisy-Neighbor Tests:** Stress Tenant A while monitoring Tenant B SLOs; verify limits and isolation metrics.
- **Security & Tagging Tests:** Simulate cross-tenant API calls and mis-tagged resources; ensure OPA and validation blocks with structured audit logs.
- **SDK Quality Gates:** Type safety checks, schema validation for workflow definitions, and failure readability tests.
- **Rate-Limit & Abuse Scenarios:** Rapid create/cancel cycles and burst traffic with dashboards + alerts validation.
- **DR Drill:** Backup/restore plus region-fail simulation; record RPO/RTO and residual gaps.
- **Runbook Snippets:**
  - Quota exceeded playbook (scale policy, tenant comms, override paths).
  - Rate-limit/abuse response (throttle, investigate, block IP/tenant).
  - Kill-switch toggle (policy approval, evidence capture, rollback).

## Innovation & Forward-Looking Enhancements
- **Predictive quota rebalancing** using multi-armed bandit signals to preempt noisy neighbors without over-throttling low-risk tenants.
- **Typed policy graph** linking SDK metadata to OPA schemas for safer evolutions and automated migration hints.
- **Provenance-backed DR rehearsals** that auto-generate evidence bundles and ledger entries for audits.
- **Adaptive pricing sandbox** that replays historical metering with configurable tariff curves.

## Deliverables Checklist (for PR reviewers)
- ADR/spec updates per story with alternatives and decision records.
- Updated OPA/ABAC bundles + simulation tests for multi-tenant, rate-limit, kill-switch, and SDK metadata policies.
- Unit/integration/load/security test coverage ≥80% on new paths; CI jobs for guide-snippet verification.
- Observability artifacts (dashboards, alerts, traces) for quotas, rate limits, DR, and metering.
- Runbooks for quota hits, rate-limit/abuse, kill-switch, DR drill, and partner onboarding.
- Changelog entry noting perf/cost impacts from isolation + concurrency changes.

## Post-Sprint Readiness
- Demo script: staging run of golden workflows via Switchboard palette/New Workflow UI with provenance receipts.
- SaaS readiness: profile-specific rate limits and billing signals live; incident/DR runbooks validated; partner guide linked from white-label kit.
- Pricing inputs v0 published with per-tenant usage views and candidate pricing axes.
