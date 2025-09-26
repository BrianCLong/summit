# Summit Frontend Accessibility Audit — Dashboards & Query Interfaces

## Scope
- Client dashboard experience at `/dashboard`, focusing on stats panels, live activity feed, latency and error insights, and observability quick links.
- Advanced entity search interface surfaced on the home route (`Advanced Search` tab).

## Baseline Issues Identified
- Live activity feed toggle relied on a non-semantic container and lacked an accessible name, so keyboard and assistive technology users could not expand recent activity or perceive unread counts.
- Dashboard charts and data grids did not expose programmatic descriptions, leaving screen reader users without context for latency trends or high-error operations.
- Advanced search relied on placeholder text for labeling, rendered focusable results as `<div>` elements, and exposed filter overlays without structured roles, preventing reliable keyboard operation.
- Supporting styles produced low-contrast text (`#666` on white) and removed visible focus indicators, hindering WCAG 2.1 AA compliance.

## Remediation Summary
- Promoted dashboard sections to semantic regions with headings, live regions, and visually hidden descriptions. The live activity feed now uses a keyboard-focusable toggle (`ButtonBase`) with ARIA state, high-contrast focus outlines, and assistive text for unread counts.
- Enriched charts and tables with accessible labels, figure captions, and summaries (`components/dashboard/LatencyPanels.tsx`, `ErrorPanels.tsx`, `StatsOverview.tsx`, `GrafanaLinkCard.tsx`). Added descriptive text for observability links and ensured external links announce new-tab behavior.
- Rebuilt the advanced search interaction as a structured `<section>` with SR-friendly labels, focus-managed dialogs, listbox semantics, and high-contrast theming defined in `styles/globals.css` and `components/AdvancedSearch.tsx`.
- Introduced Playwright + axe-core regression coverage in `tests/e2e/dashboard-query-accessibility.spec.ts` to validate WCAG 2.1 A/AA rules for both the dashboard and advanced search experiences.

## Axe-core Audit Results
| Area | Axe Command | Violations |
| --- | --- | --- |
| Dashboard (`/dashboard`) | `AxeBuilder(...).include('[data-testid="dashboard-main"]').withTags(['wcag2a','wcag2aa'])` | 0 |
| Advanced Search (`/`) | `AxeBuilder(...).include('[data-testid="advanced-search"]').withTags(['wcag2a','wcag2aa'])` | 0 |

## Follow-up Recommendations
- Integrate live data summaries for additional dashboard widgets (e.g., system observability embeds) once real APIs are wired, maintaining the same ARIA patterns.
- Evaluate additional query interfaces (graph exploration, investigations) for similar keyboard and ARIA refinements.
- Automate accessibility linting in CI to surface regressions earlier than E2E runs.
