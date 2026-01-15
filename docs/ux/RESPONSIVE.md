# Responsive Contract

This contract defines the baseline responsive behaviors for Summit UI surfaces so small and medium viewports stay usable without redesigns.

## Supported breakpoints

- **Desktop:** ≥ 1024px – multi-column layouts and full navigation chrome.
- **Tablet:** 768–1023px – reduce padding, allow single-column content when necessary.
- **Mobile:** ≤ 767px – single-column stacking with touch-friendly hit targets (≥44px effective height).

## Navigation

- Primary navigation must collapse into a drawer or stacked list on mobile; avoid horizontal menus.
- Keep a visible page title/breadcrumb on small screens; do not hide route context.
- Avoid trap scroll: overlays and drawers must be dismissible and restore scroll position.

## Tables and lists

- Prefer `grid-template-columns: repeat(auto-fit, minmax(<min>, 1fr))` for cards.
- For data tables:
  - Wrap tables in an overflow container for horizontal scroll on medium screens.
  - On mobile, hide table headers and surface `data-label` text on each cell for stacked cards.
  - Keep status/CTA cells visually distinct and large enough to tap.

## Forms, modals, and touch targets

- Inputs and buttons should provide at least 12px vertical padding and 16px horizontal padding.
- Avoid fixed-height modals; use `max-height: 80vh` with internal scroll regions.
- Ensure focus outlines remain visible after layout changes; avoid removing default focus styles.

## Layout and spacing

- Default page padding: 24px on desktop, 16px on mobile.
- Use `gap` for flex/grid spacing instead of margin stacking to prevent overflow in wraps.
- Prevent horizontal scroll by constraining wide content inside responsive wrappers.
