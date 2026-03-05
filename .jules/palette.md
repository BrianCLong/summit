## 2025-10-25 - Maestro Run Console Status & Onboarding

**Learning:** Users often stare at empty text areas with "writer's block". Providing clickable example prompts not only speeds up testing but educates users on the tool's capabilities (e.g., "analyze PRs" vs "summarize risk").
**Action:** Always provide "Quick Start" chips or buttons for empty states in complex input interfaces.

**Learning:** Color-only status indicators (red/green badges) are insufficient for quick scanning and accessibility.
**Action:** Augment status badges with semantic icons (Check, AlertTriangle, Loader) to reinforce state.

## 2025-10-28 - Unit Test Priority

**Learning:** When local dev environments are unstable (e.g., 500 errors, MSW conflicts), rely on robust unit tests () to verify logic and UX flows instead of getting blocked by visual verification.
**Action:** Prioritize writing comprehensive unit tests for UI interactions early in the process.

## 2025-10-28 - Unit Test Priority

**Learning:** When local dev environments are unstable, rely on robust unit tests to verify logic and UX flows.
**Action:** Prioritize writing comprehensive unit tests for UI interactions early in the process.

## 2025-10-28 - Fixing Legacy Debt

**Learning:** Even when assigned a focused task (e.g., UX), one may inherit a broken branch or be required to fix blocking architectural issues (e.g., API drift, Type mismatches) to land changes.
**Action:** Be prepared to step outside the assigned persona to unblock the build.

## 2025-05-23 - Focus Management for Dynamic UI
## 2025-10-27 - Test Environment Instability
**Learning:** The React 19 upgrade seems to have broken the test environment (Vitest + React Testing Library) with "Objects are not valid as a React child" errors across all component tests.
**Action:** When tests are fundamentally broken due to environment issues, rely on strict type checking (Lint) and careful code review, and flag the environment issue to the Platform team.

## 2025-10-28 - Keyboard Traps in Modals
**Learning:** The Command Palette was implemented as a visual-only overlay, creating a keyboard trap where users could open it but not navigate or select items without a mouse.
**Action:** Ensure all interactive lists (like palettes, dropdowns) implement `role="listbox"` and manage focus or `aria-activedescendant` for keyboard navigation.
**Learning:** When a user action removes the triggering element from the DOM (e.g., clicking a "quick prompt" chip that disappears upon selection), focus is lost to the body, confusing keyboard users.
**Action:** Always programmatically move focus to the next logical element (e.g., the input field) before the trigger disappears.

## 2025-12-05 - Tailwind Content Resolution for Mixed-Extension Codebases
**Learning:** In projects with a mix of JS/JSX and TS/TSX, Tailwind configurations may only target TS/TSX files. This causes utility classes in JS/JSX files to be purged, breaking accessibility features (like `sr-only`) or layout styles.
**Action:** Always verify `tailwind.config.cjs` includes all relevant file extensions (js, jsx, ts, tsx) when implementing utility-based styles.

## 2026-02-07 - Accessibility for Loading States
**Learning:** Purely visual loading indicators (spinners) are invisible to screen readers unless they are explicitly marked as status regions. Using `aria-busy` on the container (like a button) and `role="status"` on the spinner provides a consistent and accessible experience for all users.
**Action:** Always pair visual spinners with `role="status"` and `aria-label`, and use `aria-busy` on interactive elements to communicate that an operation is in progress.

## 2025-05-23 - Keyboard Accessibility for Custom Interactive Elements
**Learning:** Custom interactive elements built with non-semantic tags (like `div` or `Card` components) are invisible to keyboard and screen reader users. Adding `tabIndex={0}`, `role="button"`, and `onKeyDown` handlers for Enter/Space keys is essential for inclusivity.
**Action:** Always audit dashboards for "clickable" divs and ensure they implement full keyboard parity and appropriate ARIA roles. Use `focus-visible:` instead of `focus:` for focus ring styles to provide a cleaner experience for mouse users.
