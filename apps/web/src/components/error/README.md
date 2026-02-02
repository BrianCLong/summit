# Error Boundary System

A comprehensive, production-grade error boundary system for the Summit web client with automatic retry, observability, and feature-flag integration.

## Quick Start

```tsx
// For dashboards and data views
import { DataFetchErrorBoundary } from '@/components/error';

<DataFetchErrorBoundary dataSourceName="Command Center">
  <CommandCenterDashboard />
</DataFetchErrorBoundary>

// For admin panels and mutations
import { MutationErrorBoundary } from '@/components/error';

<MutationErrorBoundary operationName="user update">
  <AdminPanel />
</MutationErrorBoundary>

// For custom scenarios
import { ErrorBoundary } from '@/components/error';

<ErrorBoundary
  enableRetry={true}
  maxRetries={3}
  severity="high"
  boundaryName="my_feature"
>
  <MyComponent />
</ErrorBoundary>
```

## Components

### ErrorBoundary (Core)

The base error boundary with retry logic, telemetry, and feature flag integration.

**Props:**
- `children` - Component tree to protect
- `enableRetry` - Enable automatic retry (default: false)
- `maxRetries` - Max retry attempts (default: 3)
- `retryDelay` - Base delay in ms for exponential backoff (default: 1000)
- `severity` - Error severity: 'low' | 'medium' | 'high' | 'critical'
- `boundaryName` - Identifier for observability
- `context` - Additional telemetry context
- `fallback` - Custom fallback UI
- `onReset` - Callback when boundary resets
- `onError` - Callback when error occurs

### DataFetchErrorBoundary

Specialized boundary for data-loading views (dashboards, analytics, graphs).

**Features:**
- Auto-retry enabled (3 attempts with exponential backoff)
- Medium severity (non-critical)
- User-friendly "data loading" fallback UI
- Network troubleshooting guidance

**Props:**
- `dataSourceName` - Name of the data source (e.g., "Command Center")
- `onError` - Optional error callback
- `context` - Additional telemetry context

### MutationErrorBoundary

Specialized boundary for data-modification operations (admin, bulk actions).

**Features:**
- No auto-retry (prevents duplicate mutations)
- High severity (critical operations)
- Data consistency warnings
- Safe "Back to Safety" navigation

**Props:**
- `operationName` - Name of the operation (e.g., "bulk user update")
- `onError` - Optional error callback
- `context` - Additional telemetry context

### FeatureFlaggedErrorBoundary

Feature-flag-aware wrapper for gradual rollout.

**Feature Flags:**
- `error_boundaries.retry_enabled` - Enable/disable retry
- `error_boundaries.max_retries` - Number of retry attempts
- `error_boundaries.telemetry_enhanced` - Enhanced telemetry

### Fallback Components

- `ErrorFallback` - Generic error page with retry support
- `NotFound` - 404 page
- `AccessDenied` - 403 page
- `NetworkError` - Network failure page
- `MaintenanceMode` - 503 page

## Telemetry

### Error Fingerprinting

Each error gets a stable 8-character hex fingerprint for grouping:
- Normalizes line/column numbers
- Normalizes numeric values in messages
- Uses first 3 stack frames

### Error Categorization

Automatic categorization:
- `render` - React rendering errors
- `network` - Fetch/network failures
- `data_fetch` - GraphQL/API data loading
- `mutation` - Data modification operations
- `auth` - Authentication/authorization
- `validation` - Input validation
- `unknown` - Uncategorized

### Telemetry Payload

Every error includes:
- Error fingerprint and category
- Session and device IDs
- Component stack trace
- Route and user agent
- Boundary name and context

## Current Implementation

### Top-Level (App.tsx)
```tsx
<ErrorBoundary
  enableRetry={true}
  maxRetries={3}
  severity="critical"
  boundaryName="app_root"
>
```

### Route-Level

**Dashboards (DataFetchErrorBoundary):**
- Command Center, Supply Chain, Advanced, Usage/Cost
- Internal Command, Mission Control

**Analytics (DataFetchErrorBoundary):**
- Tri-Pane, GeoInt, Narrative Intelligence, Explore

**Admin (MutationErrorBoundary):**
- Admin panel, Consistency dashboard, Feature flags

## Testing

Run tests:
```bash
npm run test -- error
npm run test -- integration/error-boundaries
```

Test files:
- `ErrorBoundary.test.tsx` - Core boundary
- `DataFetchErrorBoundary.test.tsx` - Data loading
- `MutationErrorBoundary.test.tsx` - Mutations
- `metrics.test.ts` - Telemetry functions
- `error-boundaries.test.tsx` - Integration tests

## Best Practices

### ✅ Do
- Use DataFetchErrorBoundary for read-only views
- Use MutationErrorBoundary for write operations
- Provide descriptive names for observability
- Add context for better telemetry
- Test error paths alongside happy paths
- Enable retry for idempotent operations

### ❌ Don't
- Enable retry for mutations (risk of duplicates)
- Nest boundaries unnecessarily
- Ignore errors without reporting
- Use generic error messages
- Forget to test boundary behavior

## Gradual Rollout

1. **Phase 1:** Enable telemetry only
2. **Phase 2:** Enable retry for read-only routes
3. **Phase 3:** Full rollout with monitoring
4. **Phase 4:** Tune based on telemetry data

## Troubleshooting

**Error not caught:**
- Error in async callback or event handler (not in React lifecycle)
- Error in error boundary itself
- Error in Suspense fallback

**Retry not working:**
- Check `enableRetry={true}`
- Verify max retries not exceeded
- Reset external state in `onReset`

**Telemetry not reporting:**
- Check network requests to `/api/monitoring/telemetry/events`
- Verify telemetry service health
- Check for ad blockers

## Related

- [Telemetry](../../telemetry/README.md)
- [Feature Flags](../../contexts/FeatureFlagContext.tsx)
- [Testing](../../__tests__/README.md)

---

**Sprint 2** (CI/CD & Release Ops) - Comprehensive error boundary implementation
**Last Updated:** 2026-01-23
