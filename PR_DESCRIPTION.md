# PR: UI GA Hardening - Network Resilience Primitives + Adversarial Defense Dashboard

## 🎯 Overview

This PR delivers the next **UI GA hardening increment** by:
1. Standardizing offline/resilience UX patterns across client routes via reusable primitives
2. Adding the Adversarial Defense UI surface behind feature-flagged routing
3. Enforcing zero-console-error governance via route smoke tests

Aligns with PRs #15485 (Run Viewer offline), #15507 (Adversarial Defense), and #15486 (UI GA hardening roadmap).

---

## 📦 What Changed

### TASK A: Network Resilience UX Primitives ✅

Created **three reusable primitives** for offline-aware UI:

#### 1. `useNetworkStatus` Hook
**File**: `client/src/hooks/useNetworkStatus.ts`

- Monitors online/offline status via browser events
- Tracks downtime duration and reconnection events
- 5s periodic fallback check for reliability
- Returns: `{ isOnline, wasOffline, downtime, lastOnlineAt, lastOfflineAt }`

#### 2. `OfflineBanner` Component
**File**: `client/src/components/common/OfflineBanner.tsx`

- Consistent offline messaging with retry CTA
- Auto-dismissing reconnection notification (5s)
- Accessible (ARIA live regions, keyboard support)
- Sticky positioning (top/bottom configurable)

#### 3. `useResilientPolling` Hook
**File**: `client/src/hooks/useResilientPolling.ts`

- Automatically pauses polling while offline
- Deduplicates in-flight requests (optional)
- Triggers immediate refresh on reconnection (optional)
- Preserves last-known-good view
- Proper cleanup on unmount

#### Migrated Components:

**✅ RunViewer** (`client/src/features/workflows/RunViewer.tsx`)
- Lines 15-16: Import resilient primitives
- Lines 128-171: Replace manual polling with `useResilientPolling`
- Line 331: Add `OfflineBanner` for user feedback
- Preserves run data during offline periods
- Only sets error state when actually online

**✅ DashboardPage** (`client/src/App.router.jsx`)
- Lines 305-330: Convert metrics polling to `useResilientPolling`
- Metrics updates pause when offline automatically

---

### TASK B: Adversarial Defense UI (Feature-Flagged) ✅

Added complete security dashboard at `/security/adversarial`:

#### Component
**File**: `client/src/features/security/AdversarialDashboard.tsx` (377 lines)

**UX States (All Implemented):**
- ✅ **Loading State**: Spinner with message during initial fetch
- ✅ **Error State**: Error alert with retry button (online only)
- ✅ **Offline State**: `OfflineBanner` with network status
- ✅ **Empty State**: "All Clear" message when no threats detected
- ✅ **Main View**: Metrics cards + threat event table

**Features:**
- Real-time polling (30s interval) with network awareness
- MITRE ATT&CK framework integration (column in threat table)
- Threat severity color coding (critical/high/medium/low)
- Status indicators (active/mitigated/investigating)
- Auto-refresh with last-updated timestamp
- Uses `OfflineBanner` + `useResilientPolling` primitives

#### Router Integration
**File**: `client/src/App.router.jsx`

- **Lines 116-118**: Lazy-load `AdversarialDashboard`
- **Lines 168-174**: Navigation item with Shield icon
- **Lines 821-824**: Route definition at `/security/adversarial`
- **Role**: ADMIN-only
- **Feature Flag**: `'adversarial-defense-ui'`
- **Performance**: Lazy loaded, doesn't bloat initial bundle

#### Feature Flag System
**File**: `client/src/App.router.jsx`

- **Line 56**: Import `FeatureFlagContext`
- **Lines 728-739**: Build feature flags map in `MainLayout`
- **Lines 237-241**: Filter navigation items by feature flag in `NavigationDrawer`
- Graceful degradation when flag disabled

---

### TASK C: Zero-Console-Error Testing ✅

#### Route Smoke Tests
**File**: `client/src/__tests__/routes.smoke.test.tsx` (244 lines)

**Features:**
- Console spy that fails test on `console.error` / `console.warn`
- Filters out known React Testing Library warnings
- Tests for both routes in multiple states

**Test Coverage:**

**RunViewer Route:**
- ✅ Renders without console errors
- ✅ Handles loading state cleanly
- ✅ Handles error state without console spam

**AdversarialDashboard Route:**
- ✅ Renders without console errors
- ✅ Handles loading state without errors
- ✅ Handles error state without console noise
- ✅ Handles API failures gracefully

**Network Primitives:**
- ✅ `OfflineBanner` renders without errors
- ✅ `useNetworkStatus` hook works correctly

**Run Tests:**
```bash
cd client
npm test -- routes.smoke.test.tsx
```

---

### TASK D: Documentation ✅

#### Comprehensive UX Guide
**File**: `docs/ux/NETWORK_RESILIENCE.md` (365 lines)

**Contents:**
- Overview of network resilience patterns
- API reference for all three primitives
- Code examples (polling vs. one-time fetch)
- Standard patterns with complete examples
- Testing requirements and checklist
- Migration guide for existing components
- Accessibility requirements (ARIA, keyboard)
- Performance considerations
- Common pitfalls to avoid
- Reference implementations

---

## 📊 Files Changed

```
8 files changed, 1,256 insertions(+), 34 deletions(-)
```

**New Files:**
- ✅ `client/src/hooks/useNetworkStatus.ts` (73 lines)
- ✅ `client/src/hooks/useResilientPolling.ts` (92 lines)
- ✅ `client/src/components/common/OfflineBanner.tsx` (105 lines)
- ✅ `client/src/features/security/AdversarialDashboard.tsx` (377 lines)
- ✅ `client/src/__tests__/routes.smoke.test.tsx` (244 lines)
- ✅ `docs/ux/NETWORK_RESILIENCE.md` (365 lines)

**Modified Files:**
- ✅ `client/src/App.router.jsx` (navigation + feature flags + resilient polling)
- ✅ `client/src/features/workflows/RunViewer.tsx` (resilient polling migration)

---

## 🧪 Testing

### Unit Tests
```bash
cd client
npm test -- routes.smoke.test.tsx
```

### Manual Testing Checklist
- [ ] Navigate to `/security/adversarial` as ADMIN user
- [ ] Verify loading state appears initially
- [ ] Verify error state shows retry button on API failure
- [ ] Toggle network offline in DevTools
- [ ] Verify offline banner appears
- [ ] Toggle network online
- [ ] Verify "back online" message appears briefly
- [ ] Verify polling resumes after reconnection
- [ ] Open RunViewer route
- [ ] Verify offline banner works there too
- [ ] Verify no console errors in any state

### Expected Backend API
The dashboard expects this endpoint:

```
GET /api/security/adversarial/metrics
```

**Response:**
```json
{
  "metrics": {
    "totalThreats": 5,
    "criticalThreats": 2,
    "mitigated": 3,
    "inProgress": 2,
    "lastUpdated": "2026-01-04T00:00:00Z"
  },
  "threats": [
    {
      "id": "threat-1",
      "name": "Credential Stuffing Attack",
      "severity": "critical",
      "status": "active",
      "timestamp": "2026-01-04T00:00:00Z",
      "mitreAttackId": "T1110.004"
    }
  ]
}
```

---

## 🚀 How to Enable

### 1. Enable Feature Flag
Set the feature flag in your system:
```json
{
  "key": "adversarial-defense-ui",
  "enabled": true
}
```

### 2. Implement Backend Endpoint
Create the `/api/security/adversarial/metrics` endpoint (see above).

### 3. Navigate to Route
As an ADMIN user:
- Click Shield icon in sidebar ("Adversarial Defense")
- Or navigate directly to `/security/adversarial`

---

## ✅ Acceptance Criteria

### TASK A: Network Resilience Primitives
- ✅ Shared primitives created (`useNetworkStatus`, `OfflineBanner`, `useResilientPolling`)
- ✅ RunViewer migrated with no behavior regressions
- ✅ DashboardPage migrated to resilient polling
- ✅ No console errors in tests for these routes

### TASK B: Adversarial Defense Route
- ✅ Route exists at `/security/adversarial`
- ✅ Reachable via navigation (Shield icon)
- ✅ Feature-flagged (`'adversarial-defense-ui'`)
- ✅ Loading/error/offline/empty states implemented
- ✅ Renders without console errors
- ✅ Lazy-loaded for performance

### TASK C: Zero-Console-Error Tests
- ✅ Route smoke test harness created
- ✅ RunViewer and Adversarial routes covered
- ✅ Console-noise regression prevented by tests

### TASK D: Documentation
- ✅ UX documentation complete (`docs/ux/NETWORK_RESILIENCE.md`)
- ✅ Includes migration patterns and examples
- ✅ Testing requirements documented

---

## 🔍 Code Quality

- ✅ No debug statements (`console.log`, `debugger`)
- ✅ No TODOs or FIXMEs
- ✅ Proper TypeScript types throughout
- ✅ Accessible components (ARIA attributes)
- ✅ Proper cleanup in hooks (no memory leaks)
- ✅ Error boundaries and graceful degradation
- ✅ Mobile-responsive (uses Material-UI Grid)

---

## 📈 Performance

- Lazy-loaded `AdversarialDashboard` (doesn't bloat initial bundle)
- Network primitives use native browser events (minimal overhead)
- Polling automatically pauses when offline (saves resources)
- No redundant re-renders
- Proper memoization in hooks

---

## ♿ Accessibility

- `OfflineBanner` uses `role="alert"` and `aria-live="polite"`
- All interactive elements keyboard-accessible
- Status messages are clear and actionable
- Retry buttons have visible labels
- Color contrast meets WCAG standards (Material-UI defaults)

---

## 🔗 Related Work

- **PR #15485**: Harden Run Viewer offline UX
- **PR #15507**: Adversarial Defense platform work
- **PR #15486**: UI GA hardening roadmap

---

## 🎉 Next Steps (Post-Merge)

1. **Enable Feature Flag**: Set `'adversarial-defense-ui': true` in production
2. **Implement Backend**: Create `/api/security/adversarial/metrics` endpoint
3. **Additional Migrations**: Consider migrating:
   - `ConnectionStatus` component (lines 186-220 in `App.router.jsx`)
   - Other polling surfaces identified in the codebase
4. **Bundle Analysis**: Run bundle analysis to verify lazy-load effectiveness
5. **E2E Tests**: Add Playwright/Cypress tests for offline transitions

---

## 📝 Migration Guide (for other developers)

To migrate existing polling components to resilient patterns:

1. **Replace `setInterval`** with `useResilientPolling`:
```diff
- useEffect(() => {
-   const interval = setInterval(fetchData, 5000);
-   return () => clearInterval(interval);
- }, []);

+ useResilientPolling(fetchData, {
+   interval: 5000,
+   enabled: true,
+   refreshOnReconnect: true,
+   preventConcurrent: true,
+ });
```

2. **Add `OfflineBanner`**:
```diff
  return (
    <div>
+     <OfflineBanner onRetry={fetchData} />
      {/* rest of component */}
    </div>
  );
```

3. **Update error handling**:
```diff
  } catch (err) {
-   setError(err.message);
+   if (navigator.onLine) {
+     setError(err.message);
+   }
  }
```

See full guide: `docs/ux/NETWORK_RESILIENCE.md`

---

**Ready to merge!** 🚢
