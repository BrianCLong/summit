# Summit Frontend Architecture Overview (Architecture Lab)

## Readiness Gate

This architecture lab operates under the Summit Readiness Assertion and inherits its absolute readiness requirements. See `docs/SUMMIT_READINESS_ASSERTION.md` for governing readiness posture.

## Scope & Current State

The canonical frontend is implemented as a React + Vite application in `apps/web`. Angular workspace artifacts are not present in the repo at this time; Angular-specific implementation work is **Deferred pending an Angular surface introduction**. The lab documents the current React surface while defining migration seams that keep Angular parity achievable.

## Reconnaissance Evidence Snapshot

Architecture reconnaissance was constrained to source-of-truth files and structure scans:

- App and route composition: `apps/web/src/App.tsx`
- State topology: `apps/web/src/store/index.ts` + local feature stores
- Graph rendering: `apps/web/src/graphs/GraphCanvas.tsx`
- Workbench pattern: `apps/web/src/workbench/INVESTIGATOR_WORKBENCH_OVERVIEW.md`
- Data client seam: `apps/web/src/lib/apollo.ts`

## Frontend Map (Current)

| Area | Location | Purpose | Risk Profile |
| --- | --- | --- | --- |
| Application entry | `apps/web/src/main.tsx`, `apps/web/src/App.tsx` | Bootstraps React app, providers, and routing. | Medium (global blast radius) |
| Routing & shell | `apps/web/src/App.tsx`, `apps/web/src/components/Layout.tsx` | React Router routes and shared shell layout. | Medium |
| Feature domains | `apps/web/src/features/` | Feature-oriented slices (focus, history, explain, UI, etc.). | Low–Medium |
| Pages | `apps/web/src/pages/` | Route-level views and dashboards. | Medium |
| Workbench | `apps/web/src/workbench/` | Analyst shell and context/canvas/detail pattern. | High (core workflow) |
| Graph visualization | `apps/web/src/graphs/` | D3-based graph rendering and canvas fallback. | High (performance-critical) |
| State management | `apps/web/src/store/` and feature stores | Redux Toolkit + Zustand stores. | High (consistency risk) |
| Contexts & providers | `apps/web/src/contexts/` | Auth, socket, search, feature flags, resilience. | Medium |
| Data integration | `apps/web/src/lib/apollo.ts` | Apollo config, persisted queries, subscriptions. | High (data contract) |

## Routing, Composition, and Providers

`App.tsx` is the primary composition root. It controls provider ordering, route-level lazy boundaries, and shell ownership. This creates a clear seam for architecture experiments, but it also concentrates risk: provider order drift and route coupling can create hidden runtime regressions.

## State Management Topology

- **Redux Toolkit store**: Global reducers for focus, history, explain, UI, and annotations in `apps/web/src/store/index.ts`.
- **Zustand stores**: Workbench and feature stores (`workbench/store/viewStore.ts`, `features/snapshots/store.ts`, export/workspace stores).

This dual state system is the present architecture. It is an approved **Governed Exception** until state ownership boundaries are codified and tested via migration experiments.

## Reusable Pattern Seams (Skill Targets)

| Pattern | Current Source | Why It Is Stable | Skill Candidate |
| --- | --- | --- | --- |
| Investigation Workbench | `apps/web/src/workbench/*` | Mature context/canvas/detail workflow | `skill:investigation-view-pattern` |
| Graph View | `apps/web/src/graphs/*` | Has explicit performance threshold behavior | `skill:graph-view-pattern` |
| Route Shell | `apps/web/src/App.tsx` + `components/Layout.tsx` | Single composition root with deterministic route loading | `skill:frontend-shell-pattern` |
| Data Client | `apps/web/src/lib/apollo.ts` | Shared persisted query + auth + subscription path | `skill:apollo-contract-pattern` |

## Keep / Change / Extract (Critical Modules)

### Keep
- **Workbench shell architecture** for analyst continuity and extension discipline.
- **GraphCanvas threshold strategy** (SVG for smaller graphs, canvas renderer at scale).
- **Apollo split-link data transport contract** for consistent query/subscription behavior.

### Change
- **State ownership model**: define one authoritative state layer per concern (session, UI state, investigative view state).
- **Provider dependency declaration**: document provider ordering and add provider-contract tests.
- **Route contract typing**: enforce route metadata typing for guardrails around protected vs public shells.

### Extract
- **Graph primitives** into `packages/graph-view` (render API + interaction contract).
- **Workbench shell primitives** into a reusable package for multi-product reuse.
- **Provider composition factory** into a reusable app bootstrap contract.

## Architecture Experiments (Frontend, Proposal-Only)

1. **Experiment: Frontend Provider Contract Hardening**
   - **Branch/Worktree**: `arch/frontend-layout/provider-contract-hardening`
   - **Objective**: codify provider order as a typed contract and add a contract test.
   - **Scope**: `apps/web/src/App.tsx`, provider wrappers, tests only.
   - **Success Criteria**: provider-order regressions fail in CI with deterministic messaging.

2. **Experiment: Workbench Shell Extraction Spike**
   - **Branch/Worktree**: `arch/frontend-layout/workbench-shell-extract`
   - **Objective**: extract shell interfaces and boundary types into a package without behavior change.
   - **Scope**: workbench shell interfaces only; no UX change.
   - **Success Criteria**: zero route behavior drift and reduced import coupling.

3. **Experiment: Graph View Adapter Layer**
   - **Branch/Worktree**: `arch/frontend-layout/graph-view-adapter`
   - **Objective**: isolate graph rendering interface from D3 runtime details.
   - **Scope**: `apps/web/src/graphs/*` abstraction layer only.
   - **Success Criteria**: existing graph behaviors retained with adapter-based integration test.

## Angular Migration Seam (Deferred)

Angular standalone-component and feature-module mapping is **Deferred pending Angular workspace introduction**. Once an Angular surface exists, the lab will enforce parity mapping across shell, graph, and investigation patterns before any migration milestone is promoted.
