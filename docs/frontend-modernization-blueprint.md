# Frontend Foundation Modernization Blueprint

## Purpose

This document aligns nine modernization epics into a single delivery blueprint that standardizes the frontend stack, design system, navigation, performance, accessibility, correctness, forms, observability, and migration discipline. It is intended to serve as the authoritative plan for implementation and rollout.

## Target Stack and Tooling (Epic 1)

- **Framework & Bundler:** React 18 with Vite (ESM), PNPM workspaces, Turbo for orchestration.
- **Router:** React Router 7 with data APIs for loader/action semantics and suspense-friendly route splits.
- **State:** React Query for server state, Zustand for client/UI state, URL-first routing state where applicable.
- **Styling & Design Tokens:** MUI 6 with custom token layer (via CSS variables) exposed through a design-system package.
- **Testing:** Vitest + Testing Library for unit/component, Playwright for e2e smoke and deploy-verification, Lighthouse/PSI budgets in CI.
- **Type Safety:** TypeScript `strict` with `noImplicitAny`; `@typescript-eslint/no-explicit-any` enforced with time-bound suppressions via `// eslint-disable-next-line ...` and `@deprecated` tags that expire.
- **Build Quality Gates:** CI pipeline stages: lint → typecheck → unit → e2e smoke → bundle size/perf budgets → accessibility scan (axe/lighthouse) → image diff (if UI changes).

## Golden App Template (Epic 1)

- **Repo Layout:** `/apps/web` entry app consuming `/packages/design-system`, `/packages/auth-session`, `/packages/api-client`, `/packages/feature-flags`, `/packages/logging`, `/packages/state-kit`.
- **Scaffolding:** Plop or Turbo generator to instantiate new route features with wiring for loading skeletons, error boundaries, feature flags, and telemetry.
- **Auth/Session Module:** Central `@intelgraph/auth-session` package providing OIDC/OAuth client, token refresh, session heartbeats, tenant scoping, and SSR-safe cookie handling.
- **API Client:** `@intelgraph/api-client` wraps `fetch` with retries (expo backoff + jitter), idempotency keys, error taxonomy (auth/validation/network/dependency/unknown), structured errors, and request/response logging hooks.
- **Feature Flags:** `@intelgraph/feature-flags` with owner/expiry metadata, kill switch API, and dev-mode mock provider. Flags enforce governance: every flag requires owner, expiry, and rollout plan.
- **Logging/Telemetry:** `@intelgraph/logging` wraps OpenTelemetry to emit traces/metrics with correlation IDs propagated from headers, plus client error reporter with release/user/tenant scope.
- **State Management Kit:** React Query setup with cache hydration, optimistic update helpers with rollback, invariant checks, and stale/sync indicators.
- **Performance Guardrails:** Route-level lazy loading, code splitting, image optimizer helpers, and a bundle analyzer script stored in CI artifacts.

## Design System and UI Consistency (Epic 2)

- **Token Model:** Core scales for spacing, typography, color, radii, shadow, motion; light/dark/brand themes via CSS variables and runtime switcher.
- **Component Library:** Buttons, inputs, selects, text areas, checkbox/radio, data table, modal/drawer, toast, navbar, page shell, grid/panel primitives; all a11y-first (ARIA, focus ring, keyboard traps avoided, reduced motion respect).
- **Docs & Governance:** Storybook with “do/don’t” guidance, usage lint rules to ban legacy components, icon set standardized via a single SVG sprite/package.
- **Accessibility Defaults:** High-contrast focus states, descriptive aria labels, validation messaging, and async state announcements.

## Navigation & IA Consolidation (Epic 3)

- **Canonical Object Model:** Shared vocabulary for entities surfaced in routes, breadcrumbs, and search.
- **Unified Shell:** Top-level layout with global search/command palette, consistent breadcrumbs, contextual help entry points, and settings hierarchy.
- **Routing Strategy:** Strangler approach—new routes live in the unified shell; legacy routes redirected with telemetry until removed. Dead/duplicate pages pruned with feature flag kill switches for fast rollback.

## Performance & Bundle Discipline (Epic 4)

- **RUM:** p75/p95 metrics captured via web vitals and sent to telemetry with release tags.
- **Budgets:** CI enforces JS/CSS budgets per route and blocks regressions; bundle analyzer reports top offenders.
- **Optimizations:** Route/code splitting, virtualized lists for heavy tables, API field selection defaults, compression, and HTTP caching (ETag/conditional requests).
- **Image Pipeline:** Responsive sizes, modern formats (WebP/AVIF), lazy loading helpers.

## Accessibility & Compliance (Epic 5)

- **Standard:** WCAG 2.2 AA target with checklist embedded in Storybook and CI axe scans.
- **Keyboard-First:** Focus management utilities for modals/drawers/menus; skip links and consistent tab order.
- **Forms & Tables:** Accessible labels, summaries, row action semantics, and live regions for async states.
- **Governance:** Dedicated accessibility bug template, triage lane, and quarterly audits.

## State Management & Correctness (Epic 6)

- **Source Inventory:** URL, server cache, local storage, feature flags documented per route.
- **Patterns:** React Query for server state with invalidation policies; optimistic mutations with rollback; idempotent UI actions; undo for destructive actions where feasible.
- **Resilience:** Unified error boundaries (page + component), loading skeletons/empty states from design system, client-side invariant checks, and regression tests for top correctness bugs.

## Forms, Validation, and Configuration (Epic 7)

- **Library Choice:** React Hook Form + Zod schemas; inline validation with actionable messages and safe defaults.
- **Experience:** Guided wizards for multi-step setups with resume, dry-run/test actions for risky settings, permission-aware controls with “why” messaging.
- **Governance:** Config diff/history for admins, bulk edit for common tasks, and instrumentation for abandonment/error hotspots.

## Observability & Incident Readiness (Epic 8)

- **Correlation IDs:** Propagate UI → API → logs; surface IDs in user-facing errors.
- **Error Taxonomy:** Network/auth/validation/dependency/unknown with telemetry and user-safe toasts.
- **SLOs & Alerts:** Frontend error rate and p95 load SLOs with alerting; deploy verification smoke tests; feature flag kill switches for risky UI features.
- **Diagnostics:** Redacted client-side diagnostics export to speed support.

## Migration Factory and Decommissioning (Epic 9)

- **Checklist:** Parity, analytics, accessibility, perf, rollback readiness per screen.
- **Codemods:** Import/routing/component swap codemods and deprecation warnings for legacy components/routes.
- **Testing:** Snapshot/visual regression for migrated screens; no-new-legacy lint rules.
- **Execution:** Migrate the two highest-traffic surfaces first to prove path; follow with top 10 support-heavy screens; publish monthly deletion releases and remove old build configs after cutover.

## Phased Delivery Plan

1. **Foundation (Weeks 1–3):** Finalize stack choices, enable strict TS config, set up golden template packages, CI gates, and perf/a11y budgets.
2. **Design System & Navigation (Weeks 3–6):** Ship token system, core components, unified shell, and feature flag governance; migrate two top-traffic surfaces into template.
3. **Performance & Observability (Weeks 5–8):** RUM, bundle analyzer, route-level splits, logging/telemetry wrapper, and deploy-verification smoke tests.
4. **Forms & Correctness (Weeks 6–9):** Standardize forms/validation, optimistic patterns, undo flows, and correctness regression tests.
5. **Migration Factory (Weeks 8–12):** Codemods, deprecation warnings, “no new legacy” linting, monthly deletion releases, and removal of old build scripts for migrated surfaces.

## Forward-Looking Enhancements

- **Predictive Performance Guardrails:** Train a lightweight model on bundle metadata + route usage to flag risky PRs before CI.
- **Design Token Telemetry:** Instrument token usage to identify divergence and drive automatic lint autofixes.
- **Offline-Tolerant Client:** Introduce optional background sync for critical mutations with conflict resolution for field-level merges.
