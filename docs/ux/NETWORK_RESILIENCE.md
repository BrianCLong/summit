# Network Resilience UX Patterns

This document describes the standard patterns for handling network connectivity issues in the Summit UI.

## Overview

All UI components that fetch data or poll APIs should implement network-aware patterns to ensure a smooth user experience during connectivity issues. The codebase provides shared primitives to make this easy.

## Shared Primitives

### useNetworkStatus Hook

**Location**: `client/src/hooks/useNetworkStatus.ts`

Monitors network connectivity and provides status information:

```typescript
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

function MyComponent() {
  const { isOnline, wasOffline, downtime } = useNetworkStatus();

  // isOnline: current connectivity status
  // wasOffline: true briefly after reconnection
  // downtime: ms spent offline before reconnection
}
```

**Features**:
- Listens to browser `online`/`offline` events
- Periodic connectivity checks as fallback (5s interval)
- Tracks downtime duration
- Detects reconnection events

### OfflineBanner Component

**Location**: `client/src/components/common/OfflineBanner.tsx`

Displays consistent offline/reconnection messaging:

```typescript
import { OfflineBanner } from '../../components/common/OfflineBanner';

function MyRoute() {
  return (
    <div>
      <OfflineBanner onRetry={refetchData} />
      {/* rest of your component */}
    </div>
  );
}
```

**Features**:
- Automatically shows when offline
- Shows "back online" message briefly after reconnection
- Optional retry button for manual refresh
- Sticky positioning (top or bottom)
- Accessible (ARIA live regions)

**Props**:
- `onRetry?: () => void` - Optional callback for retry button
- `message?: string` - Custom offline message
- `showWhenOnline?: boolean` - Show banner even when online
- `position?: 'top' | 'bottom'` - Banner position (default: 'top')

### useResilientPolling Hook

**Location**: `client/src/hooks/useResilientPolling.ts`

Provides network-aware polling with automatic pause/resume:

```typescript
import { useResilientPolling } from '../../hooks/useResilientPolling';

function MyComponent() {
  const fetchData = useCallback(async () => {
    const res = await fetch('/api/data');
    const data = await res.json();
    setData(data);
  }, []);

  useResilientPolling(fetchData, {
    interval: 5000,           // Poll every 5s
    enabled: true,            // Enable/disable polling
    refreshOnReconnect: true, // Trigger immediate refresh on reconnect
    preventConcurrent: true,  // Prevent overlapping requests
  });
}
```

**Features**:
- Automatically pauses polling when offline
- Prevents concurrent requests (optional)
- Triggers immediate refresh on reconnection (optional)
- Proper cleanup on unmount
- Works with any async function

## Standard Patterns

### Pattern 1: Polling Components (e.g., RunViewer, Dashboards)

Components that poll for updates should:

1. Use `useResilientPolling` for all polling logic
2. Display `OfflineBanner` at the top of the route
3. Preserve last-known-good data while offline
4. Only clear errors when actually online

**Example**:

```typescript
export default function MyDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('Failed to fetch');

      const newData = await res.json();
      setData(newData);

      // Only clear errors when online
      if (navigator.onLine) {
        setError(null);
      }
    } catch (err) {
      // Only set errors when online - offline is handled by banner
      if (navigator.onLine) {
        setError(err.message);
      }
    }
  }, []);

  // Poll every 30s, refresh on reconnect, prevent concurrent
  useResilientPolling(fetchData, {
    interval: 30000,
    enabled: true,
    refreshOnReconnect: true,
    preventConcurrent: true,
  });

  return (
    <div>
      <OfflineBanner onRetry={fetchData} />
      {/* Render data/error/loading states */}
    </div>
  );
}
```

### Pattern 2: One-time Fetch Components

Components that fetch data once should:

1. Use `useNetworkStatus` to detect connectivity
2. Display `OfflineBanner` for user feedback
3. Optionally retry on reconnection

**Example**:

```typescript
export default function MyPage() {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [data, setData] = useState(null);

  const fetchData = useCallback(async () => {
    // ... fetch logic
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, []);

  // Retry on reconnection
  useEffect(() => {
    if (wasOffline && isOnline) {
      fetchData();
    }
  }, [wasOffline, isOnline]);

  return (
    <div>
      <OfflineBanner onRetry={fetchData} />
      {/* ... */}
    </div>
  );
}
```

## Testing Requirements

All routes must pass zero-console-error smoke tests. See `client/src/__tests__/routes.smoke.test.tsx` for examples.

### Required Test Coverage

1. **Render Test**: Route renders without console errors/warnings
2. **Loading Test**: Loading state does not cause errors
3. **Error Test**: Error handling does not spam console
4. **Offline Transition**: Offline/online transitions work smoothly

### Running Tests

```bash
cd client
npm test -- routes.smoke.test.tsx
```

## Migration Checklist

When updating a component to use resilient patterns:

- [ ] Replace `setInterval` polling with `useResilientPolling`
- [ ] Add `OfflineBanner` at the top of the route
- [ ] Update error handling to check `navigator.onLine`
- [ ] Preserve last-known-good data during offline periods
- [ ] Add route smoke test
- [ ] Verify no console errors in test output

## Examples

### Migrated Components

- `client/src/features/workflows/RunViewer.tsx` - Polling for run status
- `client/src/App.router.jsx` - DashboardPage metrics updates
- `client/src/features/security/AdversarialDashboard.tsx` - Threat data polling

### Reference Implementations

See these files for complete examples:
- **Polling**: `RunViewer.tsx` (lines 130-173)
- **Feature-flagged route**: `AdversarialDashboard.tsx` (full component)
- **Tests**: `__tests__/routes.smoke.test.tsx`

## Accessibility

Network status changes must be announced to screen readers:

- `OfflineBanner` uses `role="alert"` and `aria-live="polite"`
- Status messages are clear and actionable
- Retry buttons have visible labels and keyboard support

## Performance

Network resilience primitives are designed for minimal overhead:

- `useNetworkStatus` uses native browser events
- `useResilientPolling` automatically pauses during offline
- No redundant re-renders
- Proper cleanup prevents memory leaks

## Common Pitfalls

1. **Don't clear last-known-good data** - Users should see stale data rather than loading spinners during brief disconnections
2. **Don't spam console.error** - Only log errors for debugging, not for expected offline states
3. **Don't block on connectivity** - UI should remain responsive even when API calls fail
4. **Don't forget cleanup** - Always return cleanup functions from effects

## Future Enhancements

Planned improvements:
- Service worker for true offline support
- Request queuing and replay
- Optimistic UI updates
- Network quality indicators
