# IntelGraph Maestro Conductor (MC) — Frontend Sprint 15

**Window:** Oct 27 – Nov 7, 2025 (2 weeks, America/Denver)

---

## Conductor Summary (one‑screen)

**Goal:** Deliver **Tenant Admin & Audit** capabilities, a **Usage/Cost Guardrails** dashboard surfaced in Control Hub, and a **Notifications Center** with subscriptions—while tightening performance/a11y budgets and rounding out offline resilience for cached reads.

**Non‑Goals:** Full pipeline editor; multi‑region DR switchovers; custom chart builders; advanced theming beyond tokens; export signing UIs.

**Assumptions:** Sprint 12–14 features are live (auth, hub, SLOs, run detail/graph, logs, evidence v0.2, incidents, flags, PQ+SW caching, command palette). Gateway exposes:

- `/admin/users`, `/admin/roles`, `/admin/assignments`, `/admin/scim/status`
- `/audit/events` (cursor paged, filterable), `/audit/event/:id`
- `/billing/usage?range&tenant`, `/billing/budget` (dev/stage/prod guardrails)
- `/notifications` (list), `/subscriptions` (RW), `/profile`, `/tokens` (read, masked)
- OPA `decide` for admin actions; persisted query ids for all GETs.

**Constraints:** Org SLOs & cost guardrails enforced in UI. Initial route JS ≤ 200 KB; admin/usage modules lazy‑loaded; WCAG 2.2 AA; INP ≤ 200 ms p75.

**Definition of Done:**

- **Tenant Admin**: view users/roles/assignments; role grant/revoke when allowed by OPA; SCIM sync status.
- **Audit Log Viewer**: infinite scroll with filters (actor, resource, action, date, outcome); detail drawer.
- **Usage/Cost Dashboard**: charts for API, ingest, LLM usage vs guardrails; alerts when ≥80% budget.
- **Notifications Center**: in‑app inbox + subscriptions management (email/webhook) per tenant; digest frequency.
- **Offline hardening**: PQ + SW caching extended; background sync for failed POSTs (opt‑in for subscriptions only).
- CI gates (axe, Lighthouse, bundlesize) pass on all new routes.

**Top Risks & Mitigations:**

- **Admin writes mis‑scoped** → capability map from OPA + confirm modals + audit trail + optimistic rollback.
- **Audit flood** → server pagination + client virtualization + debounced filters + persisted queries.
- **Usage charts bloat** → virtual timeseries, memoized mappers, defer offscreen renders.

---

## Scope (MoSCoW)

**Must**

1. Tenant Admin (Users/Roles/Assignments) with OPA‑gated writes.
2. Audit Log Viewer with filters and detail drawer; export current view (CSV).
3. Usage/Cost Dashboard with guardrails visualization and alerts at 80%.
4. Notifications Center + Subscriptions CRUD (email/webhook) with policy reasons surfaced.
5. Offline hardening for cached reads + background sync for subscription writes (retries/backoff).
6. Perf & a11y budgets extended to new routes; INP ≤ 200 ms p75.

**Should** 7) Profile & Tokens (masked) panel; copy token id; last‑used metadata. 8) Saved audit filters + shareable deep links.

**Could** 9) Region status widget (read‑only) on Control Hub. 10) Guided tour tooltips for Admin & Audit screens.

---

## Backlog & RACI

**Capacity:** ~22–24 SP. Roles: FE‑Lead, FE‑Eng, QA, SRE, PM. R=Responsible, A=Accountable, C=Consulted, I=Informed.

| ID     | Story (Epic)                                                         | MoSCoW | Est | R/A               | C/I         | Deps           |
| ------ | -------------------------------------------------------------------- | -----: | --: | ----------------- | ----------- | -------------- |
| FE‑401 | **Tenant Admin (RO)**: users, roles, assignments lists + SCIM status |   Must |   3 | FE‑Eng / FE‑Lead  | PM,SRE / QA | FE‑104, FE‑205 |
| FE‑402 | **Role grant/revoke** with OPA decide + confirm + audit emit         |   Must |   3 | FE‑Lead / FE‑Lead | PM,SRE / QA | FE‑401         |
| FE‑403 | **Audit Log Viewer**: filters, infinite scroll, detail drawer        |   Must |   4 | FE‑Eng / FE‑Lead  | SRE / QA    | —              |
| FE‑404 | **Audit export (CSV)** of current filtered view                      |   Must |   2 | FE‑Eng / FE‑Lead  | PM / QA     | FE‑403         |
| FE‑405 | **Usage/Cost Dashboard** (API/GraphQL, ingest, LLM) vs guardrails    |   Must |   4 | FE‑Lead / FE‑Lead | PM,SRE / QA | —              |
| FE‑406 | **Notifications Center** (inbox) + **Subscriptions CRUD**            |   Must |   4 | FE‑Eng / FE‑Lead  | PM / QA     | FE‑205         |
| FE‑407 | **Offline hardening** (PQ+SW) + background sync for subs             |   Must |   2 | FE‑Lead / FE‑Lead | SRE / QA    | FE‑304         |
| FE‑408 | **Perf/a11y budgets** for new routes                                 |   Must |   2 | FE‑Lead / FE‑Lead | QA / PM     | FE‑401..407    |
| FE‑409 | **Profile & Tokens** (masked) + last used                            | Should |   2 | FE‑Eng / FE‑Lead  | PM / QA     | —              |
| FE‑410 | **Saved audit filters + deep links**                                 | Should |   2 | FE‑Eng / FE‑Lead  | PM / QA     | FE‑403         |
| FE‑411 | **Region status widget**                                             |  Could |   1 | FE‑Lead / FE‑Lead | SRE / QA    | —              |
| FE‑412 | **Guided tours**                                                     |  Could |   1 | FE‑Eng / FE‑Lead  | PM / QA     | —              |

**Planned:** 24 SP (Must=20, Should=4, Could=2; target Must + one Should).

---

## Acceptance Criteria (selected)

**FE‑401/402 Tenant Admin**

- `GET /api/maestro/v1/admin/users?cursor`, `/roles`, `/assignments?userId|roleId` rendered with pagination.
- OPA `decide` called before write; allow → show confirm modal with summary; deny → disabled control + reason tooltip.
- `POST /admin/assignments {userId, roleId}` and `DELETE /admin/assignments/:id` emit `audit.admin.assignment.updated`.
- SCIM status panel shows `lastSync`, `provider`, `state` with retry button if allowed.

**FE‑403/404 Audit Viewer**

- Filters: actor, action, resource, outcome, date range; debounced 300 ms; persists to URL params.
- Infinite scroll with cursor; detail drawer shows full event JSON + provenance hash.
- Export CSV respects current filters and sorts; capped to 50k rows with progress indicator.

**FE‑405 Usage/Cost**

- Shows API calls, ingest events, LLM tokens vs monthly budgets; 80% threshold triggers banner + bell badge.
- Tenants toggle; env tabs (dev/stage/prod) reflect guardrails: Dev ≤ $1k, Stage ≤ $3k, Prod ≤ $18k infra & ≤ $5k LLM; alert when ≥80%.
- Tooltips display unit costs: ≤ $0.10 / 1k ingested, ≤ $2 / 1M GraphQL calls.

**FE‑406 Notifications/Subscriptions**

- Inbox lists items with severity, source, timestamp; read/unread; filters.
- Subscriptions CRUD: channel (email/webhook), resource, event types, frequency; validate webhook URL.
- Writes retried with background sync if network lost; user informed.

**FE‑407 Offline Hardening**

- PQ + SW caching extended to admin read endpoints (RO only); cache stamped with tenant+scope; stale‑while‑revalidate.
- Background sync queue (Workbox) only for subscription writes; exponential backoff; cancelable.

**FE‑408 Perf/A11y**

- Lighthouse (mobile) FCP ≤ 1.8s, TTI ≤ 2.5s on Admin/Audit; INP ≤ 200 ms p75.
- axe: no serious/critical; listbox/pagination accessible; focus trap in drawers.

**FE‑409/410 Profile & Saved Filters**

- Tokens masked; copy id only; last used timestamp displayed; never render secrets.
- Saved audit filter presets with shareable URLs; MRU in Command Palette.

---

## Design & ADRs

- **ADR‑023 Admin Writes:** All writes go through capability guard derived from OPA `decide`; optimistic update + rollback + audit emit.
- **ADR‑024 Audit Viewer:** Virtualized list; server‑side sort; CSV export via streamed blob.
- **ADR‑025 Usage Charts:** Recharts with memoized selectors; downsampled series for large ranges.
- **ADR‑026 Notifications:** Unified inbox model with source/type; subscriptions form validated via Zod; background sync path limited to safe idempotent writes.
- **ADR‑027 Offline Partitioning:** Cache partitioned by {tenantId, scope, version}; admin read caches expire quickly.

---

## API Contracts (consumed)

- `GET /api/maestro/v1/admin/users → { items: User[], cursor? }`
- `GET /api/maestro/v1/admin/roles → Role[]`
- `GET /api/maestro/v1/admin/assignments → { items: Assignment[], cursor? }`
- `POST /api/maestro/v1/admin/assignments`
- `DELETE /api/maestro/v1/admin/assignments/:id`
- `GET /api/maestro/v1/admin/scim/status → ScimStatus`
- `GET /api/maestro/v1/audit/events?filters&cursor → { items: AuditEvent[], cursor? }`
- `GET /api/maestro/v1/audit/event/:id → AuditEvent`
- `GET /api/maestro/v1/billing/usage?range&tenant → UsageSeries`
- `GET /api/maestro/v1/billing/budget → BudgetRules`
- `GET /api/maestro/v1/notifications → Notification[]`
- `GET /api/maestro/v1/subscriptions → Subscription[]`
- `POST /api/maestro/v1/subscriptions`, `PATCH /api/maestro/v1/subscriptions/:id`, `DELETE /api/maestro/v1/subscriptions/:id`
- `GET /api/maestro/v1/profile → Profile`, `GET /api/maestro/v1/tokens → TokenMeta[]`

Headers: `Authorization`, `x-tenant-id`, `traceparent`, `x-trace-id`; persisted query ids for GETs; `opa-decision-id` echoed where available.

---

## Observability & SLOs (frontend)

- Spans: admin list loads, OPA decide, assignment writes (end‑to‑end), audit filter apply, CSV export, usage chart render, subscription writes.
- Metrics: PQ/SW cache hit‑rate, background sync queue size, OPA decision latency, 80%+ budget alerts fired.
- Alerts: client error > 1% over 5m on admin/audit pages; INP > 200 ms p75.

---

## Testing, CI/CD & Budgets

- **Unit:** OPA capability hook, CSV exporter, usage selectors, notifications form.
- **Integration:** admin writes with deny/allow; audit scroll with filters; background sync retry.
- **E2E (Playwright):** grant/revoke role (allow/deny), filter audit + export CSV, inspect usage breach banner, create webhook subscription then simulate offline + retry.
- **A11y:** axe runs; keyboard traps; list virtualization accessible labeling.
- **Perf:** Lighthouse budgets; bundlesize gates; INP sampling on admin interactions.
- **Contracts:** PQ id checks; mock server fixtures for admin/audit/billing.

Pipelines gate on: lint, types, unit, integration, e2e smoke, a11y, bundlesize, Lighthouse, contracts.

---

## Rollout & Backout

- Flags: `FEATURE_TENANT_ADMIN`, `FEATURE_AUDIT_VIEWER`, `FEATURE_USAGE_DASH`, `FEATURE_NOTIFICATIONS`, `FEATURE_BG_SYNC`.
- Canary 10% tenants; monitor OPA denies, write failures, INP, CSV export errors, alert banner rates.
- Backout: disable write paths; keep read‑only admin lists; hide notifications write; remove background sync via SW version bump.

---

## Demo Script (Sprint Review)

1. Open Tenant Admin → show users/roles/assignments; grant a role (allowed) then attempt a denied action with reason.
2. Navigate to Audit Viewer → filter by actor/action → infinite scroll → open detail → export CSV of current view.
3. Open Usage/Cost Dashboard → switch tenant/env → show 80% budget alert banner.
4. Notifications Center → create webhook subscription → cut network → show background sync retry → success.
5. Quick peek at Profile & Tokens panel (masked) and saved audit filters in Command Palette.

---

## Definition of Done (DoD)

- Must + at least one Should complete; all CI gates green; SLOs & cost guardrails surfaced; flags documented.
- Release notes `v0.15.0`; screenshots/gifs for docs; sign‑offs: FE‑Lead ✅, QA ✅, SRE ✅, PM ✅.
