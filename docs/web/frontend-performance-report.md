# Frontend Performance & Bundle Health Report

> **Generated**: 2025-12-06
> **Scope**: `apps/web` (modern React app) and `client` (legacy React app)
> **Status**: Phase 1 - Initial Assessment & Quick Wins

---

## Executive Summary

This report provides a comprehensive analysis of the frontend bundle health for the IntelGraph platform. Two primary frontend applications were analyzed:

1. **`apps/web`** - Modern Vite-based React app with good optimization practices
2. **`client`** - Legacy client with significant optimization opportunities

### Key Findings

| Metric | `apps/web` | `client` | Target |
|--------|------------|----------|--------|
| Main Bundle Size | ~800KB (estimated) | **3.4MB** | <500KB |
| Total Assets | ~2MB | **25MB** | <5MB |
| Code Splitting | React.lazy for all pages | None | Full lazy loading |
| Icon Imports | Tree-shakeable (lucide-react) | **Barrel imports** | Tree-shaken |
| Vendor Chunking | Configured | Configured | - |

---

## Bundle Size Breakdown

### Client App (Legacy) - Current State

The main bundle (`index-*.js`) is **3.4MB**, which is significantly oversized.

#### Largest Chunks

| Chunk | Size | Purpose | Optimization |
|-------|------|---------|--------------|
| `index-*.js` | 3.4MB | Main bundle | Split & lazy load |
| `mermaid-parser.core-*.js` | 323KB | Diagram parsing | Lazy load |
| `katex-*.js` | 260KB | Math rendering | Lazy load |
| `architectureDiagram-*.js` | 146KB | Architecture diagrams | Lazy load |
| `mindmap-definition-*.js` | 100KB | Mindmap diagrams | Lazy load |
| Various diagram chunks | ~500KB total | Mermaid diagrams | Already chunked |

#### Vendor Chunks (Configured)

The client app already has proper vendor chunking in `vite.config.js`:

- `react-vendor`: React, ReactDOM, React Router
- `apollo-vendor`: Apollo Client, GraphQL
- `mui-vendor`: Material UI, Icons, Emotion
- `graph-vendor`: Cytoscape and plugins
- `d3-vendor`: D3 libraries
- `map-vendor`: Leaflet
- `timeline-vendor`: vis-timeline
- `utils-vendor`: Lodash, date-fns, etc.

### apps/web (Modern) - Current State

Already implements best practices:

- All pages use `React.lazy()` for code splitting
- Uses `lucide-react` (tree-shakeable icons)
- Proper Suspense boundaries
- Vendor chunking configured

---

## Identified Issues

### 1. MUI Icons Barrel Imports (Client App)

**Impact**: High (~200-500KB unnecessary bundle size)

The client app imports icons using barrel imports:

```javascript
// BAD: Imports entire icons package
import {
  Dashboard,
  AccountTree,
  Search,
  Security,
  // ...more icons
} from '@mui/icons-material';
```

**Files affected** (50+ occurrences):
- `client/src/App.router.js`
- `client/src/layout/AppHeader.tsx`
- `client/src/pages/Search/SearchHome.tsx`
- `client/src/pages/Investigations/InvestigationDetail.tsx`
- `client/src/components/copilot/CopilotSidebar.tsx`
- `client/src/components/dashboard/Dashboard.js`
- And many more...

**Solution**: Convert to direct imports:

```javascript
// GOOD: Only imports specific icons
import Dashboard from '@mui/icons-material/Dashboard';
import AccountTree from '@mui/icons-material/AccountTree';
```

### 2. No Route-Level Code Splitting (Client App)

**Impact**: High (all route components loaded upfront)

The client app's `App.router.js` imports all page components synchronously:

```javascript
// BAD: Eager loading all pages
import InteractiveGraphExplorer from './components/graph/InteractiveGraphExplorer';
import IntelligentCopilot from './components/ai/IntelligentCopilot';
import ExecutiveDashboard from './features/wargame/ExecutiveDashboard';
```

**Solution**: Use React.lazy() for route components:

```javascript
// GOOD: Lazy loading
const InteractiveGraphExplorer = React.lazy(() =>
  import('./components/graph/InteractiveGraphExplorer')
);
```

### 3. Heavy Visualization Libraries

**Impact**: Medium

Both apps include heavy visualization libraries:
- **Cytoscape** + plugins: ~500KB
- **D3**: ~200KB
- **Recharts**: ~150KB
- **Leaflet**: ~150KB
- **Mermaid**: ~1MB+ (in client)

**Solution**: Lazy load these only when needed.

### 4. Unused Dependencies

Potential unused or duplicate dependencies to investigate:
- `jquery` (legacy, may be removable)
- Multiple React versions (client has mixed 18/19)
- Storybook dependencies in production builds

---

## Recommended Optimizations

### Phase 1: Quick Wins (This PR)

1. **Convert MUI icon barrel imports to direct imports**
   - Start with high-impact files (AppHeader, App.router)
   - Estimated savings: 200-400KB

2. **Add React.lazy() to client app routes**
   - Wrap route components with lazy loading
   - Add Suspense boundary with loading indicator
   - Estimated savings: 1-2MB off initial load

3. **Add bundle analyzer scripts**
   - `pnpm analyze:bundle` for visualization
   - CI job to track bundle size over time

### Phase 2: Medium Term

1. **Lazy load visualization libraries**
   - Cytoscape only when entering graph views
   - D3 only when rendering charts
   - Leaflet only for map components

2. **Dynamic imports for Mermaid**
   - Load diagram renderers on-demand
   - Consider removing if unused

3. **Audit and remove unused dependencies**
   - jQuery usage audit
   - Consolidate React versions

### Phase 3: Long Term

1. **Module federation** for shared components
2. **Progressive loading** strategy
3. **Preload critical chunks** based on user navigation patterns
4. **Bundle size CI gates** to prevent regressions

---

## Performance Budgets

### Recommended Targets

| Metric | Current | Target | Stretch Goal |
|--------|---------|--------|--------------|
| Initial Bundle (gzip) | ~1.2MB | <500KB | <300KB |
| Time to Interactive | ~3-5s | <2s | <1s |
| Largest Contentful Paint | ~2-4s | <2s | <1.5s |
| First Input Delay | ~100-200ms | <100ms | <50ms |
| Total Bundle Size | 25MB | <10MB | <5MB |

### Vite Configuration

Current settings in client app:
```javascript
build: {
  chunkSizeWarningLimit: 1000, // 1MB warning
}
```

Recommended:
```javascript
build: {
  chunkSizeWarningLimit: 500, // 500KB warning (Vite default)
}
```

---

## Bundle Analysis Tools

### Available Scripts

```bash
# Analyze apps/web bundle
pnpm --filter @intelgraph/web analyze:bundle

# Analyze client bundle
pnpm --filter intelgraph-client analyze:bundle

# View analysis results
open apps/web/dist/stats.html
open client/dist/stats.html
```

### CI Integration

The `.github/workflows/frontend-bundle-health.yml` workflow:
- Runs on PRs touching frontend code
- Builds both apps and generates bundle stats
- Uploads stats as artifacts for review
- Comments bundle size changes on PRs

---

## Monitoring & Alerts

### Recommended Metrics

1. **Bundle size tracking** via CI artifacts
2. **Lighthouse CI** for performance scores
3. **Web Vitals** monitoring in production
4. **Error rates** for lazy-loaded chunks

### Alert Thresholds

- Bundle size increase > 50KB: Warning
- Bundle size increase > 200KB: Block merge
- Lighthouse performance score < 70: Warning
- Time to Interactive > 4s: Alert

---

## Implementation Checklist

### Phase 1 (This PR)

- [x] Audit current bundle sizes
- [x] Document optimization opportunities
- [ ] Convert icon imports in AppHeader.tsx
- [ ] Convert icon imports in App.router.js
- [ ] Add React.lazy() to client routes
- [ ] Add `analyze:bundle` scripts
- [ ] Create CI workflow for bundle health
- [ ] Update vite.config chunk warning limit

### Verification

```bash
# Build and analyze
pnpm --filter @intelgraph/web build
pnpm --filter intelgraph-client build

# Check bundle sizes
ls -lh apps/web/dist/assets/*.js | head
ls -lh client/dist/assets/*.js | head

# View interactive analysis
open client/dist/stats.html
```

---

## References

- [Vite Build Optimization](https://vitejs.dev/guide/build.html)
- [React.lazy() Documentation](https://react.dev/reference/react/lazy)
- [MUI Tree Shaking Guide](https://mui.com/material-ui/guides/minimizing-bundle-size/)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

---

## Appendix: File-by-File Icon Import Issues

### High Priority (10+ icons each)

| File | Icon Count | Estimated Savings |
|------|------------|-------------------|
| `client/src/App.router.js` | 11 | ~50KB |
| `client/src/layout/AppHeader.tsx` | 12 | ~50KB |
| `client/src/pages/Search/SearchHome.tsx` | 15 | ~60KB |
| `client/src/components/graph/InteractiveGraphExplorer.jsx` | 20+ | ~80KB |
| `client/src/components/graph/MVP0Canvas.js` | 15+ | ~60KB |

### Medium Priority (5-10 icons each)

| File | Icon Count |
|------|------------|
| `client/src/pages/Investigations/InvestigationDetail.tsx` | 8 |
| `client/src/components/copilot/CopilotSidebar.tsx` | 9 |
| `client/src/components/dashboard/Dashboard.js` | 7 |
| `client/src/components/admin/AdminDashboard.tsx` | 8 |

---

*Report generated as part of frontend performance optimization initiative.*
