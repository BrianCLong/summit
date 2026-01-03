# Project #19 — Conductor Studio server list resiliency

- **Component**: `client/src/features/conductor/ConductorStudio.tsx`
- **Problem**: The MCP server list fetches every 30s without network awareness; offline states spam errors and do not surface actionable guidance, and manual refresh lacks backoff leading to duplicate calls.
- **Acceptance criteria**:
  - Offline detection pauses polling and surfaces a banner and tooltip on controls.
  - Manual refresh includes disable-on-request and retry guidance; errors are actionable.
  - Reconnect triggers a single refresh and clears stale errors.
  - Tests cover offline → online transitions and safe manual retry without double firing.
- **Risk/notes**: Read-only GETs; ensure socket/connect flows are not broken by added guards.
- **Project status**: To be linked to Project #19.
