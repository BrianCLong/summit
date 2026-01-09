# UI Token Inventory (Phase 0)

## apps/web

- **Current sources**: `apps/web/src/index.css` defines CSS variables for base colors and Shadcn-style theme tokens; `apps/web/src/theme/tokens.ts` and `DesignSystemProvider` inject spacing, radii, typography, shadows, and z-index tokens at runtime.
- **Duplication/conflict**: color semantics live in `index.css` while spacing/typography live in TS-driven tokens; components mix Tailwind classes with token-driven styles.
- **Minimal shared layer**: `apps/web/src/styles/tokens.css` provides CSS variable tokens (colors, spacing, radii, shadows, typography, z-index) and becomes the reference surface for component primitives.

## conductor-ui

- **Current sources**: Tailwind utility classes in `conductor-ui/frontend/src/App.tsx` and `conductor-ui/frontend/tailwind.config.js` drive colors and spacing directly; no shared token layer.
- **Duplication/conflict**: card/button styles are hard-coded, diverging from `apps/web` scale and semantics.
- **Minimal shared layer**: compatibility noted for card/button primitives; token adoption deferred as a Governed Exception because repo linting currently ignores `conductor-ui/**`, preventing low-risk incremental adoption in this pass.

## client/

- **Current sources**: MUI theme usage in `client/src` plus a handful of CSS custom properties such as `--hairline` in component styles.
- **Duplication/conflict**: theme palette and CSS vars are disconnected from `apps/web` semantics.
- **Minimal shared layer**: no code changes required; bridge via semantic mapping only.

### Client bridge (semantic mapping)

| Token semantic | Suggested MUI theme key      |
| -------------- | ---------------------------- |
| foreground     | `palette.text.primary`       |
| background     | `palette.background.default` |
| muted          | `palette.action.hover`       |
| border         | `palette.divider`            |
| success        | `palette.success.main`       |
| warning        | `palette.warning.main`       |
| error          | `palette.error.main`         |
| info           | `palette.info.main`          |
