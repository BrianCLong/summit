# Resilience Contract

## Where to Place Boundaries

Error Boundaries are critical for isolating failures and preventing full-app crashes. They should be placed at:

1.  **Global Level (Root)**: The `App.tsx` or `main.tsx` must have a top-level boundary to catch unexpected exceptions that bubble up from anywhere. This is the "screen of death" prevention.
2.  **Route Level**: Each major route (especially complex dashboards like `/maestro` or `/workbench`) should be wrapped in its own boundary. This ensures that if a specific page fails, the rest of the app (navigation, sidebar) remains functional.
3.  **Component Level**: High-risk "widgets" or isolated panels (e.g., a specific graph visualization, a data table, a map pane) should have their own boundaries. If a widget crashes, it should be replaced by a placeholder, not crash the entire page.

## Fallback UI Standard

The fallback UI must be consistent, actionable, and user-friendly.

- **Structure**:
  - **Icon**: Visual indicator of error (e.g., alert triangle).
  - **Title**: Clear, non-technical header (e.g., "Something went wrong").
  - **Message**: User-safe explanation (e.g., "We couldn't load this section.").
  - **Action**: Primary "Try Again" button (resets state/boundary). Secondary "Go Home" or navigation button.
- **Developer/Operator Details**:
  - **Production**: Do _not_ show stack traces or raw error messages to end-users. Show a correlation ID if available.
  - **Development**: Show full stack trace and error message in a collapsible or distinct section.

## Logging Policy

- **What to Log**:
  - Error name and message.
  - Component stack (React `errorInfo`).
  - Route context (where did it happen?).
  - User context (tenant ID, user ID) - _without PII if possible_.
  - Correlation ID (trace ID) to link to backend logs.
- **What NOT to Log**:
  - Sensitive payloads (passwords, tokens, PII).
  - Large state objects that might contain sensitive data.

## Accessibility (A11y) Requirements

- **Focus Management**: When the fallback renders, focus should be moved to the error heading or the primary action button so screen reader users know context has changed.
- **Keyboard Navigation**: All actions (Retry, Go Home) must be keyboard accessible.
- **ARIA Attributes**: Use `role="alert"` for the container or critical message to announce the error immediately.
