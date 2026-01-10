# Item 005 — Docs/Runbooks tiles formatting cleanup

- Project: https://github.com/users/BrianCLong/projects/19
- Status: Backlog
- Target surface: Docs & Runbooks tab tiles/metadata

## Problem statement

Document tiles and runbook references do not show timestamps or use consistent casing; numeric metadata (version numbers, counts) are displayed raw, hurting scanability across locales.

## Acceptance criteria

- Add optional `last_updated` metadata displayed via `formatAbsoluteTime` with UTC suffix and tooltip.
- Normalize numeric badges (versions, counts) with `formatNumber` and consistent label casing/punctuation.
- Ensure tooltips/aria labels announce absolute timestamps when relative time is used.
- Add render test covering a tile with both numeric and timestamp metadata.
