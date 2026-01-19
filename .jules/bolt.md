## 2025-12-29 - [Debouncing Controlled Components]

**Learning:** When debouncing a controlled input in React, you must decouple the input's display value (internal state) from the prop value (external state). If you bind the input directly to the prop value while debouncing the callback, the UI will freeze or lag because the prop updates are delayed.
**Action:** Always maintain an `internalValue` state for the input field, sync it with `useEffect` from props, and use it for the `value` prop of the input element.

## 2024-05-22 - [React Version Mismatch in Monorepo Tests]
**Learning:** `apps/webapp` tests failed with "Objects are not valid as a React child" because `@testing-library/react` was using a nested `react` instance while the app code used the root `react` instance. `Provider` context was lost between instances.
**Action:** Configure `jest.config.ts` `moduleNameMapper` to force resolution to the root `node_modules`:
```typescript
  moduleNameMapper: {
    '^react$': '<rootDir>/../../node_modules/react',
    '^react-dom$': '<rootDir>/../../node_modules/react-dom',
    '^react-dom/(.*)$': '<rootDir>/../../node_modules/react-dom/$1',
  },
```
