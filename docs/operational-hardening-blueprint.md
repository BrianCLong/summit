# Operational Hardening Blueprint

This blueprint translates the nine provided epics into a cohesive, execution-ready plan that prioritizes stability, coordination, and disciplined delivery. It clusters early actions into a 30/60/90 day roadmap while defining ownership, success measures, and operational guardrails.

## Guiding Principles
- **Stability first:** Block net-new feature risks until Sev-1/2 debt is controlled (Epic 1).
- **Contract-first:** Every interface carries a reviewed contract and backward-compatibility plan (Epic 2).
- **State explicitness:** Replace implicit flags with well-defined state machines and transition auditing (Epic 3).
- **One admin surface:** Centralize privileged operations with RBAC/MFA and immutable audit (Epic 4).
- **Docs as infra:** Ship runbooks, readiness checklists, and ADRs as part of definition of done (Epic 5).
- **Trustworthy observability:** Standardize logging/metrics/tracing and align alerts to SLOs (Epic 6).
- **Migration factory:** Make data/service migrations idempotent, observable, and reversible (Epic 7).
- **Product surface consolidation:** Prefer canonical flows with safe defaults and permission clarity (Epic 8).
- **Operating cadence:** Fixed capacity for risk and debt burn with pre-mortems and ownership discipline (Epic 9).

## 30/60/90 Execution Roadmap
### Days 0-30 (Stability & Visibility)
- Stand up a **stability kanban** with explicit WIP limits; block drive-by work until triage clears (Epic 1.2).
- Build a **top-25 pain list** from incidents, tickets, and on-call notes; rank by frequency x blast radius (Epic 1.1).
- Define **error taxonomy** (codes + categories) and enforce via code review checklist (Epic 1.4).
- Add **runbooks for top 10 alerts** with owners, rollback, and contacts; publish in runbooks/ (Epic 1.5).
- Standardize **logging fields** (tenant/user/request IDs) and start crash-only hardening on top 5 failure paths with timeouts/retries/fallbacks (Epics 1.3, 6.1).
- Add **release health checks** to block deploys on key SLO regressions; gate in CI/CD (Epic 1.10).
- Establish **contract standards** (versioning, pagination, idempotency, error envelope) and linting in CI (Epics 2.1, 2.6).
- Identify three domains with the most “impossible states” and draft state diagrams with invariants (Epic 3.1–3.2).
- Inventory admin scripts, rank by risk/usage, and define the **admin console scope** + RBAC model (Epic 4.1–4.2).

### Days 31-60 (Controls & Contracts)
- Convert top 10 endpoints to **OpenAPI/gRPC contracts** with breaking-change detection and consumer-driven tests (Epics 2.2–2.3, 2.6).
- Implement **compatibility window policy (N-1)** and dual-run/deprecation playbook (Epics 2.7, 2.10).
- Add **crash-only patterns** to remaining critical paths; fix worst “unknown unknown” logs with structured fields (Epics 1.3, 1.9).
- Add **brownout toggles** for partial degradation and safe defaults that reject invalid configs early (Epics 1.7–1.8).
- Enforce **state machine constraints** in DB (FK/check/unique) and add transition auditing + idempotent handlers (Epics 3.3–3.5).
- Build **repair tools** and reconciliation jobs for drift between state and reality; add property-based tests (Epics 3.6–3.9).
- Ship **admin console** audit logging, scoped permissions, dry-run mode, and approval workflow for high-risk actions (Epics 4.3–4.9).
- Replace brittle cron with **observable jobs** (state, retries, DLQ) and publish runbooks/owners (Epics 1.6, 5.3).

### Days 61-90 (Factory & Consolidation)
- Stand up the **migration factory**: dual-write harness, idempotent backfills with checkpoints, verification toolkit, progress reporting, and feature-flagged cutover with rollback (Epics 7.1–7.6).
- Run three **pilot migrations** and apply the factory to top five debt targets; retire legacy components post-cutover (Epics 7.8–7.11).
- Standardize **product surfaces**: choose canonical UX per outcome, consolidate settings, reduce permutations with recommended defaults, and add permission clarity messaging (Epics 8.1–8.8).
- Implement **observability debt cleanup** and weekly risk review; add release markers and debug links from alerts to dashboards/traces/runbooks (Epics 6.5–6.9, 9.3).
- Publish **reliability scorecards** by team/domain and tie roadmap capacity to measurable outcomes (Epics 6.11, 9.2, 9.9).
- Enforce **ownership and no-orphan flags**: every service has an owner, SLO, deprecation plan, and flag expiry/cleanup (Epics 9.8, 9.10).

## Operating Model & Ownership
- **Stability captain** (rotating, weekly) drives the stability kanban, approves WIP changes, and owns Sev-1/2 prevention tickets (Epic 1.11).
- **Contract stewards** own API and event schema governance; breaking changes blocked without approved compatibility plan (Epics 2.4, 2.6, 2.7).
- **State guardians** per domain own state machines, DB constraints, reconciliation jobs, and repair tools (Epic 3.x).
- **Admin console owner** maintains RBAC/MFA, audit logging, dry-run/approval flows, and migration of top 20 scripts (Epic 4.x).
- **Observability lead** curates logging standards, dashboards, SLO alerts, release markers, and sampling strategy (Epic 6.x).
- **Migration factory owner** runs the harness, backfill framework, and cutover controls; reports progress and errors (Epic 7.x).
- **Product consolidation lead** drives canonical UX, search/filter system, and removal of low-usage surface area (Epic 8.x).
- **Operating cadence owner** facilitates quarterly objectives, pre-mortems, and war games; tracks on-call health (Epic 9.x).

## Controls, Tooling, and Checklists
- **Code review gates:** error taxonomy adherence, contract lint results, state transition invariants, telemetry fields present, and flag ownership/expiry.
- **CI/CD:** contract breaking-change check, health-check gate on SLO regressions, brownout toggle verification, and migration harness smoke tests.
- **Runbook index:** map alerts → runbooks → owners with rollback steps; keep in runbooks/ and link from dashboards.
- **Metrics & alerts:** RED/USE dashboards per service, anomaly detection for error spikes/tenant anomalies, synthetic checks for critical flows, release markers, and debug links chaining alerts to dashboards, traces, and runbooks.
- **Data quality:** backfill verification (row counts, hashes, invariants), shadow reads before cutover, and DLQ visibility for jobs.
- **Security/permissions:** scoped roles, 2-person approvals for high-risk actions, replay-protected webhooks, and standardized signatures.

## Success Measures
- **Stability:** Sev-1/2 volume ↓, MTTR ↓, deploy blocks on SLO regression working, prevention ticket SLA met.
- **Contracts:** >90% critical endpoints contract-tested; zero unreviewed breaking changes; contract violation rate tracked.
- **State correctness:** Zero “impossible state” incidents in targeted domains; reconciliation drift resolved within SLA.
- **Admin safety:** All top 20 admin operations migrated; audit logs complete; dry-run used for destructive paths.
- **Observability:** Alert precision improved (vanity alerts removed); dashboards linked to runbooks/traces; sampling cost targets met.
- **Migration factory:** Pilot migrations complete with rollback tested; legacy components retired within 2 weeks post-cutover.
- **Product surface:** Reduced configuration permutations; low-usage UI removed; permission clarity feedback improved.
- **Operating cadence:** Fixed debt-burn capacity honored; pre-mortems for high-risk launches; orphan flag count = 0.

## Forward-Looking Enhancements (innovation track)
- **AI-augmented triage:** Use anomaly detection plus LLM summarization to auto-propose stability kanban entries with estimated blast radius.
- **Autonomous contract diffing:** Continuous diff between observed traffic and OpenAPI/gRPC specs to surface undocumented fields/behaviors.
- **Probabilistic state repair:** Apply property-based generators to propose safe repair actions for detected drift with operator approval.
- **Adaptive sampling:** Dynamic telemetry sampling based on error budgets and tenant criticality to reduce cost without losing signal.

## Next Steps
1. Approve the 30/60/90 roadmap and assign named owners per role above.
2. Stand up the stability kanban and populate the top-25 pain list within the first week.
3. Publish the error taxonomy, contract standards, and review checklist in the engineering handbook.
4. Kick off the first brownout toggle implementation and the top 5 crash-only hardening fixes.
