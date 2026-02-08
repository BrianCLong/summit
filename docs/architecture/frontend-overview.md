# Summit Frontend Architecture Overview (Architecture Lab)

## Readiness Gate

This architecture lab operates under the Summit Readiness Assertion and inherits its absolute readiness requirements. See `docs/SUMMIT_READINESS_ASSERTION.md` for governing readiness posture.

## Scope & Current State

The canonical frontend is implemented as a React + Vite application in `apps/web`. Angular workspace artifacts are not present in the repo at this time; Angular-specific architecture work is **Deferred pending an Angular surface introduction**. The lab therefore documents the current React surface and defines an Angular migration seam as a governed future action.

## Frontend Map (Current)

| Area | Location | Purpose |
| --- | --- | --- |
| Application entry | `apps/web/src/main.tsx`, `apps/web/src/App.tsx` | Bootstraps React app, providers, and routing. |
| Routing & shell | `apps/web/src/App.tsx`, `apps/web/src/components/Layout.tsx` | React Router routes and shared shell layout. |
| Feature domains | `apps/web/src/features/` | Feature-oriented slices (focus, history, explain, UI, etc.). |
| Pages | `apps/web/src/pages/` | Route-level views and dashboards. |
| Workbench | `apps/web/src/workbench/` | Analyst workbench shell and layout pattern. |
| Graph visualization | `apps/web/src/graphs/` | D3-based graph rendering and canvas fallback. |
| State management | `apps/web/src/store/` and feature stores | Redux Toolkit store + Zustand stores. |
| Contexts & providers | `apps/web/src/contexts/` | Auth, socket, search, feature flags, resilience. |
| Data integration | `apps/web/src/lib/apollo.ts` | Apollo client config, persisted queries, WS subscriptions. |

## Routing, Composition, and Providers

`App.tsx` wires routing, lazy-loaded pages, and core providers (Apollo, auth, feature flags, search, sockets). It also establishes error boundaries and route-level shells for the workbench and dashboards, giving the lab a single integration seam for layout-level experiments and UX instrumentation.

## State Management Topology

- **Redux Toolkit store**: Global reducers for focus, history, explain, UI, and annotations in `apps/web/src/store/index.ts`.
- **Zustand stores**: Workbench and feature-specific stores such as `workbench/store/viewStore.ts`, `features/snapshots/store.ts`, and export/workspace stores.

This dual system is a deliberate present-state fact. Any consolidation is a future experiment and must be tracked as a governed exception or formalized as a migration plan.

## Graph & Investigation Patterns

- **Graph view pattern**: `GraphCanvas` renders D3 force layouts with a canvas fallback at scale, with `CanvasGraphRenderer` handling larger graphs.
- **Investigation workbench pattern**: The “Context–Canvas–Detail” layout is formalized in `apps/web/src/workbench/INVESTIGATOR_WORKBENCH_OVERVIEW.md` and implemented via `WorkbenchShell`.

These patterns are the primary candidates for reusable skills and architecture templates.

## Reusable Skill Seams (Angular/Standalone-Compatible)

| Pattern | Current Source | Skill Target |
| --- | --- | --- |
| Investigation Workbench | `apps/web/src/workbench/*` | “Investigation View” scaffold (context/canvas/detail) usable in Angular or React. |
| Graph View | `apps/web/src/graphs/*` | “Graph Canvas” template with performance threshold and D3 bindings. |
| Route Shell | `apps/web/src/App.tsx` + `components/Layout.tsx` | “Shell + Router” template with error boundaries and providers. |
| Data Client | `apps/web/src/lib/apollo.ts` | “Apollo + Subscriptions” integration template. |

## Keep / Change / Extract (Critical Modules)

### Keep
- **Workbench shell pattern** for consistent analyst UX across investigations.
- **Graph canvas performance threshold** (canvas fallback) as the default for large graphs.
- **Apollo persisted queries + WS split link** for consistent data fetch/subscribe behavior.

### Change
- **State management unification**: consolidate Redux + Zustand into a single, policy-governed topology (proposal required).
- **Provider orchestration**: formalize provider ordering into a documented dependency graph.

### Extract
- **Graph visualization** into a shared `packages/graph-view` library with strict API contracts.
- **Workbench shell** into a reusable layout package for cross-product reuse.

## Angular Migration Seam (Deferred)

Angular/standalone component architecture is **Deferred pending Angular workspace introduction**. When introduced, the lab will map standalone components and feature modules against the existing Workbench and Graph View patterns, and will enforce parity between Angular and React shells.
