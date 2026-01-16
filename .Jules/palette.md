## 2024-05-23 - Accessibility in Toolbars
**Learning:** Icon-only buttons in toolbars (like zoom, fit, center) often lack `aria-label` attributes, relying only on `title` tooltips which are insufficient for screen readers.
**Action:** Always verify that `Button` components with `size="icon"` or similar have a descriptive `aria-label`.

## 2024-05-23 - Jest Configuration for Path Aliases
**Learning:** The `client` project uses `@/` path aliases (e.g., `@/lib/utils`) but the Jest configuration (`client/jest.config.cjs`) was missing the corresponding `moduleNameMapper` entry, causing tests to fail when importing files using these aliases.
**Action:** Ensure `jest.config.cjs` includes `^@/(.*)$': '<rootDir>/src/$1'` when working with projects that use path aliases in `tsconfig.json`.
