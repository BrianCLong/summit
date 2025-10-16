# Maestro Conductor UI — Enterprise-Grade Blueprint (v1)

**Version:** v1  
**Status:** Draft baseline for enterprise-grade Maestro Conductor console  
**Owners:** Maestro Conductor Product, Design, and Frontend Engineering  
**Mission:** Evolve the Maestro Conductor build/orchestration platform UI from "works for us" to an enterprise-grade, analyst- and operator-centric console with first-class governance, performance, and productivity delight.

---

## 0) North-Stars & Non-Negotiables

- **Time-to-Insight (TTI):** p95 < 1.5s for common views (Dashboard, Pipeline, Build, Release). Heavy analytics streamed progressively.
- **Trust by Design:** immutable audit, provenance tooltips, reason-for-access prompts, and clear policy denials.
- **Keyboard-first & A11y AAA:** 100% features reachable by keyboard, screen-reader labels, motion-reduction options.
- **Multi-tenant & Compartmentation:** tenants → spaces → projects with ABAC/RBAC and two-person controls for risky actions.
- **Explainability:** every auto decision (e.g., auto-retry, gate pass/fail) carries a human-readable rationale.

---

## 1) Personas & Jobs-to-Be-Done (JTBD)

**Primary personas**

- **SRE/Operator:** keep builds/release trains healthy; diagnose incidents; enforce SLOs.
- **Developer:** author pipelines, debug flaky steps, compare diffs/run history.
- **Release Manager:** promote artifacts across environments with policy compliance and change logs.
- **Security/GRC:** verify approvals, audit who saw/did what, simulate policy changes.
- **FinOps Analyst:** track unit costs per pipeline/env; enforce query/compute budgets.

**Representative JTBD**

- “See which pipelines are currently bottlenecking and why.”
- “Drill from a red SLO widget to the precise failing step’s logs, then open a PR for a fix.”
- “Promote build #842 to Staging with change-impact diff and required approvers, then schedule prod gate.”
- “Explain why an artifact export is blocked, and how to request an exception.”

---

## 2) Information Architecture

- **Global Bar:** Tenant switcher • Command Palette (⌘K) • Alerts (inbox) • Presence/Session • Help.
- **Left Navigation (resizable):** Dashboard • Pipelines • Builds • Artifacts • Environments • Releases • Runbooks • Observability • Admin.
- **Primary Work Surface:** context-aware tri-pane when useful:
  - **Graph/Map:** DAG of pipeline/run, dependency map, or environment topology.
  - **Timeline:** runs, deploy windows, incident overlays; brushable time window.
  - **Detail/Table:** steps, logs, diffs, approvals, costs.
- **Right Rail (collapsible):** Explain-this-view • Provenance • Related tickets • Comments/@mentions.

---

## 3) Critical Screens & States

### 3.1 Dashboard (multi-tenant aware)

- Widgets: Pipeline Health, Queue Depth, Longest Critical Path, Flaky Step Hotlist, Cost Guard, Change Risk, Policy Denials.
- Interactions: click-through to filtered lists; time-range brush; persistable layouts per role.
- Empty/Degraded states: graceful text + quick-start guides; edge/offline banner with last-sync timestamp.

### 3.2 Pipelines

- **List:** status, owners, last run, lead time, DORA metrics, cost per 100 runs.
- **Pipeline Detail:**
  - **DAG Canvas:** pan/zoom, fit-to-screen, critical-path highlight; selecting a node opens the step panel (definition, cache hits, artifacts, owners, SLAs, flaky score).
  - **Run History Strip:** mini sparkline; anomalies flagged; compare two runs.
  - **Policies:** required gates, approvers, allowed environments.

### 3.3 Build/Run View

- **Header:** run id, branch/commit, initiator (human/bot), env, queue/start/finish; badges (retries, caches, quarantined).
- **Logs Panel:** streaming, jump-to-error, structured log facets; regex search; copy with provenance.
- **Artifacts:** checksums, SBOM, provenance manifest; export with license checks; diff against baseline.
- **Explainability Tab:** why a step failed/passed; auto-retry rationale; suggested fixes (linked code lines).
- **Approvals:** pending/complete, 4-eyes control, reason capture, change ticket links.

### 3.4 Releases & Environments

- **Release Train:** calendar view; gate status; impact diff (config, schema, migrations, feature flags).
- **Environment Topology:** services map; current versions; error budgets; rollout rings (canary/blue-green).
- **Promotion Flow:** pre-flight checks → policy sim → approvals → schedule → watch rollout.

### 3.5 Observability

- SLO dashboard (latency, error rate, saturation), query heatmap, slow step killer, cost explorer.
- Traces linked to runs/steps; click from log line → trace span.

### 3.6 Admin (Tenant/Space/Project)

- Users, groups (SCIM), roles; ABAC policies with dry-run simulator.
- Connectors & Secrets: health, rate limits, quotas, backoff; rotate with dual-control.
- Schema/Registry: versions, migrations, compatibility checks; feature flags.

---

## 4) Design System & Interaction Patterns

- **Tokens:** color scale (WCAG AA/AAA), spacing 4-pt grid, radius 16px (2xl), density compact/comfortable.
- **Components (enterprise-hardened):** DataGrid (virtualized, column formulas, pin/freeze), DAG Canvas, Timeline, Log Viewer, Diff Viewer, Approval Sheet, Policy Simulator, Cost Guard Panel, Step Editor, SBOM Viewer, Provenance Tooltip, Empty/Degraded/Offline banners.
- **Command Palette (⌘K):** verbs (“Run pipeline…”, “Open run…”, “Promote…”, “Explain…”) + objects; preview pane shows effects/cost.
- **Keyboard Map:** global (G then P = Pipelines, G then R = Releases, / = search), canvas (arrows = move, F = fit, . = next error).
- **Theme Modes:** light/dark/high-contrast; reduced motion; dyslexia-friendly font option.

---

## 5) Governance, Security & Audit (UI Surface)

- **Reason-for-Access prompts** for sensitive views; recorded on audit trail.
- **Policy Denial Cards:** clear human-readable reasons + appeal path; link to policy simulator with hypothetical outcome.
- **Disclosure Packager:** export run/release with manifest (hash tree, transforms, licenses) and optional redactions.
- **Dual-Control Deletes/Rotations:** UI walks two approvers through synchronized confirmation.

---

## 6) Performance & Reliability Targets (UX-visible)

- **p95 interactions:**
  - Load Pipeline list ≤ 1.2s @ 5k pipelines.
  - Open Run view ≤ 1.5s; first log paint < 300ms (streamed).
  - DAG render ≤ 700ms @ 500 nodes; pan/zoom 60fps.
- **Degradation:** if backend exceeds budgets, UI shifts to partial results with skeletons + “what’s missing” banner.
- **Offline/Edge:** read-only cache, queued actions with CRDT merge view on reconnect.

---

## 7) Analytics, XAI & Copilot Surfaces

- **Natural-Language Panel:** prompt → previewed query/impact → sandbox execute; diff vs manual.
- **Explain-This-View:** callouts for metrics, how calculated, inputs, caveats; link to model card.
- **Hypothesis Helper:** suggests likely root-causes of flaky steps with confidence bands and evidence links.
- **Narrative Builder:** one-click post-incident or release note from selected evidence (runs, diffs, charts).

---

## 8) Runbooks (Embedded, Replayable)

- **Examples:** Flaky Step Triage, Slow Queue Drain, SLO Burn Investigation, Cost Spike Containment, Policy Change Simulation, Release Rollback.
- Each runbook = DAG: inputs → steps → outputs, with replay logs, assumptions, KPIs, failure modes.

---

## 9) Accessibility & Internationalization

- **A11y:** axe-core gates in CI; forms with live region updates; focus traps; color-blind safe palettes.
- **i18n:** ICU messages; RTL; locale time/units; pseudolocalization runs; transliteration helper for search.

---

## 10) Observability in the UI (for the UI)

- **Self-SLO widget:** UI’s own latency and error widget in Admin → shows recent regressions.
- **Event Log:** significant UI events (navigation stalls, render long task) surfaced to operators.

---

## 11) FinOps & Unit Economics (Surface)

- **Cost Guard:** per-pipeline cost meters, budgets, downshift modes; per-tenant explorer; export CSV/Parquet.
- **Optimization Hints:** cache opportunities, step consolidation, artifact pruning.

---

## 12) Privacy & Ethics Overlays

- **Provenance chips** on artifacts/logs show source, transform chain, license; click → disclosure bundle.
- **Minimization indicators:** UI highlights fields hidden by policy; hover explains basis; request-access workflow.

---

## 13) Acceptance Criteria (Representative)

- **DAG Canvas:** renders 500-node graph ≤ 700ms; selection → details ≤ 150ms; keyboard navigation complete.
- **Log Viewer:** 100k lines stream with backpressure; search ≤ 250ms; copy block preserves structure.
- **Approvals:** 4-eyes enforced; reason required; audit trail includes who/when/why; rejection requires comment.
- **Policy Simulator:** dry-run shows delta vs baseline, affected users, and example queries.
- **Export:** bundle includes manifest (hashes, transforms, licenses); external verifier passes.

---

## 14) Technical Architecture (Frontend)

- **Stack:** React + TypeScript; Tailwind + tokens; shadcn UI primitives; Recharts for simple charts; Web Workers for log parsing; Canvas/WebGL for DAG.
- **State:** React Query + normalized cache; URL-addressable state for shareable deep links; feature flags.
- **Data Access:** GraphQL w/ persisted queries + cost limits; SSE/WebSocket for streams.
- **Performance:** code-splitting, route prefetch, virtualization, memoization, Suspense streaming.
- **Testing:** Vitest/Jest + RTL; Playwright E2E (axe scans); visual diffs on critical screens.

---

## 15) Migration & Change Management

- Side-by-side Beta: opt-in per team; telemetry-driven cutoff.
- “What moved where” overlay; contextual hints for first 3 sessions.
- Rollout schedule with canary tenants; rollback plan; feedback loop with in-product survey.

---

## 16) Risks & Mitigations

- **Graph complexity overwhelms users →** progressive disclosure; saved views; templates.
- **Policy friction →** simulator + reasons + appeal path; docs; ombuds contact.
- **Performance under load →** budgets, backpressure, result hints; pre-computed summaries.

---

## 17) Roadmap (UI Scope)

- **Milestone 1 (Core GA):** Dashboard, Pipelines, Builds, basic Releases, Observability lite, AuthZ surfaces, A11y baseline.
- **Milestone 2:** Policy Simulator, Cost Guard, Narrative Builder, Runbooks (top 3), DAG v2, High-contrast theme.
- **Milestone 3:** Offline kit v1, Disclosure Packager, Advanced Releases (rings), Self-SLO, Internationalization.

---

## 18) Appendix — Component Inventory (Props/Events)

- **DAGCanvas**(nodes, edges, selection, onSelect, layout, criticalPath, keyboardMap)
- **LogViewer**(source, mode, searchQuery, highlights, onCopy, followTail, bookmarks)
- **DiffViewer**(left, right, syntax, inline|side-by-side)
- **ApprovalSheet**(request, approvers, reasonsRequired, onApprove, onReject)
- **PolicyCard**(rule, result, rationale, simulateAction)
- **ProvenanceTooltip**(source, transformChain, license)
- **CostMeter**(period, budget, spend, forecast)
- **RunbookRunner**(definition, inputs, onStep, onAbort, replay)

---

## 19) Milestone 1 (Core GA) Backlog & Execution Plan

### 19.1 Component Stub Sandbox

- **Location:** `/ui/src/features` demo shell with Tailwind tokens and shadcn primitives already wired for focus-visible and keyboard ergonomics.
- **Usage:** `pnpm --filter ui dev` (or matching npm script) launches the canvas with hot module reload so epics can slot in without blocking.
- **State model:** mock React Query providers and persisted GraphQL documents stub network latency so perf budgets can be profiled before real services land.
- **Goal:** treat the shell as the integration target for every story so accessibility, telemetry, and URL state are validated end-to-end from day one.

### 19.2 Epic Overview

- **E1 — Dashboard (tenant-aware) MVP:** standing up the command center with Pipeline Health, Queue Depth, and Policy Denials widgets.
- **E2 — Pipelines list + detail (DAG v1):** virtualized index with deep links into the DAG canvas and node insights.
- **E3 — Build/Run view (logs, artifacts, metadata):** log streaming, rich metadata bars, and explainability hooks.
- **E4 — Releases (basic promotion flow):** approvals, policy sim stubs, and audit capture for promotions.
- **E5 — Observability Lite (SLO summary):** quick-glance SLO status with drill-through to affected runs.
- **E6 — AuthZ surfaces (reason-for-access, audit chips):** sensitive views require rationale and surface provenance chips.
- **E7 — A11y Baseline + Perf Budgets:** enforce lighthouse, axe-core, and reduced motion toggles across primary routes.

### 19.3 Stories & Acceptance Criteria

| Story                                       | Scope                                                                                                                | Acceptance & Notes                                                                                                                                                                    |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S1.1 Dashboard skeleton & widgets frame** | Tenant-aware Dashboard route, widgets for Pipeline Health, Queue Depth, Policy Denials with empty state scaffolding. | Load p95 ≤ 1500 ms using stubbed 2k pipeline dataset; command sequence `g` → `d` focuses dashboard; widgets deep link into filtered lists and render graceful empty/degraded banners. |
| **S2.1 Pipelines list (virtualized)**       | Virtualized table with Status, Owners, Last Run, Lead Time, DORA metrics; filter/search controls.                    | Debounced query ≤ 150 ms; URL query params reflect filters; supports column resizing/pinning via DataGrid token set; includes skeleton + error states.                                |
| **S2.2 Pipeline detail + DAG v1**           | DAG canvas + detail pane; run history strip; critical path toggle.                                                   | Render 200 nodes at 60 fps pan/zoom; fit-to-screen hotkey; selecting node hydrates detail pane ≤ 150 ms; emits analytics event with node + pipeline metadata.                         |
| **S3.1 Log viewer wired**                   | SSE/WebSocket abstraction + LogViewer component with follow tail, find-in-log, jump-to-error.                        | First paint < 300 ms on stub stream; client search ≤ 250 ms on 50k lines; jump-to-first-error button focuses relevant log block and updates URL hash.                                 |
| **S3.2 Run header + metadata bar**          | Run summary ribbon with commit, initiator, env, duration, retry/cache badges, provenance copy action.                | Copy control generates structured payload (JSON + provenance id); badges expose tooltips with rationale; responsive layout collapses gracefully ≤ 768 px width.                       |
| **S4.1 Basic promotion flow**               | Release promotion wizard: pre-flight checklist stub, approval modal (4-eyes), reason capture, audit log persistence. | Promotions blocked until two approvers provide reasons; audit chip appended to local store with who/when/why; decline requires comment; simulator panel lists pending policy checks.  |
| **S5.1 Observability lite**                 | SLO widget stack summarizing latency/error/saturation, linked to run filters.                                        | Mock data updates via React Query polling; clicking metric pre-filters Pipelines/Builds views; includes explain-this-view tooltip describing formula and inputs.                      |
| **S6.1 Reason-for-access prompt**           | Trigger on Artifacts and Approvals tabs; tie into audit ledger.                                                      | Modal blocks sensitive view until justification submitted; reason stored in client audit log and surfaced as provenance chip; respects reduced motion preference.                     |
| **S7.1 Perf & A11y gates in CI**            | CI automation for Lighthouse, axe-core, and reduced-motion coverage.                                                 | Lighthouse ≥ 90 perf / 95 a11y on dashboard, pipelines, run routes; axe-core suite has zero violations; reduced motion toggle accessible via profile menu, persists in local storage. |

### 19.4 Technical Tasks & Integration Notes

- **T1 — Routing & URL state:** adopt React Router with shared query param sync utility so filters, node selections, and timeline brushes are deep-linkable.
- **T2 — Data layer:** configure React Query with mock service worker + SSE client to simulate streaming/backpressure for log viewer and widgets.
- **T3 — Tokenized theming:** solidify Tailwind theme tokens (light/dark/high-contrast) and ensure shadcn components consume theming via CSS variables.
- **T4 — shadcn registry setup:** register Card, Button, Input, Tabs, Tooltip, Dialog, and DataTable variants with accessibility defaults and focus-visible states.
- **T5 — Error & empty states components:** shared primitives for loading, empty, degraded, offline banners consistent with blueprint copywriting.
- **T6 — Telemetry hooks for Self-SLO widget:** instrument client events (route load, render durations, major interactions) and expose aggregates to forthcoming Self-SLO dashboard.

### 19.5 Definition of Done Reinforcement

- **Testing:** Vitest/RTL unit coverage for widgets, tables, modals; Playwright stories capturing keyboard-only flows and SSE log streaming behaviours.
- **Accessibility:** verify focus traps, aria-label coverage, skip links, and high-contrast tokens per route; document shortcuts in Command Palette reference.
- **Performance:** include route-level assertions (e.g., Lighthouse CI budgets, custom vitals logging) in CI gating pipeline.
- **Documentation:** update this blueprint and Storybook entries (idle/loading/error/empty) upon story completion; append telemetry schema to `/docs/observability` when hooks are added.
- **Operational readiness:** ensure audit logs, provenance chips, and justification flows write through the client-side ledger for eventual GraphQL persistence, and capture analytics events for runbooks/retro review.

---

**End v1**
