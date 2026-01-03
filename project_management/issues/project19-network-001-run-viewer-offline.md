# Project #19 — Maestro run viewer offline resilience

- **Component**: `client/src/features/workflows/RunViewer.tsx`
- **Problem**: Run viewer silently fails under flaky connectivity; polling continues during outages, and manual refresh has no offline messaging, causing stale DAGs and duplicate requests when users spam refresh.
- **Acceptance criteria**:
  - Offline state is surfaced with a banner and disables refresh/polling.
  - Manual retry explains the failure cause and is keyboard focusable.
  - Reconnect triggers a single safe refresh without duplicate requests.
  - Tests cover offline → online transitions, retry flow, and polling pause/resume.
- **Risk/notes**: Pure read-only surface; no backend changes required. Ensure React Flow layout does not re-mount unnecessarily on reconnect.
- **Project status**: To be linked to Project #19 (Network robustness) on PR.
