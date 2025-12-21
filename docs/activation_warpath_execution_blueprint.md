# Activation & Retention Execution Blueprint

## High-level summary and 7th+ order implications
- **North Star (Aha!)**: "First successful insight delivered" defined as **`investigation_created` → `entity_linked` → `insight_saved`** within first session; metric: **% of new workspaces reaching insight_saved in <15 minutes**.
- **System effects**: tying onboarding, lifecycle comms, and growth loops to this aha moment concentrates telemetry, experimentation, and GTM messaging on a single activation KPI. Consolidated flows reduce surface area for reliability risk and data privacy drift while enabling clearer entitlements and pricing experiments. Role-driven setup + starter data accelerates trust, letting retention features (saved views, automations) inherit clean defaults. Instrumentation enables cohort dashboards and anomaly-triggered notifications, feeding experimentation and pricing guardrails. A unified entitlement/config pipeline limits leakage and simplifies sales-readiness evidence packs.

## Architecture (conceptual)
- **Event model**: canonical events (`workspace_created`, `role_assigned`, `starter_data_provisioned`, `guided_step_completed`, `insight_saved`, `notification_sent`, `plan_limit_hit`) emitted via existing event bus with schema registry.
- **Feature flag + experiment linkage**: flags in `config/flags` mapped to experiment IDs; exposure logged with guardrails.
- **Entitlements**: versioned plan config drives role-based onboarding, feature unlocks, and usage ceilings; metering service records billable units (seats, analyses, storage) with replay safety.
- **Guided setup surface**: React/MUI wizard with inline validation and recovery, backed by API endpoints with idempotent operations and self-heal actions.
- **Checklist service**: stateful checklist tied to real events, not tutorial completion; supports nudges and lifecycle emails.
- **Analytics**: activation/retention dashboards built on aggregated events with cohort filters (source, role, segment) and reason codes for churn.
- **Reliability/perf**: SLOs on first-session funnel latency and error rates; synthetic checks for signup/onboarding/payment; progressive delivery for funnel changes.

## Implementation plan (incremental; production-grade target)
1. **Define aha event + metric**
   - Add schema for `insight_saved` and derived metric calculation job.
   - Update activation dashboard queries to track % users hitting aha <15m.
2. **Instrument first-session funnel**
   - Emit ordered events for each onboarding step; add drop-off tracking and synthetic checks.
   - Add inline validation errors as structured events for recovery analysis.
3. **Onboarding simplification & guided setup**
   - Default sensible values (org domain, data region, notification prefs); pre-provision starter project + sample graph.
   - Guided wizard with real-time validation, auto-retry, and rollback/resume tokens.
4. **Starter data/templates**
   - Seed domain-specific templates (analyst/operator/viewer) with safe demo data; tag as `starter` for cleanup/upgrade prompts.
5. **Role-based onboarding**
   - Map roles → required capabilities; conditional steps (admins see SSO/invite, operators see integrations, viewers skip config).
6. **Checklists & nudges**
   - Checklist service binds to events; in-app + email nudges keyed to real completion and anomalies.
7. **Lifecycle comms**
   - Behavior-driven email/nudge journeys; failure-triggered “fix it” links to self-serve panel.
8. **Self-serve fix-it panel**
   - Surface common failures (auth, import, entitlement) with retry/resync actions and diagnostics.
9. **Activation/retention dashboards**
   - Cohort slicing by source/role/plan; attach churn reason codes and experiment status.
10. **Monetization plumbing**
    - Versioned entitlements + metering with tests; upgrade prompts at value moments (approaching limits, aha completion).
11. **Experimentation rigor**
    - Consistent bucketing, exposure logging, guardrail alerts; decision memos automated post-test.
12. **Performance/reliability**
    - Target top latency points in onboarding and daily loops; add budgets to CI and real-user monitoring by cohort.

## Tests (strategy)
- Unit: event schema validation, checklist state machine, entitlement resolution, metering idempotency, inline validation handlers.
- Integration: guided setup API flows with retries; starter data provisioning; self-serve fix-it actions; lifecycle nudge triggers.
- E2E: first-session funnel with synthetic user; role-based branching; aha conversion within 15m; upgrade prompt after threshold.
- Perf/Reliability: p95 latency on onboarding steps; synthetic checks for signup/onboarding/payment with automated rollback on burn.

## Observability & alerts
- Metrics: funnel conversion per step, aha rate <15m, retry success, checklist completion, error classes, metering drift, notification success.
- Traces: onboarding wizard spans with validation subspans; provisioning/entitlement spans with retries annotated.
- Alerts: SLO burn for signup/aha funnel, anomaly detection on drop-offs, billing failure rate, metering replay anomalies.

## Security & compliance notes
- Enforce RBAC templates, admin session controls, audit logs for onboarding actions; PII minimization in events; idempotent payment/provisioning writes; abuse safeguards on invites/sharing.

## Innovation highlights
- **Adaptive aha predictor**: lightweight model scores likelihood of reaching aha; surfaces “next best action” in guided setup and nudges.
- **Self-healing onboarding**: automatic retries with backoff and resumable tokens for integrations/imports; user-facing panel exposes actions.
- **Value-aware upgrade prompts**: entitlements read usage/aha proximity to trigger contextual upsell rather than generic paywalls.

## Post-merge validation
- Run smoke (make smoke) and targeted funnel synthetic checks; verify dashboard updates and alert wiring in staging before rollout.
