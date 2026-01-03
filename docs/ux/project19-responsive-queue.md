# Project #19 Responsive Queue

Backlog anchor: https://github.com/users/BrianCLong/projects/19

## Queue (next 5)

1. [RD-1: Retention dashboard table + KPI grid mobile hardening](#rd-1-retention-dashboard-table--kpi-grid-mobile-hardening)
2. [RD-2: Retention dashboard error recovery controls mobile spacing](#rd-2-retention-dashboard-error-recovery-controls-mobile-spacing)
3. [SFM-1: SFM fairness metrics table + alert list responsive layout](#sfm-1-sfm-fairness-metrics-table--alert-list-responsive-layout)
4. [SFM-2: SFM snapshot/replay forms mobile ergonomics](#sfm-2-sfm-snapshotreplay-forms-mobile-ergonomics)
5. [THEME-1: Theme settings panel small-screen usability](#theme-1-theme-settings-panel-small-screen-usability)

---

### RD-1: Retention dashboard table + KPI grid mobile hardening

- **Project #19 link:** https://github.com/users/BrianCLong/projects/19
- **Target surfaces:** `web/retention-dashboard/app/page.tsx` (Upcoming Expirations table, KPI cards)
- **Problem:** Table overflows on ≤768px and KPI cards compress headers, forcing horizontal scroll and clipped badges.
- **Plan:** Wrap table in scrollable region, add stacked card layout at ≤640px with `data-label` support, soften grid spacing for badges.
- **Status:** In-progress in this PR.

### RD-2: Retention dashboard error recovery controls mobile spacing

- **Project #19 link:** https://github.com/users/BrianCLong/projects/19
- **Target surfaces:** `web/retention-dashboard/app/error.tsx`
- **Problem:** CTA pair sits in a single row with minimal padding; buttons fall below 44px tap height on phones.
- **Plan:** Stack CTAs on ≤480px, raise padding, and ensure focus ring visibility with consistent contrast.
- **Status:** Backlog.

### SFM-1: SFM fairness metrics table + alert list responsive layout

- **Project #19 link:** https://github.com/users/BrianCLong/projects/19
- **Target surfaces:** `web/sfm-dashboard/src/App.tsx`, `web/sfm-dashboard/src/styles.css`
- **Problem:** Metrics table spans 6 columns with no wrapping/scroll container; alert headers truncate on tablets.
- **Plan:** Add overflow wrapper with min/max widths, mobile stacked presentation with header labels, and tighter grid gaps for badges.
- **Status:** Backlog.

### SFM-2: SFM snapshot/replay forms mobile ergonomics

- **Project #19 link:** https://github.com/users/BrianCLong/projects/19
- **Target surfaces:** `web/sfm-dashboard/src/App.tsx`
- **Problem:** Form labels/inputs share rows causing cramped layout; primary/secondary buttons sit side-by-side and exceed viewport width on small screens.
- **Plan:** Convert forms to single-column stacking, widen inputs to 100%, and ensure buttons wrap with ≥12px vertical padding.
- **Status:** Backlog.

### THEME-1: Theme settings panel small-screen usability

- **Project #19 link:** https://github.com/users/BrianCLong/projects/19
- **Target surfaces:** `web/src/components/settings/ThemeSettings.tsx`
- **Problem:** Radio group and theme cards lack mobile padding and run edge-to-edge; reset button falls below recommended touch height.
- **Plan:** Introduce responsive `Stack`/`Box` spacing, full-width button styles on ≤640px, and increased control padding.
- **Status:** Backlog.
