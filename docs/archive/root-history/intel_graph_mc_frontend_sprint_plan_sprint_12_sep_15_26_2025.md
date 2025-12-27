# IntelGraph Maestro Conductor (MC) — Frontend Sprint 12

**Window:** Sep 15–26, 2025 (2 weeks, America/Denver)

---

## Conductor Summary (one‑screen)

**Goal:** Ship a production‑ready MC Control Hub slice (auth → control hub → runs → SLO snapshot) wired to real APIs, instrumented, and within performance/a11y budgets.

**Non‑Goals:** Full graph/flow editing UI; advanced topology views; multi‑region residency controls; full offline bundle UX.

**Assumptions:** 2 FE engineers + 1 QA + 0.25 SRE. Apollo/GraphQL gateway endpoints are up for **summary, runs, slo, tenants**; mocks remain available.

**Constraints:** Enforce org SLOs & cost guardrails. WCAG 2.2 AA for target flows. Bundle cap ≤ 200 KB initial route JS, route‑level code‑split.

**Done When:**

- Users can log in (OIDC), pick a tenant, land on Control Hub, view live runs & SLOs, and open a run detail.
- OTel web traces + web‑vitals flow to backend; x‑trace‑id visible in UI and links to Jaeger.
- Playwright e2e passing (auth, control hub, runs, SLO), axe checks clean, Lighthouse budgets met.
- Release notes + rollback plan merged; feature flag default **on** in staging.

**Risks:**

- Gateway schema drift → add typed client + contract tests.
- Perf regressions from charts → virtualize + defer render.
- Auth IdP config delays → ship mock OIDC + flag.

---

## Scope (Must/Should/Could)

**Must**

1. Wire Control Hub to real endpoints with fallback to mocks.
2. OIDC auth + protected routes + tenant switcher.
3. SLO panel with error‑budget burn, live trend via SSE/WebSocket.
4. Telemetry: OTel SDK + fetch instrumentation + web vitals.
5. Perf & a11y budgets enforced in CI; bundlesize gate.

**Should** 6) Run detail view: steps, artifacts, attestations, trace link. 7) Minimal evidence bundle export (JSON) for a run.

**Could** 8) Dark mode & theme tokens; persisted filters; basic i18n scaffolding.

---

## Backlog & RACI

**Capacity assumption:** ~20–22 SP.  
R=Responsible, A=Accountable, C=Consulted, I=Informed. Roles: FE‑Lead, FE‑Eng, QA, SRE, PM.

| ID     | Story (Epic)                                                                                                    | MoSCoW | Est (SP) | R/A               | C/I         | Deps        |
| ------ | --------------------------------------------------------------------------------------------------------------- | -----: | -------: | ----------------- | ----------- | ----------- |
| FE‑101 | Wire **Control Hub Summary** to `/api/maestro/v1/summary` via typed client; show autonomy, health, budgets (E1) |   Must |        3 | FE‑Eng / FE‑Lead  | PM,SRE / QA | gateway up  |
| FE‑102 | **Runs list** connected to `/runs?status&limit`, filters + pagination; loading/empty/error states (E1)          |   Must |        3 | FE‑Eng / FE‑Lead  | PM / QA     | FE‑101      |
| FE‑103 | **Run detail** route `/runs/:id` with steps, artifacts, attestations, trace link (E6)                           | Should |        3 | FE‑Eng / FE‑Lead  | SRE / QA    | FE‑102      |
| FE‑104 | **OIDC auth** (login, refresh, logout), protected routes, unauthorized view (E2)                                |   Must |        3 | FE‑Lead / FE‑Lead | PM / QA     | IdP cfg     |
| FE‑105 | **Tenant switcher** + ABAC hinting (policy badges) (E2)                                                         |   Must |        2 | FE‑Eng / FE‑Lead  | PM / QA     | FE‑104      |
| FE‑106 | **SLO panel** wired to `/slo` + burn calc; live updates via SSE/WS; fall back to poll (E3)                      |   Must |        4 | FE‑Lead / FE‑Lead | SRE / QA    | gateway SSE |
| FE‑107 | **OTel web**: trace provider, fetch instrumentation, traceparent propagation, link x‑trace‑id (E4)              |   Must |        3 | FE‑Eng / FE‑Lead  | SRE / QA    | FE‑101      |
| FE‑108 | **Perf & a11y budgets**: bundlesize ≤200 KB route, FCP ≤1.8s (mid‑tier), axe clean on key pages; CI gates (E5)  |   Must |        3 | FE‑Lead / FE‑Lead | QA / PM     | FE‑101/104  |
| FE‑109 | **Evidence export (JSON)** from run detail; download/signature fields displayed if present (E6)                 | Should |        2 | FE‑Eng / FE‑Lead  | PM / QA     | FE‑103      |
| FE‑110 | **Dark mode & tokens** (theme switch) (E7)                                                                      |  Could |        2 | FE‑Eng / FE‑Lead  | PM / QA     | —           |

**Total planned**: 20 SP (Must=15, Should=5, Could=2 as stretch)

---

## Acceptance Criteria (per key story)

**FE‑101 Control Hub Summary**

- Uses `maestroApi.getSummary()`; no mock when `FEATURE_FAKE_DATA=false`.
- Displays autonomy level/canary %, health success & p95, budgets remaining/cap.
- Loading skeleton ≤ 500ms delay before first paint.
- Unit tests for transformation logic.

**FE‑102 Runs List**

- Server filtering by status; client pagination with cursor/next token if provided.
- Row click navigates to `/runs/:id`.
- Empty state with “No runs yet” and link to docs.
- Playwright e2e validates filter interactions.

**FE‑104 Auth**

- OIDC login (PKCE), silent refresh, 401 → login redirect preserving `returnTo`.
- Protected routes guard; `TenantContext` provides `tenantId`, scopes.
- QA can inject mock IdP; feature flag `FEATURE_AUTH_MOCK` toggles.

**FE‑106 SLO Panel**

- Shows current vs target, error‑budget remaining, burn rate; colors reflect thresholds.
- Live updates via SSE/WS; falls back to 15s polling.
- p95 update latency ≤ 250ms for SSE path in staging.

**FE‑107 Telemetry**

- OTel Web SDK initialised; fetch instrumentation captures GraphQL/REST.
- `traceparent` propagated; request/response `x-trace-id` shown in run detail.
- Jaeger link opens trace when id present.

**FE‑108 Perf/a11y**

- Lighthouse CI (mobile) FCP ≤ 1.8s, TTI ≤ 2.5s on Control Hub.
- bundlesize check ≤ 200 KB for `/` route; code‑split charts.
- axe checks pass (no serious/critical).

---

## Design & Decisions (ADRs)

- **TypeScript‑only UI:** remove duplicate `.js` files where `.tsx` exists; `noImplicitAny` on; strict ESLint.
- **API client:** keep `src/maestro/api/client.ts` as single source of truth; handle errors → typed `ApiResponse`.
- **State/data:** co‑locate hooks per feature; avoid global store unless required; memoize charts; windowed lists.
- **Feature flags:** `FEATURE_FAKE_DATA`, `FEATURE_AUTH_MOCK`, `FEATURE_SSE` via Vite env & server‑provided config.
- **Routing:** React Router v6; route‑level code‑split; deep links for runs.
- **Theming:** MUI theme with token map and dark mode toggle.
- **Accessibility:** semantic landmarks; keyboard focus outlines; aria‑labels on interactive controls.

---

## API Contracts (consumed this sprint)

- `GET /api/maestro/v1/summary → ControlHubSummary`
- `GET /api/maestro/v1/runs?status&limit&cursor → RunsListResponse`
- `GET /api/maestro/v1/runs/:id → Run`
- `GET /api/maestro/v1/slo → SLO[]`
- `GET /api/maestro/v1/tenants → { items: Tenant[] }`
- SSE: `/api/maestro/v1/slo/stream` (event: `slo_update`)

Headers: `Authorization: Bearer <access_token>`, `x-tenant-id`, `traceparent` (propagate), `x-trace-id` (read/display).

---

## Observability & SLOs

- Web vitals (FCP, LCP, CLS, INP) → OTel exporter; dashboard panel in Grafana.
- User timing spans around route transitions and chart render.
- Alert when client error rate > 1% over 5m or vitals degrade > 20% vs baseline.

**Org SLO hooks** (enforced in UI where applicable):

- Subscriptions p95 ≤ 250 ms (SSE UI update budget).
- GraphQL calls p95 read ≤ 350 ms — surface when exceeded in Control Hub hints.

---

## Testing & CI/CD

- **Unit:** hooks/utilities (Jest).
- **E2E:** Playwright: auth, control hub, runs, SLO live updates; record trace & video.
- **A11y:** axe in Playwright (`@a11y` tag) → fail on serious.
- **Perf:** Lighthouse CI; `bundlesize` gate.
- **Contracts:** mock server generated from OpenAPI; schema check on CI.

Pipelines gate on: lint, types, unit, e2e (smoke), a11y, bundlesize, Lighthouse budgets.

---

## Rollout, Release & Backout

- Feature flags default **on** in staging, **on** in prod after review.
- Canary 10% of tenants (respect region tags); monitor vitals & error budget.
- Backout: flag off; revert to mock data (summary & slo); keep auth enabled.

**Deliverables**

- UI features per FE‑101…110, docs (README + DEPLOYMENT.md updates), dashboards snapshots, release notes `v0.12.0`.

---

## Risk Register & Mitigations

- **Gateway instability** → add exponential backoff + stale‑while‑revalidate cache; visible banner on degraded state.
- **Auth clock skew** → leeway on token validation; sync via `/time` head check.
- **Chart perf** → defer render offscreen; requestIdleCallback fallback.

---

## Demo Script (Sprint Review)

1. Login via OIDC → Tenant select.
2. Control Hub shows autonomy/health/budgets.
3. Filter runs → open run detail → trace link.
4. SLO panel updates live via SSE; show burn rate.
5. Evidence export (JSON) from run detail.
6. Show Grafana panel of web vitals tied to Jaeger trace.

---

## Definition of Done (DoD)

- ACs met; e2e/a11y/perf gates green; bundlesize within cap.
- Telemetry spans & trace links verified in staging.
- Docs updated; feature flags documented; release notes & backout steps merged.
- Owner sign‑offs: FE‑Lead ✅, QA ✅, SRE ✅, PM ✅.
