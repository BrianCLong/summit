# Project #19 — Admin config fetch/update resiliency

- **Component**: `client/src/features/admin/OverridesPanel.tsx`
- **Problem**: Admin overrides GET/PUT lack offline detection; queued requests collide when toggling multiple rows during a network flap, leading to stale state without alerts.
- **Acceptance criteria**:
  - Offline banner blocks edits and clarifies next steps.
  - Save buttons disable during flight and debounced; conflicting calls are prevented.
  - Reconnect triggers a fresh fetch to realign local state.
  - Tests cover offline gating, deduped updates, and refresh on reconnect.
- **Risk/notes**: Write path; backend idempotency to be confirmed—UI must block repeat submissions locally.
- **Project status**: To be linked to Project #19.
