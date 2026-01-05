# Item 001 — Symphony observability timestamps & rates clarified

- Project: https://github.com/users/BrianCLong/projects/19
- Status: In progress (implemented in this PR)
- Target surface: Symphony Observability + Budgets header clocks (ui/index.html, ui/src)

## Problem statement

Observability and header areas were rendering timestamps with implicit local time and ad-hoc number strings. This made it unclear when updates occurred and prevented consistent UTC or percentage formatting across the dashboard.

## Acceptance criteria

- Observability log timestamps render in UTC with clear timezone text and provide an accompanying relative label or tooltip for accessibility.
- Header clock uses the centralized formatter and clarifies timezone.
- KPI numbers (RPS, latency, queue depth, error count) use a shared number formatter with explicit units.
- Budget reset labels show the UTC reset time and use formatted currency/percent helpers.
- Formatting helpers are centralized and covered by unit tests.

## Notes / verification

- Helpers added under `ui/utils/formatting.js` with Jest coverage in `tests/ui/formatting.test.ts`.
- UI updated in `ui/index.html` and `ui/src` to consume the helpers; relative times use tooltips for absolute timestamps.
