# 90-Day Execution Order for Platform Hardening and Velocity

## Context

Assumptions based on Summit/IntelGraph: B2B intelligence SaaS with heightened security and reliability requirements. Primary pains: deploy safety, noisy alerts, fragmented governance, and inconsistent data/observability standards. Plan optimizes for user trust, incident reduction, and faster delivery while paying down systemic debt.

## Phased Roadmap (Weeks 1–12)

- **Weeks 1–2: Reliability & Guardrails**
  - Establish 3–5 SLOs per critical journey; publish burn-rate alerts and dashboards.
  - Normalize timeouts/retries/circuit breakers via shared library; roll out to critical services.
  - Replace top noisy alerts with runbook-backed actionable alerts; add incident/postmortem template.
  - Harden dependencies: version pinning, health checks, graceful degradation paths.
- **Weeks 3–4: Security & Access Controls**
  - Migrate staff/admin access to SSO + MFA; enforce least-privilege IAM roles.
  - Introduce secrets management; purge repo/env sprawl; enable dependency vuln scanning.
  - Establish audit logging for admin/sensitive actions; add WAF/rate limiting on public endpoints.
- **Weeks 5–6: Developer Velocity Foundations**
  - Convert flaky tests; enforce lint/format/type checks and branch protections with required checks.
  - Accelerate CI with caching/parallelism; add automated DB migration checks.
  - Stand up preview environments for critical services; standard service template for logging/metrics/health.
- **Weeks 7–8: Data Foundation & Observability**
  - Define canonical entities/ownership; normalize logging fields (request_id/user_id/tenant_id).
  - Add event schema registry/versioned contracts; build ingestion pipeline with retries/DLQs/backfills.
  - Data quality checks (freshness/nulls/referential integrity); single metrics layer for ARR/churn/activation.
- **Weeks 9–10: Customer Value with Debt Burn**
  - Improve flagship workflow (speed/clarity/fewer clicks) with feature flags and rollback hooks.
  - Add health indicators and audit trails in-product; onboarding to reduce support tickets.
  - Build self-heal UI for common errors and usage-based notifications (limits/anomalies).
- **Weeks 11–12: Governance & Cost/Perf Optimization**
  - Engineering risk register; change management for high-risk deploys; definition of done incl. tests/logs/docs.
  - Cost allocation tags by service/tenant; weekly guardrails; rightsizing compute/autoscaling; log sampling/retention.
  - Performance budgets in CI (page weight/API latency); monthly FinOps review cadence.

## Milestones & Owners

- **SRE Lead (Weeks 1–4):** SLOs, alert quality, rollout of resilience library, automated rollback, incident workflow.
- **Security Lead (Weeks 3–6):** SSO+MFA, IAM hardening, secrets mgmt, vuln scanning, audit/WAF.
- **DevEx Lead (Weeks 5–8):** Branch protections, CI speedups, preview envs, service template, migration checks.
- **Data Lead (Weeks 7–10):** Canonical entities, schema registry, ingestion reliability, data quality gates, metrics layer.
- **Product/UX Lead (Weeks 9–10):** Flagship workflow uplift, onboarding, health indicators, self-heal UI, notifications.
- **Ops/FinOps Lead (Weeks 11–12):** Risk register, change mgmt, cost guardrails, perf budgets, log sampling.

## Success Metrics

- **Reliability:** ≤2% monthly SLO burn across critical journeys; ≥30% reduction in noisy alerts; MTTR ≤30 minutes for P1s.
- **Security:** 100% staff/admin SSO+MFA; zero secrets in repos; ≥95% high/critical deps patched within 7 days.
- **Velocity:** CI p95 reduced by ≥30%; zero flaky tests in quarantine backlog; branch protections enforced on 100% main services.
- **Data:** Freshness SLA (≤1 hour) met 99% of time; null/referential issues down ≥50%; single metrics layer adopted by exec dashboards.
- **Customer Value:** Flagship workflow task time ↓50%; onboarding reduces related tickets by ≥30%; self-heal paths resolve ≥40% of common errors without support.
- **Cost/Performance:** Top 10 cost drivers with guardrails; compute spend per request ↓20%; log volume ↓30% via sampling/retention; performance budgets enforced in CI.

## Execution Notes

- Use feature flags with owners/expiry for all risky changes; automated rollback on failed health/SLO guardrails.
- Require runbook links for every alert; enforce RFC/architecture review (≤30 min SLA) for high-impact changes.
- Incorporate load tests for peak flows before major launches; include chaos drills (gameday) on top 3 failure modes.
- Publish a weekly scorecard covering SLO burn, incidents, MTTR, CI health, data freshness, and cost guardrails.
