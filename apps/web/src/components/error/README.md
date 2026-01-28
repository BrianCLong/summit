# Error Boundary System

This directory contains the React Error Boundary system for the Summit Web Client.

## Components

### `ErrorBoundary`

A wrapper component that catches JavaScript errors anywhere in its child component tree, logs those errors, and displays a fallback UI instead of the component tree that crashed.

**Usage:**

```tsx
import { ErrorBoundary } from '@/components/error';

function App() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

**Props:**

- `fallback`: Custom fallback UI (ReactNode or function).
- `onReset`: Callback function when the user clicks "Try Again".
- `onError`: Callback function when an error occurs.
- `severity`: Severity level for logging ('low', 'medium', 'high', 'critical').

### Fallback Components

- `ErrorFallback`: Generic error page.
- `NotFound`: 404 page.
- `AccessDenied`: 403 page.
- `NetworkError`: Network failure page.
- `MaintenanceMode`: 503 page.

## Error Reporting

Errors are automatically reported to the backend telemetry service via `apps/web/src/telemetry/metrics.ts`.

## Best Practices

1.  **Wrap Top-Level Routes**: Always wrap the main `Routes` in an `ErrorBoundary` to prevent the entire app from crashing (White Screen of Death).
2.  **Granular Boundaries**: Wrap widget-heavy or complex isolated components (e.g., a specific dashboard widget) in their own `ErrorBoundary` so a failure in one widget doesn't crash the whole dashboard.
3.  **Reset State**: Use the `onReset` prop to clear any state that might have caused the error (e.g., clearing a search query or resetting a form).
