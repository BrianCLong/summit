# Prompt: apps/web empty-state guidance hardening

## Objective

Ship an improved first-run/empty-state UX in `apps/web` with hardened
`EmptyState` quick actions, verified routes, and focused tests.

## Scope

- `apps/web/src/components/ui/EmptyState.tsx`
- `apps/web/src/pages/*` (Home, Alerts, Cases, new case entry)
- `apps/web/src/pages/**/__tests__/*`
- `apps/web/docs/empty-state-audit.md`
- `docs/roadmap/STATUS.json`

## Constraints

- Keep changes in the `apps/web` zone.
- No new UI libraries or placeholders.
- Quick actions require stable keys and accessible labels.
- Add/extend unit tests for touched components and pages.

## Deliverables

- Updated `EmptyState` supporting quick actions with keyboard navigation.
- Empty-state quick actions on HomePage + at least two additional pages.
- Route integrity verified (add minimal route if missing).
- Empty-state audit note in markdown.
- Evidence tests for components and pages.
