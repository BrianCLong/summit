## 2025-12-29 - [Debouncing Controlled Components]

**Learning:** When debouncing a controlled input in React, you must decouple the input's display value (internal state) from the prop value (external state). If you bind the input directly to the prop value while debouncing the callback, the UI will freeze or lag because the prop updates are delayed.
**Action:** Always maintain an `internalValue` state for the input field, sync it with `useEffect` from props, and use it for the `value` prop of the input element.

## 2025-12-29 - [Workspace Dependency Resolution in Scripts]
**Learning:** When running standalone verification scripts with `tsx` in a workspace (monorepo), imports of workspace dependencies (like `pino`) might fail if `node_modules` are not properly linked or if the script is run from a subdirectory without full context. Running `pnpm install` in the root is often necessary to ensure all workspace dependencies are linked, but be careful not to commit unintended `pnpm-lock.yaml` changes if the local environment differs from CI.
**Action:** Always verify `pnpm-lock.yaml` for unintended changes after running `pnpm install`. If running scripts with `tsx`, ensure `NODE_PATH` or context allows finding workspace dependencies.
