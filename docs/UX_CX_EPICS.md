# UX & CX Transformation Epics

This document consolidates the cross-cutting user experience and customer success epics that guide the product toward clarity, speed to value, and operational excellence.

## Epic 1 — UX Surface Reduction (make the product feel obvious)

1. Inventory top 50 screens/flows by usage and support burden.
2. Merge duplicate paths into one canonical “happy path” per outcome.
3. Remove or hide low-usage settings; replace with smart defaults.
4. Standardize navigation and information architecture (one mental model).
5. Create a shared UI component library; delete one-off widgets.
6. Fix copy: rename confusing objects/fields; standard vocabulary everywhere.
7. Add progressive disclosure (advanced options behind toggles).
8. Reduce clicks: batch actions, inline edits, keyboard shortcuts where valuable.
9. Improve empty states with templates and next-step guidance.
10. Implement “undo” for destructive actions; reduce fear and tickets.
11. Deprecate legacy UI routes/components and remove dead CSS/JS.

## Epic 2 — Onboarding to First Value (minutes, not days)

1. Define the “first value” moment and instrument it precisely.
2. Ship one canonical onboarding flow (delete variants).
3. Preconfigure sensible defaults and auto-provision required resources.
4. Add guided setup with inline validation and clear recovery steps.
5. Provide starter templates/sample data for immediate usefulness.
6. Add role-based onboarding (admin/operator/viewer).
7. Create checklist tied to real actions and automatic completion.
8. Add lifecycle nudges (email + in-app) triggered by behavior, not time.
9. Build self-serve troubleshooting for common setup failures.
10. Add cohort dashboards for activation by source/segment.
11. Remove hidden prerequisites (docs-only steps) by building them into product.

## Epic 3 — Support Deflection as Product (make tickets unnecessary)

1. Categorize top 25 ticket types with owners and root-cause classes.
2. Improve error messages to include cause, impact, and next action.
3. Add “diagnostics” panel that runs checks and suggests fixes.
4. Implement self-serve recovery actions (retry/resync/reconnect/re-auth).
5. Create in-app status indicators (last sync, backlog, degraded mode).
6. Build customer timeline view (changes, errors, deploys, billing events).
7. Add help center content embedded contextually (right place, right time).
8. Create support macros linked to canonical docs and runbooks.
9. Add proactive notifications for known issues and degraded states.
10. Measure deflection: tickets per active account, repeat-rate by category.
11. Kill the top 10 ticket drivers with product fixes (not training).

## Epic 4 — Performance & Responsiveness (speed is UX)

1. Identify top 10 slow interactions (RUM + session replays if available).
2. Set p95 targets per interaction and publish as budgets.
3. Optimize payloads (pagination, field selection, compression).
4. Eliminate N+1 queries and add missing indexes.
5. Add caching where safe with correct invalidation rules.
6. Reduce frontend bundle size; remove unused dependencies.
7. Implement optimistic UI where appropriate (with rollback on failure).
8. Move heavy work async; show progress states users understand.
9. Add performance regression tests in CI for key flows.
10. Add release markers to performance dashboards for fast blame.
11. Ship a “Speed Release” and delete perf debt items that regress.

## Epic 5 — Reliability that Users Feel (fewer “weird” moments)

1. Define SLOs for user-critical journeys (not just services).
2. Add synthetic checks for signup, payment, core action, and integrations.
3. Implement canary deploys + automated rollback on SLO burn.
4. Harden dependency failures with graceful degradation and fallbacks.
5. Add idempotency on retried writes to prevent duplicates/corruption.
6. Fix top 20 customer-visible errors by class.
7. Add “safe mode” for partial functionality during incidents.
8. Improve background job reliability (DLQ, retries, observability).
9. Build “self-heal” actions surfaced to users and support.
10. Create status page + clear incident comms cadence.
11. Track reliability-driven tickets/churn and treat as top-tier bugs.

## Epic 6 — Trust & Transparency (reduce anxiety, increase adoption)

1. Add audit history for key objects (who changed what, when).
2. Show “last updated/last sync” timestamps and data freshness indicators.
3. Add permission explanations (“why can’t I do this?”) with next steps.
4. Provide export tools that reflect canonical truth (no stale illusions).
5. Add warnings/validations before destructive actions (blast radius clarity).
6. Publish clear data retention and deletion settings (and actually enforce).
7. Add user-visible integration health (connected, failing, last event).
8. Build account health dashboard for admins (errors, latency, limits).
9. Provide reliability history and “trust releases” changelog.
10. Create privacy controls surfaced in-product (where relevant).
11. Reduce surprise: predictable releases and in-app “what changed.”

## Epic 7 — Collaboration & Roles (invite loops with governance)

1. Create role templates and default permissions for common teams.
2. Add workspace/team structure with clean boundaries.
3. Implement comment/annotation and assignment workflows.
4. Add approvals/reviews for high-stakes actions.
5. Build notifications that are configurable and meaningful (not spam).
6. Add activity feed scoped to what users care about.
7. Provide shared saved views and dashboards (team habits).
8. Add bulk invite and SCIM readiness where enterprise matters.
9. Implement “request access” flows to reduce admin friction.
10. Add audit trails for permission and role changes.
11. Reduce permission model debt by centralizing policy enforcement.

## Epic 8 — Messaging & Education In-Product (teach without docs rot)

1. Add contextual tips that appear only when needed and then retire.
2. Build interactive walkthroughs for core flows (skip anytime).
3. Provide template gallery with best-practice examples.
4. Add “recipes” for common outcomes (step-by-step inside product).
5. Create a searchable command palette/help launcher.
6. Add “what’s new” and “what changed” panels tied to outcomes.
7. Embed short explainer videos/GIFs where truly helpful.
8. Create instrumentation to see which help content reduces failure/tickets.
9. Establish docs-as-code workflow with owners and review dates.
10. Remove stale help content and replace with productized guidance.
11. Track education KPIs: activation lift, fewer errors, fewer tickets.

## Epic 9 — CX Operating System (make improvement continuous)

1. Establish CX metrics: activation, task success, time-to-task, tickets, NPS/CSAT.
2. Create weekly “top friction” review: 3 issues in, 3 fixes shipped.
3. Implement UX debt budget (fixed % capacity) until targets hit.
4. Add a “voice of customer” pipeline: feedback → tags → owners → actions.
5. Tie roadmap items to customer outcomes (not internal milestones).
6. Require pre/post measurement for every UX change.
7. Create design QA checklist and enforce before release.
8. Add session replay/analytics governance (privacy-safe).
9. Build cross-functional launch checklist (support, docs, comms, rollback).
10. Maintain a public internal backlog of top friction points (ranked).
11. Celebrate CX wins with evidence (tickets down, time-to-value down).

---

### Next “Next” Theme

If additional scope is needed, extend the portfolio with a tenth epic focused on **data & AI productization**—personalization, copilots, automation with strong guardrails and debt burn baked in—using the same outcome-first structure above.
