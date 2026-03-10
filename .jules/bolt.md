## YYYY-MM-DD - [Optimize lists in HomePage]
**Learning:** The `HomePage` component rendered several lists (Quick Actions, Recent Investigations, Recent Alerts, Active Cases) with inline handlers inside the map method, causing new closures to be created for every item on every render, preventing pure component optimizations from being effective.
**Action:** Extract list items to components wrapped in `React.memo` and use `useCallback` on the handlers at the parent level before passing them to the child items.

## 2025-03-09 - [Fix rollback metrics consistency]
**Learning:** `auto-rollback-monitor` and `safeMutationsMetrics` used a non-existent metric `rollbackEventsTotal`. The codebase's standard metric for deployment rollbacks is `deploymentRollbacksTotal`. Using the wrong metric name causes failures in metrics collection and reporting.
**Action:** Always verify the correct metric name exists in `server/src/monitoring/metrics.ts` before using it in monitors. Search for similar metrics if the exact name isn't found. Also ensure to update the observability re-exports in `server/src/observability/metrics.ts` when a metric needs to be exported.
