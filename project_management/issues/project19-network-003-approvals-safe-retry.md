# Project #19 — Approvals page offline/write safety

- **Component**: `client/src/features/approvals/ApprovalsPage.tsx`
- **Problem**: Approval actions POST while buttons stay active; offline users can trigger duplicate submissions or silent failures, and error toasts lack retry guidance.
- **Acceptance criteria**:
  - Offline banner gates approve/reject actions with clear messaging.
  - Buttons disable during submission and deduplicate rapid clicks; retry is explicit after errors.
  - Read refresh respects offline state and auto-refreshes once on reconnect.
  - Tests cover offline gating, duplicate prevention, and retry after simulated failure.
- **Risk/notes**: Ensure idempotency expectations documented; backend idempotency keys may be future follow-up.
- **Project status**: To be linked to Project #19.
