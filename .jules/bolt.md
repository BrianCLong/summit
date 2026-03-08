## YYYY-MM-DD - [Optimize lists in HomePage]
**Learning:** The `HomePage` component rendered several lists (Quick Actions, Recent Investigations, Recent Alerts, Active Cases) with inline handlers inside the map method, causing new closures to be created for every item on every render, preventing pure component optimizations from being effective.
**Action:** Extract list items to components wrapped in `React.memo` and use `useCallback` on the handlers at the parent level before passing them to the child items.
