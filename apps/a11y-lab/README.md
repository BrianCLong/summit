# Accessibility Lab

A self-contained accessibility lab that wires Playwright and axe-core together to guard against critical violations, generates focus order maps, stress-tests UI with text scaling and RTL, and ships a runtime "A11y heatmap" overlay. It is designed to be framework-agnostic and to provide both automated and manual coverage.

## What ships here
- **Automated gates**: Playwright + axe-core runs with a **zero critical violation budget** and a **contrast budget** report. Keyboard trap detection is baked into the focus order walk.
- **Exploratory overlays**: Toggle a runtime A11y heatmap overlay script that paints issue density without collecting analytics or content.
- **Storybook a11y panel**: Shared `storybook/preview.ts` ready to drop into Storybook to enable the `@storybook/addon-a11y` panel by default.
- **Manual checklists**: Repeatable reviewer templates for screen reader sanity checks and DP-safe telemetry reviews.

## Quick start
1. Install dependencies from the repo root (workspace-aware):
   ```bash
   pnpm install
   ```
2. Set the target URL (defaults to `http://localhost:3000`):
   ```bash
   export A11Y_LAB_TARGET_URL="http://localhost:3000"
   ```
3. Run the suite:
   ```bash
   cd apps/a11y-lab
   pnpm test
   ```
4. Enforce the CI gate locally (fails on any critical axe violation):
   ```bash
   pnpm run ci:gate
   ```

## Tests included
- **axe-core sweep** (`tests/a11y.spec.ts`): captures violations, writes JSON artifacts, and fails on critical findings. Contrast violations are summarized as a budget to make regressions visible.
- **Focus order map** (`src/focus-order.ts`): tab-walks the page, tracks loops to detect keyboard traps, and saves the navigation trail.
- **Stress tests** (`tests/stress.spec.ts`): runs text scaling and RTL flips to shake out layout issues while reusing the axe assertions.
- **Heatmap overlay** (`src/heatmap-overlay.ts`): injects a toggle that colorizes elements by issue density; emits a standalone snippet via `heatmap:build`.

## Data protection
- No analytics or content collection are performed. Only axe metadata is persisted to `./artifacts` for CI triage.
- Telemetry guards: the CI gate script strips node identifiers and retains only rule IDs + selectors. See `scripts/ci-gate.mjs` for sanitization.

## Manual reviewer workflow
- Start from `checklists/manual-a11y-checklist.md` for SR and keyboard coverage.
- Use `checklists/dp-telemetry-guard.md` when wiring any observability around a11y signals to ensure we never capture user content.

## Storybook usage
Copy `storybook/preview.ts` into your Storybook config to turn on the a11y panel and to expose the heatmap toggle as a Storybook global.
