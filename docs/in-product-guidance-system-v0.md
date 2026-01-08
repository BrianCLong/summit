# In-Product Guidance System v0

## Objectives

- Enable each persona to reach time-to-value within their first week with minimal live support.
- Provide contextual, role-aware guidance that explains both _how_ to operate CompanyOS and _why_ the system behaves a certain way.
- Instrument guidance to measure completion, skips, and downstream effectiveness so we can iterate with evidence.

## Personas and First-Week Journeys

### Primary Personas

- **Ops Leader** (platform/IT ownership, rollout success, policy guardrails)
- **Engineer** (builds automations, integrations, and observability hooks)
- **Risk/Compliance** (policies, auditability, approvals)
- **Exec/Sponsor** (outcomes, adoption, KPI visibility)

### First Three Tasks per Persona

| Persona         | Day 1                                                          | Day 2–3                                                                 | Day 4–5                                                         |
| --------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| Ops Leader      | Accept invitation, set org defaults (timezone, auth provider). | Connect first data source and enable baseline alert routing.            | Publish rollout checklist + invite first team, assign roles.    |
| Engineer        | Generate API token, explore SDK quickstart.                    | Build first workflow (trigger + action) in sandbox.                     | Add logging/metrics sink; set up CI webhook for deployments.    |
| Risk/Compliance | Review policy templates; enable MFA/SAML.                      | Configure approval workflow (e.g., dual control) for sensitive actions. | Run first audit report and export evidence package.             |
| Exec/Sponsor    | View executive overview; confirm value KPIs.                   | Configure weekly digest + ownership map.                                | Approve first rollout milestone and monitor adoption dashboard. |

### Onboarding Modality

- **Progressive disclosure as default**: contextual nudges and inline explainers in-product; avoids overwhelming first-time users and adapts to role/tenant maturity.
- **Wizard-style**: reserved for gated milestones (e.g., initial tenant bootstrap, first data source connection) where sequencing is critical. Wizards are resumable and checkpointed.
- **Hand-offs**: persona hand-offs embedded (e.g., Ops Leader completes base config → prompts to invite Risk to set policies, Engineer to wire data). Each hand-off has a pre-filled invite message.

## Guidance Patterns

- **Tooltips & Hotspots**: single-tip highlights near controls; include “Why am I seeing this?” link for policy/logic rationale.
- **Step-by-step walkthroughs**: inline coach marks with progress meter; support resume state and skip; gated on tenant feature flags.
- **Checklists (sticky panel)**: role-scoped, progress-tracked; each item links to deep-linked page + inline explainer. Completion emits telemetry event with outcome status.
- **Embedded videos/docs**: modal or side-panel with transcript + copyable commands; cached per tenant to minimize bandwidth.
- **Inline “Why” panels**: collapsible rationale blocks showing: triggering policy, risk score, actors involved, and last change. Include “request exception” CTA where applicable.
- **System status banners**: show upstream/downstream health with links to runbooks.

### Policy Surfacing

- Present the blocking policy inline with **human-readable title**, **owner**, **last-reviewed date**, and **remediation CTA** (e.g., “Request exception”, “Contact policy owner”).
- Provide a **diff view** when a policy changed since the user last attempted the action.
- Record the attempted action, policy reference ID, and user role in telemetry for compliance analytics.

### Adaptation Rules

- **Role-aware**: filter guidance items by persona (role tags). Engineers see technical setup; execs see dashboards. Risk users see policy rationale by default; others get short-form.
- **Tenant configuration-aware**: feature flags and integration inventory drive what shows. Example: hide “Connect data source” walkthrough once ≥1 source connected; switch to “Harden pipeline” tips.
- **Maturity-aware**: onboarding tiers (T0 sandbox, T1 pilot, T2 production). Guidance content references maturity tier and nudges next milestone.
- **Locale & accessibility**: respect locale; provide keyboard navigation and WCAG AA contrast.

## Content Management and Measurement

- **Content storage**: Markdown/MDX in `docs/guidance/` with frontmatter (role, tier, feature-flag keys, version, owner, expiry). Rendered via in-app CMS service; hashed for cache-busting.
- **Authoring workflow**: PR-based with preview deploy; lint for broken links and missing metadata. Version tags align with app releases; older content auto-archives.
- **Localization**: keys stored in i18n bundle; content pipeline exports strings to translators; fallback to English.
- **Governance**: content owners per persona; review cadence monthly; SLA for policy text updates on change events.

### Telemetry

- Events: `guidance.view`, `guidance.start`, `guidance.complete`, `guidance.skip`, `guidance.dismiss`, `guidance.help_request`, `guidance.policy_blocked`.
- Event payload: `{ user_id, role, tenant_id, feature_flag_snapshot, content_id, step_id, action_id, outcome (success|error|blocked|skipped), timestamp }`.
- Metrics: completion rate, time-to-complete, drop-off step, downstream conversion (e.g., data source connected within 24h of walkthrough), policy exception rate.
- Privacy: PII minimized; IDs hashed; opt-out respected; retention policy 90 days for raw events, aggregates retained.

### Experimentation & A/B Testing

- Experiment definitions stored in `experiments/guidance.json` with guardrails (max exposure, cooldown). Randomization by tenant + role, stratified by maturity tier.
- Primary success metrics: time-to-first-value, completion rate, downstream activation (per persona task), support ticket rate.
- Automated bucketing with exposure logs; fail-safe to control variant on anomalies.

## Artifacts

### In-Product Guidance System v0 Outline

1. **Foundations**
   - Role/tier tagging model for guidance objects.
   - Content registry service reading `docs/guidance/*.mdx` with validation.
   - Telemetry schema + client hooks (web + mobile) emitting standardized events.
2. **Onboarding surfaces**
   - Role-based checklists with deep links and state persistence.
   - Walkthrough framework (coach marks + inline rationale) supporting resumable flows.
   - Policy panels explaining blocks with remediation CTAs.
3. **Operations**
   - Content authoring pipeline (lint, preview, approvals, localization export).
   - Experiment framework with guardrails and reporting dashboards.
   - Governance: ownership matrix, monthly review, SLA on policy updates.

### Example Onboarding Checklist (Ops Leader)

- [ ] Confirm org profile (timezone, incident channels, SSO/MFA).
- [ ] Connect first data source; route critical alerts to default channel.
- [ ] Configure role mapping + least-privilege defaults.
- [ ] Publish rollout plan and invite Engineer + Risk collaborators.
- [ ] Set up health dashboard + weekly digest.
- [ ] Run first failover or chaos drill and record outcome.

### Spec: Linking Guidance to Telemetry & Knowledge Objects

- Each guidance element (tooltip, checklist item, walkthrough step) has a **`content_id`** generated from frontmatter `{slug}-{version}`.
- Elements reference **knowledge objects** (runbooks, policy docs, FAQs) via stable URNs (`urn:companyos:knowledge:<type>:<id>`). URNs are stored in frontmatter.
- Rendering pipeline attaches `data-guidance-id` and `data-knowledge-urn` attributes to DOM nodes for deterministic telemetry capture.
- Client emits telemetry events with `content_id`, `step_id`, and `knowledge_urn` on view/start/complete/skip. Errors include `error_code` and `policy_ref`.
- Server-side joins telemetry with knowledge object metadata to power analytics (e.g., “which policy explainers reduce exceptions?”).
- Dashboards surface effectiveness by persona/tenant tier; alerts trigger if completion drops >20% week-over-week.

## Forward-Looking Enhancements

- **Adaptive sequencing**: real-time personalization using behavioral clustering to reorder checklist items and walkthrough steps.
- **LLM-driven inline coach**: contextual Q&A that cites knowledge objects and shows the exact policy or runbook snippet.
- **Predictive routing**: anomaly detection on telemetry to preempt churn (e.g., auto-trigger concierge session when execs stall on KPI setup).
- **Outcome scoring**: ML model predicting activation probability; guidance variants auto-optimized via multi-armed bandits.
