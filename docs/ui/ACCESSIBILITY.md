# Accessibility Standards and Checks

This project follows WCAG 2.1 AA fundamentals to keep the web client keyboard- and screen-reader-friendly.

## Standards to Follow
- Provide a single, clearly labeled `<main>` landmark per page (e.g., `aria-label="Sign in"`).
- Ensure primary actions remain reachable through a logical tab order without requiring a mouse.
- Supply meaningful accessible names for interactive controls (e.g., password visibility toggles).
- Preserve skip-navigation affordances and focus outlines so users can bypass repetitive navigation.

## How to Run Accessibility Checks

From the repository root:

1. Install app dependencies (uses the `apps/web/pnpm-lock.yaml` lockfile):
   ```bash
   cd apps/web
   pnpm install --frozen-lockfile
   ```
2. Run the focused accessibility lint (jsx-a11y rules on critical shells):
   ```bash
   pnpm run lint:a11y
   ```
3. Execute the keyboard and landmark smoke test:
   ```bash
   pnpm run test -- --run src/__tests__/accessibility/landmarkKeyboardFlow.test.tsx
   ```

## CI Coverage
- `.github/workflows/web-accessibility.yml` installs `apps/web` dependencies, runs the JSX a11y lint, and executes the keyboard landmark smoke test on pull requests that touch the web app or accessibility docs.

## Non-goals / Out of Scope
- Automated color-contrast auditing and full axe rule coverage are not included in this baseline.
- End-to-end browser flows are limited to the smoke test above; comprehensive journeys remain future work.
