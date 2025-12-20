# Design system tokens + Storybook workflow

## Enable the token layer

- Feature flag: `ui.tokensV1` (env: `VITE_ENABLE_UI_TOKENS_V1`). Defaults to `true`.
- Provider: `src/theme/DesignSystemProvider.tsx` writes token CSS variables to `document.documentElement` and adds `data-ui-tokens="v1"`.
- Source of truth: `src/theme/tokens.ts` (spacing, radii, typography, z-index, shadows). Use the `tokenVar()` helper when you need CSS variables.

## Enforcement

- Lint guardrails target `apps/web/src/components/ui/**` and `src/theme/**`.
- Rule: `no-restricted-syntax` selectors in `apps/web/tools/eslint/design-token-restrictions.js` block literal spacing/radius/shadow/z-index values unless they reference `var(--ds-*)` or `tokenVar(...)`.
- Tests: `src/__tests__/designTokenLintRule.test.ts` validates the lint selectors stay aligned with the guidance.

Run locally:

```bash
pnpm --filter @intelgraph/web lint
pnpm --filter @intelgraph/web test:design-system
pnpm --filter @intelgraph/web build-storybook
```

## Adding a component & stories

1. Use tokens for layout and typography:
   - Prefer Tailwind classes where possible.
   - For inline styles, use `tokenVar('ds-space-md')`, `tokenVar('ds-radius-lg')`, etc.
   - Import numeric values from `tokens` when a library API expects numbers (e.g., MUI radii).
2. Wrap preview sandboxes in `DesignSystemProvider` (Storybook already decorates every story).
3. Author stories under `src/components/ui/stories/` so they are picked up by the Storybook build and the snapshot smoke test.
4. Keep stories self-contained—no backend required. Use mocks/handlers already wired in `/.storybook/preview.ts`.
5. For new primitives, add a small snapshot in `design-system.snap.test.tsx` to keep the visual regression hook meaningful.
