# Project #19 Network Robustness Queue (Top 5)

1. **Maestro run viewer offline resilience** — [Issue file](../../../project_management/issues/project19-network-001-run-viewer-offline.md)
   - Surface offline state, pause polling, safe retry and reconnect refresh for `RunViewer.tsx`.
2. **Conductor Studio server list resiliency** — [Issue file](../../../project_management/issues/project19-network-002-conductor-server-resilience.md)
   - Add offline-aware polling and guarded manual refresh for MCP server list.
3. **Approvals page offline/write safety** — [Issue file](../../../project_management/issues/project19-network-003-approvals-safe-retry.md)
   - Gate approve/reject actions offline, disable during submission, explicit retry.
4. **Plugin marketplace offline/retry UX** — [Issue file](../../../project_management/issues/project19-network-004-marketplace-retry.md)
   - Offline banner, deduped retry, and reconnect refresh for registry catalog.
5. **Admin config fetch/update resiliency** — [Issue file](../../../project_management/issues/project19-network-005-admin-config-safety.md)
   - Offline gating for overrides, deduped saves, reconnect re-sync.

These items are prioritized by user-facing risk under intermittent connectivity and will be linked into Project #19 with corresponding PRs.
