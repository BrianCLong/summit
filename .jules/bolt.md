## YYYY-MM-DD - [Optimize lists in HomePage]
**Learning:** The `HomePage` component rendered several lists (Quick Actions, Recent Investigations, Recent Alerts, Active Cases) with inline handlers inside the map method, causing new closures to be created for every item on every render, preventing pure component optimizations from being effective.
**Action:** Extract list items to components wrapped in `React.memo` and use `useCallback` on the handlers at the parent level before passing them to the child items.

## 2025-03-09 - [Optimize Array Sorting in ResultList]
**Learning:** A React component (`ResultList`) was performing an expensive `O(n log n)` sort and slicing operation on a search results array directly in the render body. Because the sort condition used `new Date().getTime()` on every object's properties, rendering lists caused unnecessary CPU blocking and UI jank whenever any local state (like active tabs or modals) changed.
**Action:** Wrap computationally expensive derivations of props (like sorting and pagination slicing) inside a `useMemo` hook, ensuring they only recalculate when their specific dependencies (e.g. `results` and `sortBy`) change.
