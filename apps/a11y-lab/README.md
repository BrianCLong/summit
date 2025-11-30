# A11y Lab

A self-contained accessibility lab that ships automated axe-core gates, keyboard trap detection, focus order export, contrast budgeting, and screen reader helpers. The lab disables analytics by default and applies data privacy (DP) guards to every telemetry touchpoint.

## Features

- **axe-core gate**: CLI (`pnpm --filter @summit/a11y-lab run check:axe`) or in-app trigger that fails on critical violations.
- **Keyboard trap detector**: watches Tab sequences and emits live alerts before a user becomes trapped.
- **Contrast budgeter**: calculates WCAG ratios and flags violations of AA/AAA budgets.
- **Screen-reader scripts**: skip links, live region announcer, and focus-order narrator for manual reviews.
- **Focus order map**: deterministic export of tab order; also available via `pnpm --filter @summit/a11y-lab run check:focus-map`.
- **Storybook a11y panel**: built with `@storybook/addon-a11y` to keep components auditable.
- **Playwright + axe integration**: see `tests/a11y.spec.ts` for focus-map, RTL, and text-scale stress tests.
- **A11y heatmap overlay**: runtime toggle to highlight interactive targets and tab order.
- **Privacy guardrails**: telemetry guard blocks analytics and strips user content; `scripts/telemetry-guard.sh` is enforced in CI.

## Getting started

```bash
pnpm install
pnpm --filter @summit/a11y-lab dev
```

### Quality gates

- Run automated axe: `pnpm --filter @summit/a11y-lab run check:axe`
- Export focus order: `pnpm --filter @summit/a11y-lab run check:focus-map`
- Playwright a11y suite: `pnpm --filter @summit/a11y-lab test:e2e`
- Storybook with a11y panel: `pnpm --filter @summit/a11y-lab storybook`

### Privacy and telemetry

Analytics is disabled unless `A11Y_LAB_ALLOW_ANALYTICS=true` is explicitly set. The telemetry guard removes content-bearing fields before any payload is emitted and the shell guard blocks CI if analytics is enabled.

### Manual checklist

Use the GitHub issue template `a11y-lab-manual-checklist.md` to record manual sweeps (SR output, logical focus order, content review). Pair manual reviews with Playwright reports for full coverage.
