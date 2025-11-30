# Sprint Plan — Maestro Conductor Sprint 2 (Multi-Tenant Hardening & Externalization)

**Duration:** 2 weeks | **Theme:** "Conductor as the shared automation fabric for many tenants (internal + white-label + SaaS)"

---

## 1) Sprint Objectives (End-of-Sprint Truths)

1. **Multi-tenant Conductor is safe to share.** Strong isolation with noisy-neighbor protections and per-tenant limits that are observable and tunable.
2. **Conductor is productized for partners.** White-label knobs, configuration profiles, and docs enable a design partner to deploy with light help.
3. **Core CompanyOS workflows run on Maestro by default.** A starter library of golden workflows is live and policy-gated.
4. **SaaS readiness is proven.** Rate limiting, incident runbooks, DR drills, and usage signals exist for hosted Conductor.

**Success signals**
- Per-tenant quotas visible in dashboards; load tests show no cross-tenant impact.
- Partner-ready profile selection + guide validated by a non-core engineer walkthrough.
- Three golden CompanyOS workflows runnable via Switchboard/"New Workflow" UI with provenance.
- Rate-limit and DR runbooks exercised with receipts and observable backups/restores.

---

## 2) Workstreams & Stories

### Workstream 1 — Multi-Tenant Isolation & Limits

**Story 1.1 – Tenant Isolation & Resource Quotas**
- **Goal:** Prevent one tenant from starving/breaking others via per-tenant limits.
- **Scope:** Max concurrent runs, max queued runs, max task concurrency; execution classes (standard/bulk/low-priority) for scheduling; quota events surfaced to alerts/metrics/dashboards.
- **Acceptance:**
  - Quotas configurable per tenant via CompanyOS config/API with clear status when deferred.
  - Quota hits emit structured events and alerts; tenants see utilization vs quota on dashboards.
  - Load tests show Tenant A stress does not materially degrade Tenant B SLOs.
  - Runbook snippet exists for responding to Conductor quota hits.

**Story 1.2 – Data Boundary & Secret Scoping**
- **Goal:** Enforce tenant/environment tagging and secret isolation.
- **Scope:** Require tenant + environment tags on definitions/runs/log pointers/secrets; secrets backend enforces tenant namespaces and least-privilege worker identities; structured security events for cross-tenant attempts.
- **Acceptance:**
  - Cross-tenant API calls rejected and logged; automated tests catch mis-tagging.
  - Secrets access logged with tenant/environment/workflow context.
  - Threat model doc updated for Conductor multi-tenancy and secrets.

### Workstream 2 — Workflow Developer Experience & SDK

**Story 2.1 – Conductor Workflow SDK (TypeScript-first)**
- **Goal:** Disciplined, typed authoring for internal/partner devs.
- **Scope:** SDK for workflow definitions (steps, tasks, retries, timeouts), metadata (`risk_level`, `tenant_scope`, `category`, `tags`, `runbook_link`), and structured events/evidence hooks; published as internal NPM package with docs.
- **Acceptance:**
  - At least two workflows migrated to SDK definitions with policy harness reading metadata.
  - Tests ensure type safety (no `any` on critical surfaces) and broken definitions fail fast with readable errors.

**Story 2.2 – Golden CompanyOS Workflows Library v1**
- **Goal:** Default Maestro adoption for canonical CompanyOS flows.
- **Scope:** Implement via SDK:
  1) Employee Onboarding (identity, access grants, initial apps).
  2) Tenant Provisioning/Bootstrap (create tenant, policies, default dashboards).
  3) Incident Lifecycle (declare incident, notify roles, collect evidence).
- **Acceptance:**
  - Each workflow risk-tagged, policy-gated, with linked runbook/documentation and provenance receipts.
  - Triggerable from Switchboard command palette and/or New Workflow UI; demoed end-to-end in staging with real-ish data.

### Workstream 3 — White-Label & Partner Readiness

**Story 3.1 – Conductor Configuration Profiles (Internal / White-Label / Hosted SaaS)**
- **Goal:** Single binary with three deployment personas.
- **Scope:** Profile configs (`internal-edition`, `white-label-edition`, `hosted-saas`) toggling default policies, limits/quotas, logging/retention; code-defined YAML/JSON (e.g., `values.conductor.internal.yaml`, `.white-label.yaml`, `.saas.yaml`), selectable via flag/env var.
- **Acceptance:**
  - Profile selection is a single deploy-time flag; definitions versioned with comments.
  - Docs clarify profile choice and per-tenant overrides.

**Story 3.2 – Partner/Integrator Onboarding Guide for Maestro**
- **Goal:** Competent partner can deploy Conductor + Switchboard for a demo tenant.
- **Scope:** Guide covering architecture, Helm/Terraform profile deploy, first workflow via SDK, identity wiring, and OPA integration; commands/snippets tested in CI and referenced from the white-label kit.
- **Acceptance:**
  - Non-core engineer walkthrough flags no missing steps.
  - Guide linked from white-label assets; CI check validates snippets.

### Workstream 4 — Hosted SaaS: Rate Limits, Incidents, DR

**Story 4.1 – Tenant-Aware Rate Limiting & Abuse Protection**
- **Goal:** Prevent abuse and protect global SLOs in hosted mode.
- **Scope:** API and workflow-trigger rate limits per-tenant and per-IP (where applicable); abuse patterns/alarms (e.g., rapid create/cancel cycles); dashboards for top tenants by limit hits and global health; runbook for rate-limit/abuse response.
- **Acceptance:**
  - Limits configurable via profile or per-tenant override; hitting limits returns structured errors and security/abuse events.
  - Dashboards highlight limit hits; runbook published.

**Story 4.2 – DR Drill & Kill-Switch for Conductor**
- **Goal:** Pause risky automation and recover from failures with evidence.
- **Scope:** Policy-gated global kill-switch (banner + status in Switchboard) with evidence receipts; DR runbook with RPO/RTO targets and backup/restore steps; staging DR drill simulating data loss/region outage with report and owners for gaps.
- **Acceptance:**
  - Kill-switch emits receipts when toggled; only authorized roles can operate it.
  - DR drill confirms or documents gaps vs targets; backups/restores observable via metrics/logs.

### Workstream 5 — FinOps & Usage-Based Pricing Inputs

**Story 5.1 – Enriched Metering for Pricing Experiments**
- **Goal:** Enable finance/product to model pricing from real usage.
- **Scope:** Metering events include workflow complexity hints (steps, external calls), execution duration bands, and data volume/weight estimates; basic model spreadsheet/dashboard exploring per-run/per-task/blended pricing axes with pros/cons; per-tenant usage view (total runs, tasks, complexity score per period).
- **Acceptance:**
  - Enriched events live in metering store; candidate pricing axes documented.
  - Pricing Inputs v0 write-up published with per-tenant usage view.

---

## 3) Global Definition of Done (reaffirmed)
1. **Spec / ADR:** Rationale and alternatives captured.
2. **Policy:** OPA/ABAC bundles updated with simulation tests for new/changed flows.
3. **Tests:** Unit + integration on new critical paths (target ≥80% coverage).
4. **Observability:** Metrics/logs/traces wired into dashboards or appended to existing ones.
5. **Provenance:** Key actions emit receipts/evidence to the ledger, visible in Switchboard where relevant.
6. **Runbooks & Docs:** At least one runbook snippet per non-trivial path; docs updated/created.
7. **Changelog:** Sprint-level note on performance + cost impact, especially for multi-tenant/concurrency changes.

---

## 4) Milestones & Checks (2-week cadence)
- **Day 1:** Kickoff; confirm tenant quota defaults + profile flag wiring; align SDK packaging path.
- **Day 5:** Mid-sprint demo of quota enforcement, SDK API shape, and one golden workflow skeleton; check guide CI snippets.
- **Day 8:** Abuse/rate-limit dashboards + kill-switch UI preview; DR drill plan reviewed.
- **Day 10:** Staging demo of three golden workflows via Switchboard; partner guide dry run feedback.
- **Day 14:** DR drill completed with report; pricing inputs dashboard populated; readiness review vs objectives.

---

## 5) Risks & Mitigations
- **Risk:** Quota enforcement introduces regressions for legacy tenants → **Mitigation:** feature flags + per-tenant overrides with canary tenants and rollback runbook.
- **Risk:** SDK adoption friction → **Mitigation:** pair with migrated workflows, add lint rules and type tests for early failures.
- **Risk:** Profile divergence over time → **Mitigation:** profiles-as-code with versioned defaults and CI validation of overrides.
- **Risk:** DR drill reveals backup gaps late → **Mitigation:** dry-run restore earlier in sprint with observability hooks.

---

## 6) Exit Criteria Checklist
- Per-tenant quotas, execution classes, and dashboards live with alerting and runbook.
- Tenant/environment tagging enforced with automated tests; secrets scoped and audited.
- TypeScript SDK published internally; ≥2 workflows migrated; policy harness consumes metadata.
- Three golden CompanyOS workflows implemented, documented, and demoed from Switchboard/"New Workflow" UI.
- Profile configs (`internal`, `white-label`, `hosted-saas`) selectable via flag/env; partner onboarding guide validated and CI-tested.
- Tenant-aware rate limits live with dashboards and runbook; kill-switch implemented; DR drill report complete with RPO/RTO evidence.
- Enriched metering feeding pricing inputs write-up with per-tenant usage views.
