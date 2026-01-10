# Project #19 — Plugin marketplace offline/retry UX

- **Component**: `client/src/features/conductor/Marketplace.tsx`
- **Problem**: Registry fetch lacks error surface; offline state leaves blank grid and repeated fetch attempts with no feedback.
- **Acceptance criteria**:
  - Offline banner appears with blocked state and retry guidance.
  - Retry control for registry fetch is accessible and dedupes clicks; background auto-refresh pauses while offline.
  - Reconnect invalidates stale data and shows refreshed catalog state.
  - Tests simulate offline/online and fetch failure → retry success.
- **Risk/notes**: GET-only; ensure abort on unmounted component.
- **Project status**: To be linked to Project #19.
