# Activation, Retention, and Growth Execution Plan

This document recasts the nine 11-point epics into an execution-first plan optimized for fast activation, durable retention, and disciplined monetization. It assumes **flat headcount** with a goal to **double throughput in 90 days** while keeping the platform enterprise-and-security ready.

## Operating Principles

- **One canonical onboarding path** with clear “aha” moment instrumentation and guardrails.
- **Measure-first delivery**: every shipped step emits events, dashboards, and alerting by default.
- **Default secure**: SOC2-ready controls (SSO/MFA, audit logs, RBAC templates, data retention policies) bundled in from day one of each change.
- **Feature-flagged progression**: progressive delivery with automatic rollback on SLO burn to protect activation and revenue paths.

## North-Star Metrics

- **Time-to-Value (TTV)** to first “aha” event: median <10 minutes; p90 <20 minutes.
- **Day-7 retention**: +8–12 pp lift through weekly value proof and habit loops.
- **Revenue integrity**: <0.25% leakage; billing recovery >92% within 7 days.
- **Reliability SLOs**: signup/onboarding success >99.5%; payment write idempotency 100%.

## Activation Warpath (Epic 1)

1. **Aha Moment Definition & Instrumentation**
   - Event: first successful, saved graph with at least one enrichment and a shared view.
   - Metric: `aha_time_minutes` and conversion rate to “saved + shared”.
   - Actions: add event schema, add funnel dashboard by cohort/source/segment; synthetic checks for signup and first-run creation.
2. **First-Session Funnel**
   - Steps: account creation → role assignment → dataset connection → starter template run → save → share.
   - Capture drop-offs with inline validation and instant recovery paths (retry/resync buttons, idempotent writes).
3. **Onboarding Simplification & Defaults**
   - Remove three steps by: auto-provisioning starter dataset, defaulting RBAC templates per role, and pre-creating a guided checklist.
4. **Guided Setup & Error Recovery**
   - Inline validation, progressive disclosure, and a self-serve “fix-it” panel for common failures (auth, network, schema mismatch).
5. **Starter Data & Templates**
   - Ship role-based starter graphs and queries; seed with synthetic but realistic data; include “public view” mode where safe.
6. **Role-Based Onboarding**
   - Admin: org setup, SSO/MFA, domain claim; Operator: data connectors + automations; Viewer: saved views + notifications.
7. **Action-Tied Checklists & Nudges**
   - In-product checklist tied to event completion; lifecycle emails and in-app nudges based on behavior and stalled steps.
8. **Activation Dashboard**
   - Cohort/source/segment slicing; shows funnel health, error classes, recovery rate; aligned with reliability SLOs.
9. **Legacy Path Cleanup**
   - Deprecate alternative onboarding routes; centralize to one flow behind a feature flag, then remove dead code.

## Retention Engine (Epic 2)

- **Retention Drivers**: collaborative saved views, successful automations, and anomaly-driven alerts.
- **Weekly Value Report**: in-app and email with impact metrics (alerts resolved, investigations accelerated) and next best actions.
- **Notifications & Automations**: thresholds on anomalies; saved view reloads; undo + bulk actions to reduce friction.
- **Churn Watch**: early-warning signals on usage drops, errors, and invite failures; CS playbooks triggered via in-app tasks.
- **Retention Cohorts Dashboard**: cohorts with cancellation reason codes; track friction-killer impact.

## Monetization & Packaging (Epic 3)

- **Entitlement Service**: plan → feature/limit enforcement via versioned config; removes hardcoded plan logic.
- **Metering**: accurate event metering with replay safety and tests; upgrade prompts tied to value moments.
- **Self-Serve Billing**: proration/refunds, add-ons gated by entitlements; billing recovery with retries/grace periods.
- **Revenue Integrity**: leakage detection (over-grants, under-billing); weekly revenue integrity report.

## Growth Loops (Epic 4)

- **Referral & Sharing**: incentive-aware invites; shareable links/embeds with brandable output and watermarking.
- **Collaboration Primitives**: comments/approvals/roles that require invites; public view where safe for SEO.
- **Template Gallery**: viral, moderated templates with community submissions; frictionless account creation from shared objects.
- **Loop Metrics**: instrument K-factor, invite conversion, share-to-signup; kill underperforming channels.

## Sales-Assisted Readiness (Epic 5)

- **Security Foundations**: SSO + MFA with admin session controls; SCIM with group-to-role mapping; audit logs and evidence packs.
- **Governance**: org-level settings (domains, invites, policies), data retention controls, DSAR workflows, sandbox/staging modes.
- **Champion Dashboards**: org usage and ROI views; sales engineering console for health/config/integration status.
- **Standardized SLA/SLO**: ensure systems meet language; provide procurement/IT one-pagers and security posture docs.

## Experimentation & Learning Velocity (Epic 6)

- **Experiment Intake**: hypothesis, metric, segment, guardrails; linked to feature flags with consistent bucketing and exposure logging.
- **Dashboards & Library**: segment/cohort slicing; anomaly detection on guardrails; holdouts for long-term impact; decision memos automated post-test.
- **Data Quality**: checks on experiment events; delete orphan experiments without action plans.

## Performance as Growth (Epic 7)

- **Top Latency Targets**: identify p95 hotspots in first-session and core loops; add caching/indexing/payload slimming.
- **Async & Feedback**: move heavy work async with progress states; performance budgets in CI; CDN/edge caching for static assets.
- **Client Performance**: JS bundle trimming, render-blocking removal, instant search, list virtualization.
- **RUM**: cohort-aware RUM tied to conversion and retention outcomes.

## Reliability for Revenue (Epic 8)

- **SLOs & Synthetic Checks**: for signup, onboarding, payment; progressive delivery with automated rollback on SLO burn.
- **Error Reduction**: top 20 recurring customer-visible errors; dependency fallbacks and graceful degradation for partner APIs.
- **Idempotency & Self-Heal**: idempotent payment/provisioning writes; retry/resync/reconnect runbooks surfaced in product.
- **Health Scoring**: account health blends errors, latency, and activation progress; tied to churn tracking.

## Messaging & Positioning (Epic 9)

- **Narratives & Proof**: quarterly themes with benefits and measurable proof points; customer stories and case studies.
- **In-Product “What’s New”**: highlight value and reliability/security wins; competitive one-pagers; launch playbooks for major improvements.
- **Trust Center**: uptime history, controls, documentation; cancellation survey reason codes feed into roadmap weekly.

## 30/60/90 Execution Tracks (Headcount Flat)

- **First 30 Days**: instrument “aha” event and funnel; ship starter data/templates; remove three onboarding steps; enable inline validation and fix-it panel; start activation dashboard prototype.
- **Next 30 Days**: entitlement service + metering baseline; weekly value report; notifications on thresholds; referral/sharing with watermarking; SSO/MFA + audit log core; experiment intake + bucketing.
- **Final 30 Days**: self-serve billing with recovery; role-based onboarding polish; performance budgets in CI; RUM + reliability SLO guardrails; retention and revenue integrity dashboards; consolidation to single onboarding flow.

## Forward-Leaning Enhancements

- **Adaptive Onboarding**: use experiment framework to auto-tune onboarding path per segment, optimizing TTV and retention.
- **Semantic Guardrails**: apply policy-as-code (OPA) for data sharing/public views with real-time feedback during collaboration and template sharing.
- **Edge-First Delivery**: experiment with edge workers for onboarding API calls and template delivery to reduce p95 for first-session flows.
