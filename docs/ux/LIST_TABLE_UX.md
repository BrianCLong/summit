# List & Table UX Contract

This contract applies to all list and table experiences across Summit. It defines the baseline behaviors and performance guardrails expected for Project #19 work.

## Pagination

- Default page size: 20 rows with options for 10/20/50 when pagination controls are shown.
- Client must clamp page indices to `[0, totalPages - 1]` whenever filters or total counts change.
- Visible affordances for first/previous/next/last transitions; disabled states must be keyboard focusable but inert.
- Server-driven lists must forward `page`, `pageSize`, `sortBy`, and `sortDirection` parameters; client-side fallbacks should not break when server ignores them.

## Sorting

- Single-column sorting with a clear indicator (aria-sort + icon/text) and deterministic default (`createdAt` desc when available).
- Repeated activation toggles between ascending and descending; clicking a different column resets to descending for that column.
- Sort state must be preserved across pagination and filtering.

## Loading, Empty, and Error States

- Loading: skeleton rows that preserve table height; mark the table region as `aria-busy`.
- Empty: concise message plus next-step guidance (e.g., adjust filters or clear search).
- Error: actionable message with a retry control that re-runs the current request using the existing filters and sort state.

## Accessibility

- Table headers use `scope="col"` and announce sort direction.
- Rows or row-activation controls are keyboard focusable; <kbd>Enter</kbd>/<kbd>Space</kbd> triggers selection.
- Focus outlines remain visible on all interactive elements; ensure color contrast >= 4.5:1 for text and controls.

## Performance Guardrails

- Avoid re-render storms by memoizing derived rows and stabilizing callbacks passed into row components.
- Only enable virtualization for datasets expected to exceed ~200 visible rows or when frame drops are observed; otherwise prefer lightweight pagination.
- Avoid loading spinners that shift layout; prefer reserved-height placeholders.
- Export/download features should stream or lazily generate payloads to prevent blocking the main thread.

## Standardized Telemetry

- Emit timing metrics around fetch/transform steps for large lists (when available) and log pagination/sort changes for UX analysis.
- Capture errors with filter/sort context for faster triage.

## Current Table/List Queue (top 5)

1. Approvals review table — approvals queue with filters/pagination in `ga-graphai/packages/web/src/components/approvals/ApprovalsPage.tsx` and `ApprovalsTable.tsx` (Project #19 priority).
2. Recent provenance table — coverage panel in `ga-graphai/packages/web/src/components/graph/LineageDashboard.tsx` needs bounded pagination and empty/error handling.
3. CAB simulator access matrix — static runbook table in `ui/cab-simulator.html` requires keyboard focus, loading/error affordances, and density controls for long lists.
4. Approval timeline list — timeline event renderer in `ga-graphai/packages/web/src/components/timeline/ApprovalTimelineEvent.tsx` needs focusable interactions and empty state guidance.
5. Investigation tri-pane evidence lists — selection/history lists in `ga-graphai/packages/web/src/tri-pane.ts` should add pagination/sorting guardrails when surfaced in UI clients.
