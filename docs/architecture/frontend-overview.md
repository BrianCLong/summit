# Frontend Overview (Architecture Reconnaissance)

## Executive Position

Summit's primary web frontend is a React + Vite application in `apps/web`. Angular usage is currently limited to evaluation fixtures, making React the authoritative frontend surface for architecture work today.

This architecture-lab pass therefore treats Angular work as an intentionally constrained exploration lane, not a production migration commitment.

## Stack & Runtime Anchors

- **UI Framework:** React 19 with React Router, Vite build pipeline, and Tailwind/MUI component foundations in the web app dependencies.
- **Data & State:** Apollo Client for GraphQL, Redux Toolkit for feature state slices, and Zustand for workspace/session state.
- **Visualization:** D3 and dedicated graph canvas components for graph rendering.

## Current Structure (Apps/Web)

### Route Map

The application route inventory in `apps/web/src/ROUTES.md` defines the current GA/role-scoped surfaces, including Workbench, Tri-Pane, GeoInt, and Mission Control routes.

### Component/System Topology

- `apps/web/src/features`: route-level and domain-oriented feature surfaces.
- `apps/web/src/components`: reusable UI primitives and shells.
- `apps/web/src/graphs`: high-impact graph rendering seam (`GraphCanvas`, `CanvasGraphRenderer`).
- `apps/web/src/store`: mixed global state strategy (Redux + Zustand).

### Feature & State Shape

- **Redux feature slices** for focus, history, explain, UI, and annotations live under `apps/web/src/features`, wired through the central store configuration.
- **Zustand workspace store** manages time-windowed entity/link data and telemetry hooks for graph/workbench workflows.

### Graph & Investigation Surfaces

- **Graph rendering** is handled by `GraphCanvas` and `CanvasGraphRenderer` in `apps/web/src/graphs`, establishing a dedicated graph visualization seam.

## Angular Status (Intentionally Constrained)

Angular references are present only as evaluation fixtures; the production web surface is React. Angular work should proceed as a governed exception until a dedicated Angular app is introduced.

If Angular parity exploration is required, enforce worktree isolation and produce compatibility notes only (no cross-framework production rewrites in a single PR).

## Reusable Seams & Skill Targets

### 1) Investigation View Shell

**Seam:** `/workbench`, `/analysis/tri-pane`, and `/analysis/narrative` routes share investigation affordances (filters, layout, graph views).

**Skill target:** Standard “Investigation View Shell” pattern with:
- shell layout
- toolbar/filters contract
- viewport + graph canvas slots

### 2) Graph View Pattern

**Seam:** `apps/web/src/graphs` establishes a dedicated rendering layer that can be standardized as a “Graph View” primitive.

**Skill target:** Graph canvas + interaction scaffold with deterministic performance hooks.

### 3) Telemetry & Evidence Hooks

**Seam:** Workspace store telemetry hooks for time-window changes and query latency provide a consistent instrumentation surface.

**Skill target:** Unified telemetry interceptors for investigation and graph workflows.

## Keep / Change / Extract (Critical Modules)

### Keep

- **Route inventory and GA classification** in `apps/web/src/ROUTES.md` as the authority source for UI readiness.
- **Graph rendering seam** in `apps/web/src/graphs` as the performance-critical visualization layer.

### Change

- **State surface cohesion:** consolidate Redux feature slices and Zustand store boundaries into explicit contracts to avoid cross-store coupling.
- **Route shell duplication:** normalize shared investigation shell behavior across tri-pane/workbench routes before adding new route-specific variants.

### Extract

- **Investigation Shell:** extract a shared shell component that fronts Workbench + Tri-Pane to reduce duplication.
- **Graph View primitive:** extract graph canvas + renderer into a stable component contract to enable reuse across routes.

## Recommendations (Immediate)

1. Publish a shared Investigation Shell component spec.
2. Formalize a Graph View primitive API with deterministic telemetry hooks.
3. Keep Angular work scoped to experiments until a dedicated Angular app is approved.

## Candidate Frontend Experiments (Worktree-Scoped)

### `arch/frontend-layout-investigation-shell-v2`

- **Objective:** unify header/filters/layout behavior across workbench and tri-pane.
- **Scope:** shell composition + tests only.
- **Success criteria:** reduced duplicated shell logic and unchanged route behavior snapshots.

### `arch/frontend-layout-graph-view-contract`

- **Objective:** define a stable API surface for graph rendering modes and telemetry.
- **Scope:** component contract docs + type-level interfaces.
- **Success criteria:** one documented contract used by at least two graph-consuming routes.

### `arch/frontend-layout-state-boundary-map`

- **Objective:** publish explicit ownership boundaries for Redux vs Zustand state.
- **Scope:** docs + non-behavioral typing helpers.
- **Success criteria:** no new cross-store coupling points introduced by follow-on PRs.
