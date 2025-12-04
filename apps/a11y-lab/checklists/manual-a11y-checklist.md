# Manual A11y Checklist

Use this checklist when validating releases manually. It focuses on screen reader ergonomics, keyboard support, and regression guardrails.

## Screen reader sanity
- [ ] All interactive elements expose an accessible name (narrate with NVDA/VoiceOver).
- [ ] Live regions announce async state changes (verify with `window.a11yLabAnnounce`).
- [ ] Dialogs trap focus and restore focus to the trigger on close.
- [ ] Form errors announce when invalid input is submitted.

## Keyboard support
- [ ] Tabbing order follows the visual order; no unexpected jumps.
- [ ] No keyboard traps after 3 full Tab cycles (use `artifacts/focus-order.json`).
- [ ] Skip-links or landmark navigation works with Alt+Arrow or rotor equivalents.
- [ ] Focus outlines remain visible under high contrast mode.

## Visual/contrast checks
- [ ] Minimum contrast ratios respected (4.5:1 for normal text, 3:1 for large text).
- [ ] Text scaling to 125% and 150% maintains layout without clipping.
- [ ] RTL mode preserves component affordances and iconography direction.

## Observability and data protection
- [ ] No analytics trackers load on content pages during a11y runs.
- [ ] Telemetry events, if any, omit raw user content and PII.
- [ ] Axe artifacts contain selectors only (no innerText or HTML).

## Sign-off
- [ ] Automated suite executed (`pnpm test`) and CI gate (`pnpm run ci:gate`) green.
- [ ] Heatmap overlay reviewed on critical flows with the latest axe results.
