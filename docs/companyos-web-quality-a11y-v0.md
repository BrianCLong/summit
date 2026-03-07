# CompanyOS Web Quality & A11y v0

This document codifies the initial performance, accessibility, and robustness standards for CompanyOS web surfaces. It defines metrics, budgets, tooling, and release checklists to make every surface fast, inclusive, and resilient.

## 1. Performance model

### Core metrics

- **Time to First Byte (TTFB)**: <200 ms origin target; <400 ms edge-cached.
- **Largest Contentful Paint (LCP)**: <2.5 s P75 on broadband/desktop; <3.0 s P75 on 4G/mobile.
- **First Input Delay (FID) / Interaction to Next Paint (INP)**: FID <100 ms; INP <200 ms P75.
- **Cumulative Layout Shift (CLS)**: <0.1 P75.
- **Time to Interactive (TTI)**: <3.5 s desktop; <4.5 s mobile on mid-tier hardware.

### Budgets by surface type

- **Dashboards (data-heavy, read-mostly)**: LCP ≤2.8 s (desktop), ≤3.2 s (mobile); main bundle ≤250 KB gzipped; async data fetches ≤2 round-trips before paint; idle CPU work ≤50 ms per frame.
- **Forms & workflows (multi-step)**: LCP ≤2.5 s; inter-step transition ≤150 ms; input latency ≤50 ms; JS budget ≤200 KB gzipped; validation feedback ≤100 ms.
- **Control panels/settings (low data, more chrome)**: LCP ≤2.2 s; CLS ~0; JS budget ≤150 KB gzipped; idle CPU ≤20 ms per frame; nav-to-interactive ≤2.5 s.

### Loading & delivery strategies

- **Code-splitting**: route-level and above-the-fold component splits; lazy-load infrequently used widgets; prefer dynamic import with prefetch hints for likely-next routes.
- **Caching**: immutable fingerprinted assets with 1y cache; HTML no-store; API GETs cacheable when safe with ETag/Last-Modified; SW cache for shell + icon sprites; memoize expensive selectors.
- **Critical path**: inline critical CSS for above-the-fold; defer non-critical JS; preload hero media; use responsive images (`srcset`, `sizes`, `loading="lazy"` off-screen); avoid render-blocking third parties.
- **Data & network**: prioritize HTTP/2 multiplexing; coalesce requests; enable gzip/brotli; use CDN edge caching; backpressure polling; stream large payloads.
- **Resilience**: graceful degradation if JS disabled (read-only fallback), circuit breakers for slow APIs, skeletons/shimmers with min-height to prevent CLS.

## 2. Accessibility & usability standards

### Target and scope

- **WCAG 2.1 AA** baseline; AAA where feasible for critical flows (auth, payments, account recovery).
- Supports keyboard-only, screen readers, and reduced-motion preferences across desktop/mobile.

### Core expectations

- **Semantic HTML first**: headings in order, lists for collections, buttons for actions, links for navigation; use `<label>` for all inputs.
- **Keyboard navigation**: tabbable order follows visual flow; skip-to-content link; focus visible always; roving tabindex for composite widgets; no keyboard traps.
- **Focus management**: programmatic focus on route changes and modal/dialog open; return focus on close; announce dynamic updates with `aria-live` where meaningful.
- **Color & motion**: contrast ratios ≥4.5:1 for text, 3:1 for UI icons; provide focus states not relying on color alone; respect `prefers-reduced-motion` with toned-down animations and optional disable for auto-playing media.
- **Forms**: associated labels, described-by for hints/errors, clear required indicators, inline validation with non-color cues, error summaries at submit.
- **Components**: dialogs use ARIA modal patterns; custom selects/lists implement `aria-activedescendant`; tooltips are hover/focus accessible; tables use `<th scope>` and captions when complex.
- **Media**: captions for video, transcripts for audio, alt text for images, pause/stop controls for animations over 5s.

## 3. Tooling & enforcement

### Linting & static checks

- Enable `eslint-plugin-jsx-a11y` with blocking rules for ARIA misuse, missing alt text, and focusable controls; prefer ESLint performance rules (no unused deps, no inline functions in hot paths when avoidable).
- Stylelint for focus outline preservation and prefers-reduced-motion support in CSS.
- Type-driven props for components to enforce semantic element choices and required `aria-*` props.

### CI gates

- **Perf budgets**: Lighthouse CI per key route with JSON assertions on LCP/CLS/INP, bundle size limits via `bundlesize` or `@size-limit/preset-app` matching budgets above.
- **A11y**: `axe-core` or `pa11y` CI runs on representative pages; fail on WCAG 2.1 AA violations; snapshot ARIA tree for critical dialogs.
- **Lint/tests**: ESLint + TypeScript + unit tests required; optional Playwright a11y smoke per release branch.

### Local dev tooling

- `npm run lint:a11y` alias for jsx-a11y rules; `npm run check:perf` to run Lighthouse locally against `localhost` with throttling preset.
- Storybook a11y addon + interactions for keyboard flows; component docs include accessible usage notes.
- React Profiler + Web Vitals overlay for new features; bundle analyzer available via `npm run analyze`.

### Production monitoring

- Web Vitals (TTFB, LCP, CLS, INP, TTI) sampled via RUM with P75 and P95 alert thresholds aligned to budgets; alert if regression >10% week-over-week.
- Synthetic checks per release for auth, dashboard, and forms routes; alert on LCP >3.5 s or INP >250 ms.
- Error budgets: JS error rate <1% of sessions; accessibility regressions tracked via periodic `axe` synthetic scans.

## 4. Artifacts

### CompanyOS Web Quality & A11y v0 outline

- Performance model (metrics, budgets, loading strategies).
- Accessibility standards (WCAG target, semantic and interaction expectations).
- Tooling/enforcement (lint, CI, local dev, monitoring).
- Checklists and production-readiness gates.

### Example performance checklist for a new screen

- Define surface type (dashboard/form/control panel) and adopt matching budgets.
- Validate bundle size vs budget with `npm run analyze`.
- Run throttled Lighthouse: LCP/CLS/INP/TTI within budgets; filmstrip shows no blocking third parties.
- Verify critical path: preloaded hero assets, inlined critical CSS, lazy off-screen images, no layout jumps.
- Confirm data fetch strategy: cacheable GETs, minimal round-trips, skeletons sized to final layout.

### Example accessibility checklist for a new screen

- Keyboard tab order matches UI; skip link works; no traps; focus visible.
- All controls use semantic elements with labels; ARIA only when necessary and valid.
- Dialogs/sheets manage focus correctly and announce open/close; return focus on dismiss.
- Forms expose errors via text + `aria-describedby`; required fields marked accessibly; inline validation announced.
- Respect user preferences: `prefers-reduced-motion`, reduced-color-dependence, sufficient contrast.

### "UI is production-grade if…" checklist

- Meets surface-specific performance budgets in CI and last 7 days of RUM.
- No critical WCAG 2.1 AA violations in CI scans; manual keyboard/screen reader smoke passes.
- Core journeys covered by synthetic perf + a11y monitors with alerting configured.
- Bundles analyzed and code-splitting landed for large features; third-party scripts audited and deferred.
- Error states, loading, and offline fallbacks implemented; JS errors below budget and tracked.
