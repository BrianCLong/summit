# Network UX Contract (Offline + Retry)

## Offline indicator rules

- Use a global "Offline" banner anchored beneath the page header for any view that depends on remote data.
- Banner copy must include the action impact (e.g., "Auto-refresh paused") and a next step ("Reconnect to resume").
- Controls that are disabled because of offline state must expose `aria-disabled` and a tooltip/inline hint.

## Retry conventions

- **Reads**: show inline error with cause, include a primary "Retry" button that is focusable; throttle retries to one in-flight request per view.
- **Writes**: disable submit buttons while in-flight; if offline, block submission with an explanatory toast or inline alert. Require explicit user re-submit after failure.

## Reconnect behavior

- When returning online, trigger a single refresh for views with stale data and clear stale error banners; resume any paused polling loops.
- Do not silently submit queued writes without backend idempotency guarantees; instead surface a prompt to retry.

## Accessibility

- Offline banners and retry buttons must be reachable via keyboard (tab order) and have `role="status"` or `aria-live="polite"` where dynamic.
- Error states must be conveyed through text, not color alone; ensure focus moves to alerts when they appear in modals/panels.
