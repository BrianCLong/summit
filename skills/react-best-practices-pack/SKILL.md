---
name: react-best-practices-pack
version: 1.0.0
description: |
  Summit/IntelGraph React and Next.js performance optimization skill pack.
  Routes to the vendored Vercel React Best Practices for high-quality
  recommendations during coding and code reviews.
tags:
  - react
  - nextjs
  - performance
  - optimization
  - ga-readiness
license: MIT
dependencies:
  - skills/vendor/vercel-labs-agent-skills
---

# React Best Practices Pack (Summit)

## Purpose

This pack integrates the upstream “Vercel React Best Practices” library
as a vendored dependency and provides **routing rules** for agents to apply
performance-first patterns when working on the Summit frontend.

**Upstream location (vendored):**
`skills/vendor/vercel-labs-agent-skills/skills/react-best-practices/`

## Operating Rules (Summit-specific)

1. **Performance First**
   - Always prioritize "Critical" and "High" impact rules from the upstream guide.
   - For any React component change, check for waterfalls (`async-parallel`) and
     unnecessary re-renders (`rerender-memo`).

2. **Atomic UI Changes**
   - Keep UI components focused and small.
   - Extract expensive logic into hooks or memoized components as per `rerender-memo`.

3. **Evidence & Verification**
   - When applying a performance optimization, describe the expected impact.
   - If possible, provide a manual verification step (e.g., "Check DevTools for reduced re-renders").

## Routing Heuristics (when to consult upstream)

Use the upstream library when you see:

- New React components or Next.js pages being created.
- Data fetching logic in `useEffect` or Server Components.
- Large bundle size concerns or heavy third-party library usage.
- Slow UI interactions or visible "flicker" during hydration.
- Refactoring existing frontend code.

## How to Load Upstream Rules (agent procedure)

1. **Identify the relevant category:**
   - Look in: `skills/vendor/vercel-labs-agent-skills/skills/react-best-practices/rules/`
   - Categories: `async-`, `bundle-`, `server-`, `client-`, `rerender-`, `rendering-`, `js-`, `advanced-`.

2. **Read the rule:**
   - Choose the specific rule(s) that apply to the current task.
   - Read the corresponding `.md` file in the `rules/` directory.

3. **Apply and explain:**
   - Apply the pattern to the code.
   - Briefly mention which rule was applied in the PR description or comment.

## Common "First Picks" for Summit

- `async-parallel`: Parallelize data fetching.
- `bundle-barrel-imports`: Avoid heavy barrel files.
- `rerender-memo`: Prevent expensive re-renders.
- `server-cache-react`: Deduplicate per-request fetches.
