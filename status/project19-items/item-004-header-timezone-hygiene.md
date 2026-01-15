# Item 004 — Header/system badges timezone hygiene

- Project: https://github.com/users/BrianCLong/projects/19
- Status: Backlog
- Target surface: Symphony header badges and status indicators

## Problem statement

Environment, LOA, and kill switch badges lack any timestamp context. The system clock previously displayed local time without an explicit timezone, creating ambiguity for operators handing off across regions.

## Acceptance criteria

- Header clock shows `HH:MM[:SS] UTC` with a tooltip containing the full absolute timestamp.
- If health polling is paused or delayed, show a relative lag label using `formatRelativeTime`.
- Badge values remain readable with grouped numbers if counts are added (reuse `formatNumber`).
- Add a regression test ensuring the clock formatter renders UTC and the aria-label contains the absolute time.
