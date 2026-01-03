# Formatting Contract (UI surfaces)

## Time and Date

- **Timezone:** Display all timestamps in UTC with explicit `UTC` suffix.
- **Absolute baseline:** Primary display uses `YYYY-MM-DD HH:MM(:SS) UTC`; drop the date only for short-lived clocks while keeping the timezone suffix.
- **Relative time:** Use relative phrasing (e.g., `5 minutes ago`) only when paired with an accessible absolute value (tooltip or `aria-label`).
- **Countdowns:** Show reset times as absolute UTC; pair timers with their target time.

## Numbers and Currency

- **Numbers:** Use grouped thousands and a maximum of one decimal place unless the metric requires more precision.
- **Latency/Rates:** Append units (`ms`, `rpm`, `requests/sec`) explicitly; keep whole milliseconds for p-values.
- **Currency:** Use ISO currency (default `USD`) with two decimals and locale grouping.
- **Percentages:** Use `formatPercent` for percentage strings and reuse the same value for progress widths.

## Centralization

- Use `ui/utils/formatting.js` helpers for all date/time, number, currency, and percentage formatting on Symphony UI surfaces.
- When adding new surfaces, add helper coverage and tests (`tests/ui/formatting.test.ts`) before using ad-hoc formatting.

## Accessibility & Layout

- Provide tooltips or `aria-label`s for timestamps that display relative time.
- Verify no truncation/overflow when longer timezones or grouped numbers appear.
