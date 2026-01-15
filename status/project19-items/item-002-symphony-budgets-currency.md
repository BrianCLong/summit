# Item 002 — Symphony budgets currency/percent normalization

- Project: https://github.com/users/BrianCLong/projects/19
- Status: Backlog
- Target surface: Symphony budgets/burndown cards (ui/index.html, ui/src/components)

## Problem statement

Daily and per-minute budget displays mix raw numbers with hard-coded strings, leading to inconsistent currency precision and percent math when more providers are added.

## Acceptance criteria

- All budget rows use `formatCurrency` for spend/limit and `formatPercent` for usage, sharing the same values for progress bar widths.
- Budget data pulls from a single source (API or fixture) instead of inlined literals.
- Reset countdowns display UTC times with tooltips for absolute timestamps.
- Unit tests validate currency/percent formatting for at least two providers.
