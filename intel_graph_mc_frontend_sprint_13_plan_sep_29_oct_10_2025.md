# IntelGraph Maestro Conductor (MC) — Frontend Sprint 13

**Window:** Sep 29 – Oct 10, 2025 (2 weeks, America/Denver)

---

## Conductor Summary (one‑screen)

**Goal:** Deepen the MC Control Hub with a live **Run Graph view**, **streaming logs**, and **evidence bundle v0.2**—all policy‑aware—and harden performance, accessibility, and observability. Builds directly on Sprint 12 (auth, Control Hub, SLO panel, run detail).

**Non‑Goals:** Full pipeline editor; multi‑region residency UI; custom theming beyond tokens; offline installer UX.

**Assumptions:** Gateway provides `/runs/:id/graph`, `/runs/:id/logs` (WS/SSE), `/evidence/:runId/bundle`, `/opa/decide`, `/flags`; SLO history available. SSE stable; mocks exist behind `FEATURE_FAKE_DATA`.

**Constraints:** Org SLOs & cost guardrails enforced. Initial route JS ≤ 200 KB; graph & charts lazy‑loaded. WCAG 2.2 AA for new features.

**Definition of Done:**

- Users can open a run and view a **DAG graph** with status and timing overlays, inspect node artifacts, tail logs in real time, and export a signed evidence bundle.
- OPA decisions decorate the UI (policy badges + reasons). Telemetry spans cover graph layout, streaming, and evidence export.
- Playwright e2e pass for graph, logs, evidence; axe clean; Lighthouse budgets green; bundlesize check passes.

**Top Risks & Mitigations:**

- **Graph perf on big DAGs** → virtual edges, level‑of‑detail, layout in Web Worker.
- **WS disconnects/backpressure** → resumable cursors + bounded buffer; downgrade to SSE/poll.
- **OPA latency** → cache allow decisions for TTL; optimistic UI with rollback on deny.

---

## Scope (MoSCoW)

**Must**

1. Run Graph view (Cytoscape) with lazy data + worker layout.
2. Streaming Logs pane with search, pause, download, and backpressure handling.
3. Evidence bundle v0.2 (JSON + manifest + signatures) export from run detail.
4. OPA policy badges + reason tooltips on actions/sections.
5. Perf & a11y hardening (graph/logs) with CI budgets.

**Should** 6) SLO Dashboard page (history, burn, incidents links). 7) Apollo persisted queries + HTTP caching (ETag/SWR) for summary/runs/slo.

**Could** 8) Admin Feature Flags screen (tenant‑scoped read‑only if write API absent). 9) i18n scaffolding (en‑US extraction + ids) and motion‑reduction support.

---

## Backlog & RACI

**Capacity:** ~22 SP. Roles: FE‑Lead, FE‑Eng, QA, SRE, PM. R=Responsible, A=Accountable, C=Consulted, I=Informed.

| ID     | Story (Epic)                                                                         | MoSCoW | Est | R/A               | C/I         | Deps           |
| ------ | ------------------------------------------------------------------------------------ | -----: | --: | ----------------- | ----------- | -------------- |
| FE‑201 | **Run Graph (DAG)** using Cytoscape; status + duration overlays; select → side panel |   Must |   5 | FE‑Lead / FE‑Lead | SRE,PM / QA | FE‑103         |
| FE‑202 | **Graph perf**: worker layout, level‑of‑detail, edge virtualization; memoized styles |   Must |   3 | FE‑Eng / FE‑Lead  | — / QA      | FE‑201         |
| FE‑203 | **Streaming logs** WS/SSE `/runs/:id/logs`; search, pause, auto‑scroll, download     |   Must |   4 | FE‑Eng / FE‑Lead  | SRE / QA    | FE‑103         |
| FE‑204 | **Evidence v0.2** export: JSON + manifest of artifacts + signature verify indicator  |   Must |   3 | FE‑Eng / FE‑Lead  | PM / QA     | FE‑109         |
| FE‑205 | **OPA badges**: call `/opa/decide` for UI capabilities; show reason tooltips; cache  |   Must |   3 | FE‑Lead / FE‑Lead | PM,SRE / QA | FE‑105         |
| FE‑206 | **Perf/a11y budgets** for graph/logs; Lighthouse & axe gates extended                |   Must |   2 | FE‑Lead / FE‑Lead | QA / PM     | FE‑201/203     |
| FE‑207 | **SLO Dashboard**: history, burn, incident links; drill to SLO detail                | Should |   3 | FE‑Eng / FE‑Lead  | SRE / QA    | FE‑106         |
| FE‑208 | **Persisted queries + HTTP cache** (ETag/SWR) for summary/runs/slo                   | Should |   3 | FE‑Lead / FE‑Lead | SRE / QA    | FE‑101/102/106 |
| FE‑209 | **Admin Flags** read view; toggle UI guarded; audit event stub                       |  Could |   2 | FE‑Eng / FE‑Lead  | PM / QA     | FE‑104         |
| FE‑210 | **i18n + motion‑reduction** scaffolding; focus mgmt improvements                     |  Could |   2 | FE‑Eng / FE‑Lead  | QA / PM     | —              |

**Planned:** 22 SP (Must=20, Should=6, Could=4; deliver Must + Should; Could as stretch).

---

## Acceptance Criteria (selected)

**FE‑201 Run Graph**

- Loads via `GET /api/maestro/v1/runs/:id/graph` with nodes (id, name, status, timing) and edges.
- Cytoscape renders with layout offloaded to a Web Worker; node/edge clustering for > 500 nodes.
- Node click opens side panel: artifacts, step timings, `x-trace-id` link; keyboard navigable.

**FE‑203 Streaming Logs**

- Connects WS `/runs/:id/logs?cursor=…` with auto‑reconnect and resume; SSE fallback; poll fallback.
- Controls: search (client), pause/play, jump to latest, download last N MB (chunked).
- Backpressure: bounded message queue; UI shows drop count if overwhelmed.

**FE‑204 Evidence v0.2**

- Export includes run metadata, steps, artifacts manifest (hash, size, uri), policy decisions snapshot, signatures (if present) and verification status.
- File name: `evidence-run-<id>-<ts>.json`; download works in all modern browsers.

**FE‑205 OPA Badges**

- Calls `/opa/decide` with {subject, resource, action, context}; badges show Allow/Deny + short reason.
- Cache allow decisions for TTL; deny decisions not cached; UI disables blocked controls.

**FE‑206 Perf/a11y**

- Graph route bundle ≤ 230 KB _after_ lazy load (base route still ≤ 200 KB); INP ≤ 200 ms p75 on graph interactions.
- axe: no serious/critical issues on graph and logs views; focus order logical; ESC closes panels.

**FE‑207 SLO Dashboard**

- Shows 7/30‑day burn, error budget remaining, incident markers; clicking opens SLO detail.

**FE‑208 Persisted Queries/Cache**

- Uses Apollo persisted query ids; 304 flows honored with `If-None-Match`; SWR layer for summary & SLO.

---

## Design & ADRs

- **ADR‑013 Graph Rendering:** Adopt Cytoscape with worker‑driven layout (elkjs). Level‑of‑detail styles; memoized mappers.
- **ADR‑014 Streaming:** Prefer WS; support SSE; normalize into Rx stream; backpressure via ring buffer.
- **ADR‑015 Evidence Bundle:** JSON manifest schema v0.2 (hash algo, signer, policy snapshot). Keep stable ids for audit.
- **ADR‑016 Policy UI:** OPA `decide` responses drive capability map; optimistic UI only on idempotent reads.
- **ADR‑017 Caching:** Apollo persisted queries + HTTP `ETag`; SWR stale‑while‑revalidate for summaries.

---

## API Contracts (consumed)

- `GET /api/maestro/v1/runs/:id/graph → { nodes: Node[], edges: Edge[] }`
- `WS /api/maestro/v1/runs/:id/logs?cursor → LogEvent`
- `POST /api/maestro/v1/evidence/:runId/bundle → EvidenceBundle`
- `POST /api/opa/v1/decide → { allow: boolean, reason: string, ttlMs?: number }`
- `GET /api/maestro/v1/slo/history?range → SloPoint[]`
- `GET /api/maestro/v1/incidents?since → Incident[]`
- `GET /api/maestro/v1/flags → Flag[]` (and `PATCH` if permitted)

Headers: `Authorization`, `x-tenant-id`, `traceparent`, `x-trace-id` (display if present).

---

## Observability & SLOs (frontend)

- Spans for: graph data fetch, layout compute, first render; logs connect/reconnect; evidence export.
- Web vitals tracked (FCP, LCP, CLS, INP). Alert when INP > 200 ms p75 on graph page.
- Emit custom metrics: logs drops, WS reconnects, OPA decision latency.

---

## Testing, CI/CD & Budgets

- **Unit:** graph mappers, evidence schema builder, OPA hook.
- **Integration:** mock WS/SSE with recorded fixtures.
- **E2E (Playwright):** open graph, keyboard nav, filter logs, export evidence, OPA deny path.
- **A11y:** axe checks on graph/logs; color contrast validated (no info by color only).
- **Perf:** Lighthouse (mobile) budgets; route bundlesize; INP sampling via user flows.
- **Contracts:** contract tests vs mock server; persisted query id checks.

Pipelines gate on: lint, types, unit, e2e smoke, a11y, bundlesize, Lighthouse, contracts.

---

## Rollout & Backout

- Feature flags: `FEATURE_RUN_GRAPH`, `FEATURE_STREAMING_LOGS`, `FEATURE_EVIDENCE_V02`, `FEATURE_SLO_DASH`, `FEATURE_FLAGS_UI`.
- Canary to 10% tenants; watch WS errors, INP, error budget burn.
- Backout: disable features; fall back to run table and static logs download; keep evidence v0.1.

---

## Demo Script (Sprint Review)

1. Open Run → Graph view loads; select node → artifacts and timings.
2. Start logs streaming; search and pause; show reconnect on forced drop.
3. Export evidence v0.2; display signature verify indicator.
4. Show OPA deny on a restricted action; badge explains reason.
5. SLO Dashboard walkthrough; click into incident.

---

## Definition of Done (DoD)

- All Must + at least one Should shipped; gates green; budgets met; flags documented.
- Evidence bundle schema v0.2 recorded; API contracts published; release notes prepared (`v0.13.0`).
- Sign‑offs: FE‑Lead ✅, QA ✅, SRE ✅, PM ✅.
