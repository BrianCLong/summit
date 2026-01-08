# Frontend Performance Report

**Generated**: 2024-12-06 **Author**: Claude (Automated Performance Analysis) **Target App**:
`apps/web` (@intelgraph/web)

---

## Executive Summary

This report documents the frontend bundle analysis and performance optimization recommendations for
the IntelGraph web application. The analysis identified several opportunities for bundle size
reduction and improved loading performance.

### Key Findings

1. **D3.js Library** - Full D3 library imported (~500KB) when only specific modules are needed
2. **Apollo Client 4.x** - Import structure needed updates for React compatibility
3. **Tailwind CSS** - Configuration needed updates for v4 compatibility
4. **Code Splitting** - Already well-implemented with React.lazy() for pages

### Actions Taken

| Optimization                      | Estimated Impact    | Status      |
| --------------------------------- | ------------------- | ----------- |
| D3 tree-shaking (modular imports) | ~350KB reduction    | Implemented |
| Apollo Client 4 import fixes      | Build compatibility | Implemented |
| Tailwind CSS v4 migration         | Build compatibility | Implemented |
| Bundle analyzer script            | Monitoring          | Implemented |
| CI bundle health workflow         | Monitoring          | Implemented |

---

## Bundle Size Breakdown

### Current Architecture

The app uses **Vite** with **Rollup** for bundling, with manual chunk splitting configured in
`vite.config.ts`:

```javascript
manualChunks: {
  'react-vendor': ['react', 'react-dom', 'react-router-dom'],
  'data-vendor': ['@apollo/client', 'graphql', 'graphql-ws', '@tanstack/react-query'],
  'ui-vendor': ['@headlessui/react', '@heroicons/react', '@radix-ui/*', 'lucide-react'],
  'state-vendor': ['zustand', 'react-hook-form', '@hookform/resolvers', 'zod'],
  'viz-vendor': ['d3', 'recharts'],
  'animation-vendor': ['framer-motion'],
  'utils-vendor': ['lodash', 'clsx', 'tailwind-merge', 'immer'],
}
```

### Major Dependencies by Size (Estimated)

| Package           | Estimated Size (gzipped) | Notes                    |
| ----------------- | ------------------------ | ------------------------ |
| D3 (full)         | ~150KB                   | Tree-shaking now enabled |
| Recharts          | ~80KB                    | Used for charts/graphs   |
| Framer Motion     | ~50KB                    | Animation library        |
| Apollo Client     | ~45KB                    | GraphQL client           |
| React + React-DOM | ~40KB                    | Core framework           |
| Lodash            | ~25KB                    | Utility library          |
| Zod               | ~15KB                    | Validation library       |
| Zustand           | ~5KB                     | State management         |

### D3 Optimization Details

**Before**: Full D3 import

```javascript
import * as d3 from "d3";
```

**After**: Tree-shaken modular imports

```javascript
import { select } from "d3-selection";
import { forceSimulation, forceLink, forceManyBody, forceCenter } from "d3-force";
import { zoom } from "d3-zoom";
import { drag } from "d3-drag";
```

**Impact**: Reduces D3 bundle from ~500KB to ~80KB (only imports used modules)

---

## Code Splitting Analysis

### Lazy-Loaded Routes (Already Implemented)

The app correctly uses `React.lazy()` for all page-level components:

```javascript
const HomePage = React.lazy(() => import("@/pages/HomePage"));
const ExplorePage = React.lazy(() => import("@/pages/ExplorePage"));
const AlertsPage = React.lazy(() => import("@/pages/AlertsPage"));
const CasesPage = React.lazy(() => import("@/pages/CasesPage"));
const AdminPage = React.lazy(() => import("@/pages/AdminPage"));
// ... and more
```

### Additional Lazy Loading Opportunities

| Component         | Location             | Reason                                    |
| ----------------- | -------------------- | ----------------------------------------- |
| `GraphCanvas`     | Heavy D3 usage       | Consider lazy loading for non-graph pages |
| Admin components  | `components/admin/*` | Admin-only, could be split further        |
| Tri-Pane features | `features/triPane/*` | Complex feature, good split candidate     |

---

## Performance Budgets

### Recommended Limits

| Metric            | Target | Warning | Critical |
| ----------------- | ------ | ------- | -------- |
| Initial JS Bundle | <200KB | 300KB   | 500KB    |
| Vendor Bundle     | <500KB | 800KB   | 1.5MB    |
| Total JS          | <1MB   | 1.5MB   | 2MB      |
| LCP               | <2.5s  | 4s      | 6s       |
| FID               | <100ms | 300ms   | 500ms    |
| CLS               | <0.1   | 0.25    | 0.5      |

### Current Status

The app has `chunkSizeWarningLimit: 800` (KB) configured in Vite, which will warn when any chunk
exceeds this size.

---

## Suggested Optimizations

### High Priority (Implemented)

1. **D3 Tree-shaking** - Use modular D3 imports
   - Status: DONE
   - Impact: ~350KB reduction

2. **Apollo Client React imports** - Fix import paths for v4
   - Status: DONE
   - Impact: Build compatibility

### Medium Priority (Recommended)

1. **Remove jQuery dependency**
   - Current: `"jquery": "^3.7.1"` in dependencies
   - Recommendation: Replace with native DOM APIs or remove if unused
   - Impact: ~30KB reduction

2. **Lazy load heavy visualization components**

   ```javascript
   const GraphCanvas = React.lazy(() => import("@/graphs/GraphCanvas"));
   ```

3. **Dynamic imports for admin features**
   - Load admin components only for admin users
   - Use route-based code splitting

### Low Priority (Future)

1. **Consider lighter alternatives**
   - `date-fns` instead of moment.js (already using date-fns)
   - `preact` instead of React for smaller bundle (major change)

2. **Image optimization**
   - Ensure images are lazy-loaded
   - Use modern formats (WebP, AVIF)
   - Implement responsive images

3. **Font optimization**
   - Use `font-display: swap`
   - Subset fonts to used characters

---

## Monitoring & Tooling

### Bundle Analyzer

Run the bundle analyzer to visualize the bundle composition:

```bash
cd apps/web
pnpm build:analyze
# Opens dist/stats.html with interactive treemap
```

### CI Integration

The `frontend-bundle-health.yml` workflow:

- Runs on PRs affecting frontend code
- Uploads bundle stats as artifacts
- Warns when bundles exceed size limits
- Generates summary in GitHub Actions

### Manual Analysis

```bash
# Build and check sizes
pnpm build

# Check chunk sizes
ls -lh dist/assets/*.js

# Analyze with source-map-explorer (if sourcemaps enabled)
npx source-map-explorer dist/assets/*.js
```

---

## Performance Testing

### Recommended Tools

1. **Lighthouse** - Overall performance audit
2. **WebPageTest** - Real-world loading analysis
3. **Chrome DevTools** - Network and performance profiling
4. **Bundle Analyzer** - Dependency size analysis

### Key Metrics to Track

- **First Contentful Paint (FCP)**: Target < 1.8s
- **Largest Contentful Paint (LCP)**: Target < 2.5s
- **Time to Interactive (TTI)**: Target < 3.8s
- **Total Blocking Time (TBT)**: Target < 200ms

---

## Appendix

### Files Modified

1. `apps/web/src/graphs/GraphCanvas.tsx` - D3 tree-shaking
2. `apps/web/src/App.tsx` - Apollo Client import fix
3. `apps/web/src/hooks/useExplainView.ts` - Apollo Client import fix
4. `apps/web/src/components/admin/UserManagement.tsx` - Apollo Client import fix
5. `apps/web/src/pages/AdminDashboard.tsx` - Apollo Client import fix
6. `apps/web/src/index.css` - Tailwind CSS v4 migration
7. `apps/web/package.json` - Added D3 submodules, analyzer script
8. `apps/web/vite.config.ts` - Already configured with visualizer
9. `.github/workflows/frontend-bundle-health.yml` - New CI workflow

### Dependencies Added

```json
{
  "d3-drag": "^3.0.0",
  "d3-force": "^3.0.0",
  "d3-selection": "^3.0.0",
  "d3-zoom": "^3.0.0"
}
```

### Scripts Added

```json
{
  "build:analyze": "ANALYZE=true vite build && echo '\\n Bundle analysis available at dist/stats.html'"
}
```

---

## Next Steps

1. Run full build to verify all changes
2. Test lazy-loaded routes for proper loading
3. Monitor bundle sizes in CI
4. Consider removing unused dependencies (jQuery)
5. Implement additional lazy loading for heavy components
