## YYYY-MM-DD - [Optimize lists in HomePage]
**Learning:** The `HomePage` component rendered several lists (Quick Actions, Recent Investigations, Recent Alerts, Active Cases) with inline handlers inside the map method, causing new closures to be created for every item on every render, preventing pure component optimizations from being effective.
**Action:** Extract list items to components wrapped in `React.memo` and use `useCallback` on the handlers at the parent level before passing them to the child items.

## 2026-03-09 - [Lint Unblock PR for monorepo workspaces and Python]
**Learning:** `pnpm lint` and `pnpm install` failed across multiple workspaces because `@intelgraph/connector-sdk` was referenced but did not exist. Python imports were unformatted.
**Action:** Targeted `sed` to remove bad package references, then used `ruff check . --fix` to address python unused imports/linting issues to unblock the merge queue.
