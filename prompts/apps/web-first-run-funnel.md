# Summit apps/web UX: Navigation, IA, and First-Run Completion Funnel

Objective: Turn the improved empty-state experience into a coherent first-run funnel that
gets a new user from fresh install to meaningful signal with minimal friction, while raising
baseline UX quality (a11y, consistency, error resilience) without introducing new libraries.

## Phase 1 — Map the real user funnel (repo-first, measurable)

1. Define the first-run completion funnel milestones (3–5) with entry point, inputs,
   success criteria, and failure states.
2. Add privacy-safe event hooks for funnel instrumentation using existing telemetry
   patterns or a minimal in-repo logger.

## Phase 2 — Information Architecture + Navigation consistency

3. Audit navigation and ensure funnel routes are discoverable. Add a getting started entry
   point via nav item, home callout, or settings section.
4. Create a setup/getting started page that lists milestones with status and a primary CTA.

## Phase 3 — Error/Loading/Empty states: standardize and harden

5. Standardize loading/error/empty triplets with consistent copy, retry behavior, action
   placement, and a11y semantics. Apply to at least two funnel pages beyond Home.
6. Add route-level resilience for dead routes with guarded rendering and safety links.

## Quality gates

7. Add unit tests for setup checklist rendering/navigation, triplet state behavior, and
   telemetry events. Add a funnel entry smoke E2E if Playwright/Cypress is present.
8. Avoid tooling churn; no new UI libraries.
