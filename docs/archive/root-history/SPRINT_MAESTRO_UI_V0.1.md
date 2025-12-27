# Sprint Prompt — Maestro UI v0.1 (Conductor → Maestro)

> **Objective:** Evolve the current _Conductor_ UX into **Maestro**, a first‑class orchestration console that lets analysts route tasks across models and web interfaces, inspect quality/citations/cost, and drive evidence‑first workflows. Ship a production‑ready `/maestro` surface inside `apps/web` with a cohesive design system and test coverage.

---

## Context (what exists in the repo)

- **Web app stack:** React + TypeScript + Vite + Tailwind + TanStack Query + Apollo (`apps/web`). Component library under `apps/web/src/components/ui/*` and analysis panels under `apps/web/src/components/panels/*`.
- **Conductor UI pieces:**
  - `apps/web/src/components/conductor/ConductorDashboard.tsx` (metrics tabs, charts, GitHub/JIRA hooks).
  - Hooks: `apps/web/src/hooks/useConductorMetrics.ts`, `useGitHubIntegration.ts`, `useJIRAIntegration.ts`.
  - Legacy/prototype UIs: `conductor-ui/frontend` ("Symphony UI" wired scaffold), `conductor-ui/studio-lite/` (HTML demo), plus `client/src/features/conductor/ConductorStudio.tsx` (older Apollo view).

- **Docs:** `docs/CONDUCTOR_EVOLUTION_STRATEGY.md` describes _Conductor → Symphony Maestro_ and Phase‑2 “Web Interface Orchestrator”.
- **E2E:** Playwright tests under `e2e/` (e.g., `dashboard.spec.ts`).

**Gap:** There is no unified, production `/maestro` page that integrates routing preview, web‑interface orchestration, quality gates/citations, budgets & policy gating, and real‑time logs within the tri‑pane IntelGraph UX.

---

## Sprint Goal (2 weeks)

Deliver **Maestro v0.1**:

1. New **/maestro** route with a **four‑pane layout** (primary content + right inspector + bottom logs + sticky KPIs) aligned to existing tri‑pane patterns.
2. **Routing Studio**: preview & execute router decisions (experts/interfaces), with Thompson/LinUCB rationale and quality gates results.
3. **Web Orchestrator**: select/search interfaces, run parallel calls, synthesize responses, and attach **citations/provenance** into case evidence.
4. **Budgets & Policy**: real‑time cost ladder/burndown; LOA/Policy gate UI with human‑readable denials.
5. **Live Logs & Health**: SSE/stream tail; health/status panel from existing endpoints.
6. **A11y + Keyboard‑first**: command palette, shortcuts, focus rings, and axe‑clean.
7. **Tests and telemetry**: unit, Storybook stories, Playwright e2e, OTEL events.

---

## Success / Acceptance Criteria

**A. UX & Functionality**

- `/maestro` is routable from the main nav and guarded by auth. First paint < 1.5s on local dev with mock data.
- **Routing Studio** displays: selected task, candidate experts/interfaces, **decision rationale** (UCB/Thompson scores), **expected cost/latency**, and **quality gates** (pass/fail with reasons). Runs show step timeline and per‑step citations.
- **Web Orchestrator** supports: multi‑select of interfaces, parallel execution (concurrency control), response merge view, and **inline citation chips** (hover → provenance). One‑click **Attach to Case** writes a stub evidence object (mock).
- **Budgets**: shows current budget tier, remaining tokens/$, and a **burndown chart** with alerts when crossing thresholds.
- **Policy/LOA**: blocked actions render a readable reason + “request elevation” stub flow.
- **Logs & Health**: realtime stream pane with filters; health badge from `/status/health.json` (proxy when available; graceful degradation when not).

**B. Engineering Quality**

- Components use existing `ui/*` primitives; zero runtime ESLint errors; 95%+ type coverage on new files.
- Storybook stories exist for all new components with MSW mocks.
- A11y: keyboard nav for all interactives; axe passes in `e2e/a11y` suite; color contrast AA+.
- Tests: Vitest unit (>20 new tests), Playwright e2e for core happy paths and policy denial.
- Telemetry: add OTEL events for `maestro.route.start|end`, `maestro.web.synthesize`, `maestro.policy.denied` (no PII in attributes).

---

## Scope (In / Out)

**In**

- New page, routing studio, web orchestrator, budgets/policy panels, logs, command palette, a11y, tests.
- Mock adapters to Conductor endpoints; real calls **if** env provides a proxy (from `conductor-ui/frontend` `makeAPI` pattern).

**Out**

- Backend router/model changes; full case evidence persistence (stub only); production auth flows beyond what exists.

---

## Deliverables

1. `apps/web/src/pages/MaestroPage.tsx` and child components in `apps/web/src/components/maestro/*`.
2. New hooks `useMaestro*` in `apps/web/src/hooks/` for metrics, orchestration, budgets, policy, health.
3. Route + nav entry + feature flag `MAESTRO_ENABLED`.
4. Storybook stories (`apps/web/.storybook/*`) and MSW handlers.
5. e2e specs: `e2e/maestro.spec.ts` (+ a11y checks under `e2e/a11y/`).
6. Docs: `docs/maestro/UX_SPEC_v0.1.md` and `docs/maestro/API_ADAPTERS.md`.

---

## User Stories

- **US‑1 (Route preview):** As an analyst I can enter a task and preview which experts/interfaces Maestro will pick, with rationale and cost/latency estimates.
- **US‑2 (Parallel web orchestration):** As an analyst I can pick 1..N web interfaces, run them in parallel, and see synthesized response with citations.
- **US‑3 (Quality gates):** As an ombuds observer I see which gates passed/failed and why; I can open a rationale drawer.
- **US‑4 (Budgets):** As a lead I can see burndown and remaining quota; I get a soft halt when a threshold is hit.
- **US‑5 (Policy/LOA):** As an operator I see block reasons and a request‑elevation stub.
- **US‑6 (Logs/Health):** As an operator I can tail logs and see service health.
- **US‑7 (A11y/Keyboard):** As any user I can operate Maestro without a mouse and with a screen reader.

---

## Implementation Plan (file‑level)

### 1) Scaffold page & routes

- **Create:** `apps/web/src/pages/MaestroPage.tsx` (layout with Tabs: _Routing_, _Web_, _Budgets_, _Policy_, _Logs_). Use `KPIStrip` at top.
- **Wire route:** update `apps/web/src/App.tsx` → add `<Route path="/maestro" element={<MaestroPage/>}/>` and nav item in `components/Navigation.tsx`.
- **Feature flag:** `apps/web/src/lib/flags.ts` export `isMaestroEnabled()` → read from `import.meta.env.VITE_MAESTRO_ENABLED`.

### 2) Hooks & adapters (reuse prototype patterns)

- **Adapters:** Port `conductor-ui/frontend` `makeAPI()` to `apps/web/src/lib/maestroApi.ts` with env sourcing (proxy preferred, graceful fallback). Methods: `health()`, `burndown()`, `models()`, `routePreview()`, `routeExecute()`, `webInterfaces()`, `orchestrateWeb()`, `logsSSE()`.
- **Hooks:** `useMaestroHealth`, `useMaestroBudgets`, `useMaestroRouting`, `useMaestroWeb`, `useMaestroLogs` (TanStack Query + SSE where applicable).

### 3) Routing Studio

- **Components:** `RoutingForm.tsx`, `CandidateList.tsx`, `DecisionRationale.tsx`, `QualityGatesPanel.tsx`, `RunTimeline.tsx`.
- **Rationale:** render UCB/Thompson confidence bands; show expected cost/latency; include small info popovers.
- **Gates:** pass/fail badges with tooltips and link to details drawer.

### 4) Web Orchestrator

- **Components:** `InterfacePicker.tsx` (search, category filters), `ParallelRunner.tsx` (concurrency control), `Synthesizer.tsx` (diff/merge view), `CitationChips.tsx` (hover → provenance), `AttachToCaseButton.tsx` (stub action & toast).
- **Diff/Merge:** two‑column compare with accept/reject and final combined view; store transient draft in component state.

### 5) Budgets & Policy

- **Components:** `BudgetStrip.tsx` (tier pill, remaining), `BurndownChart.tsx` (reuse recharts from ConductorDashboard), `PolicyGate.tsx` (denial banner with reason & request button), `ThresholdAlerts.tsx`.

### 6) Logs & Health

- **Components:** `LiveLogPane.tsx` (virtualized list, filters), `HealthBadge.tsx` (status + response time), `ServiceMatrix.tsx` (grid of components with state).

### 7) Cross‑cutting UX

- **Command palette:** add `Ctrl/Cmd+K` palette to trigger Maestro actions (open tab, run preview, focus logs, etc.).
- **A11y:** focus management, ARIA roles, reduced‑motion option, semantic headings.

### 8) Tests & Storybook

- **Vitest:** unit tests for hooks and reducers; snapshot stories for components.
- **Playwright:** `e2e/maestro.spec.ts` covering: render, route preview, web orchestration, policy denial, attach‑to‑case toast, keyboard nav.
- **Axe:** run in `e2e/a11y` on the `/maestro` route.

---

## API Contracts (provisional mocks)

```ts
// route preview
POST /maestro/route/preview { task: string, context?: object }
→ 200 { candidates: Array<{ id: string; type: 'model'|'web'; name: string; score: number; cost_est: number; latency_est_ms: number; rationale: string }> }

// route execute
POST /maestro/route/execute { task: string, selection: string[] }
→ 200 { runId: string, steps: Array<{ id: string; source: string; status: 'ok'|'fail'; tokens?: number; cost?: number; citations?: Array<{title:string,url:string}>, elapsed_ms: number }> }

// web interfaces
GET /maestro/web/interfaces → 200 { items: Array<{ id:string; name:string; category:string; reliability:number; cost_hint:number }> }

// orchestrate web
POST /maestro/web/run { task: string, interfaces: string[] }
→ 200 { responses: Array<{ id:string; interface:string; text:string; citations: Array<{title:string,url:string}> }>, synthesized: { text:string; citations: Array<{title:string,url:string}> } }

// budgets
GET /maestro/budgets → 200 { tier: 'bronze'|'silver'|'gold', remaining:{ tokens:number, usd:number }, burndown: Array<{ t:string, usd:number, tokens:number }> }

// policy gate
POST /maestro/policy/check { action:string, payload?:object }
→ 200 { allowed:boolean, reason?:string, elevation?:{contact:string, sla_hours:number} }

// logs (SSE)
GET /maestro/logs/stream → event: { ts:string, level:'info'|'warn'|'error', source:string, message:string }
```

---

## Definition of Done

- All acceptance criteria pass; CI green; no new `eslint`/`tsc` warnings.
- Storybook deployed (static build) with MSW; visual check signed off.
- Playwright e2e added to CI (tag: `@maestro`).
- Docs updated; screenshots included.

---

## Risks & Mitigations

- **Backend variance:** Endpoints may not exist. _Mitigation:_ ship MSW mocks + env‑based adapter fallbacks.
- **Performance:** Parallel orchestration UI may stutter. _Mitigation:_ virtualization, suspense + skeletons, debounce inputs.
- **A11y scope creep:** Keep to essential controls in v0.1; add audits incrementally.

---

## Branch & CI

- Branch: `feature/maestro-ui-v0.1`
- PRs: small, feature‑flagged; require Storybook + e2e demo videos.
- CI: add `pnpm build-storybook` + `pnpm e2e` jobs; artifact upload for Storybook.

---

## Next (stretch)

- Graph/timeline/map tri‑sync of run artifacts; per‑step provenance overlays; team activity presence; export to report studio.

---

## Appendix — File checklist to touch

- `apps/web/src/pages/MaestroPage.tsx` (new)
- `apps/web/src/components/maestro/*` (new)
- `apps/web/src/lib/maestroApi.ts` (new)
- `apps/web/src/hooks/useMaestro*.ts` (new)
- `apps/web/src/components/Navigation.tsx` (update)
- `apps/web/src/App.tsx` (update)
- `apps/web/src/components/panels/KPIStrip.tsx` (reuse)
- `conductor-ui/frontend/src/App.tsx` (reference only)
- `docs/maestro/UX_SPEC_v0.1.md` (new)
- `e2e/maestro.spec.ts` (new)
