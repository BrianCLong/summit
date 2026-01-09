# Summit UI Consolidation: Design Tokens, Component Primitives, and Cross-Surface Consistency Without a Rewrite

Objective: Reduce UI divergence across Summit’s multiple front-ends by introducing a small, authoritative design-token layer and a minimal component primitive set that can be adopted incrementally—no sweeping migration, no new UI frameworks.

## Phase 0 — Inventory and decision points (required)

1. Locate current styling/token sources
   - Identify where colors, spacing, typography, radii, shadows, and z-index conventions live today in:
     - apps/web
     - conductor-ui
     - client/
   - Capture findings in a short markdown note:
     - what exists (tailwind config, CSS vars, theme files, MUI theme, etc.)
     - where duplication/conflict exists
     - what the minimally shared layer should be

2. Pick the integration strategy
   - If apps/web already uses CSS variables: extend that.
   - If not: introduce a tiny tokens.css with CSS variables in apps/web only, then optionally mirror in conductor-ui.
   - Do not try to force client/ to adopt the same mechanism in this prompt; only add a compatibility bridge if trivial.

## Phase 1 — Add a token layer (small, authoritative)

3. Implement apps/web tokens
   - Add a single source of truth for tokens:
     - apps/web/src/styles/tokens.css (or existing preferred location)
   - Must include:
     - color primitives (foreground/background/muted/border)
     - semantic colors (success/warn/error/info)
     - spacing scale
     - radii scale
     - shadow scale
     - typography scale (at least base sizes/weights)
   - Provide a dark mode strategy if the app supports it (CSS vars + class/attribute switch). If not, keep tokens neutral and future-safe.

4. Wire tokens into existing components
   - Update Button, EmptyState, and one layout component (header/sidebar) to reference tokens (directly or via existing utility classes).
   - Avoid style churn: change only what’s necessary to demonstrate the token layer works.

## Phase 2 — Minimal component primitives (incremental adoption)

5. Define a “Primitive Set” (3–6 components)
   - Implement or harden the primitives that are most reused and currently inconsistent:
     - Button (variants, sizes)
     - Input (label + error + help text)
     - Card (title/content/actions)
     - Alert (success/warn/error/info)
     - EmptyState (already in scope)
     - (Optional) Badge
   - Each must have:
     - consistent spacing/typography using tokens
     - accessibility semantics
     - unit tests (rendering, variants, a11y basics)

6. Adopt primitives in key routes
   - Update at least two high-traffic pages to use the primitives consistently:
     - Home (or Setup)
     - Settings/Integration/Import route
   - Keep diffs tight and reviewable.

## Phase 3 — Cross-surface validation (no forced migration)

7. Conductor UI compatibility check
   - Identify 1–2 shared patterns between apps/web and conductor-ui (buttons, cards, alerts).
   - If feasible with minimal risk, add the same tokens.css (or a subset) to conductor-ui and switch only one component to use it.
   - If not feasible, document the delta and stop.

8. Client surface “bridge” (optional, only if trivial)
   - If client/ uses MUI theme: add a small mapping doc showing how token semantics correspond to MUI theme keys (no code required unless extremely small).

## Constraints

- Do not introduce a new UI framework or a new component library.
- Do not change global repo tooling or lockfiles unless strictly necessary.
- No broad refactors; this is an incremental consistency layer.
- No TODOs or placeholders.

## Required output format

1. Short plan with exact file paths to be touched.
2. Implementation with crisp commit messages.
3. PR-ready summary including:
   - what tokens were introduced
   - what primitives were added/hardened
   - where primitives were adopted
   - how to test locally (commands)
   - what tests were added
