# Summit Frontend Routing & Patterns

This guide complements the [React Best Practices Pack](./react-best-practices-pack/SKILL.md) with specific Summit repo context.

## 1. When to Use Which Skill

| Trigger | Apply Skill | Example |
| :--- | :--- | :--- |
| **New Dashboard Widget** | `async-parallel` | Fetch KPI data and chart data via `Promise.all` in `useDashboardData`. |
| **Graph Visualization** | `rerender-memo` | Wrap `GraphNode` and `GraphEdge` in `React.memo` to prevent re-render on pan/zoom. |
| **Large Component** | `bundle-split` | Use `React.lazy` for `SettingsPanel` or `ReportEditor` (modal content). |
| **Utils Import** | `no-barrel` | Import `formatDate` from `lib/date` instead of `lib/index`. |

## 2. Concrete Examples

### ❌ Anti-Pattern: Serial Fetching

```tsx
// Bad: Waterfalls
useEffect(async () => {
  const user = await fetchUser();
  const settings = await fetchSettings(user.id); // Waits for user
  setData({ user, settings });
}, []);
```

### ✅ Pattern: Parallel Fetching

```tsx
// Good: Fetch in parallel
useEffect(async () => {
  const [user, settings] = await Promise.all([
    fetchUser(),
    fetchSettings() // If settings doesn't strictly depend on user object content
  ]);
  setData({ user, settings });
}, []);
```

### ❌ Anti-Pattern: Heavy Import

```tsx
// Bad: Imports everything in `components/ui/index.ts`
import { Button } from '@/components/ui';
```

### ✅ Pattern: Direct Import

```tsx
// Good: Only imports the button code
import { Button } from '@/components/ui/button';
```

## 3. Agent Instructions

When you are asked to "optimize the frontend":

1.  **Audit** `apps/web/src/pages` for large `useEffect` blocks.
2.  **Audit** `apps/web/src/components/ui` imports in high-traffic pages.
3.  **Refactor** using the patterns above.
4.  **Verify** using the Chrome Performance tab (or React DevTools Profiler).
