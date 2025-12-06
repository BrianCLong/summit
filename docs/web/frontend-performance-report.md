# Frontend Performance Report

> **Date**: 2025-12-06
> **Package**: @intelgraph/web
> **Build Tool**: Vite 7.x with Rollup

## Executive Summary

This report analyzes the bundle health of the IntelGraph web application and identifies optimization opportunities. The analysis focuses on:
- Heavy dependencies that impact initial load time
- Code splitting opportunities
- Unused or underutilized dependencies
- Bundle size reduction strategies

## Current Bundle Architecture

### Build Configuration

The project uses Vite with the following chunk configuration:

| Chunk Name | Contents | Estimated Size |
|------------|----------|----------------|
| `react-vendor` | react, react-dom, react-router-dom | ~150KB |
| `data-vendor` | @apollo/client, graphql, graphql-ws, @tanstack/react-query | ~180KB |
| `ui-vendor` | Radix UI components, lucide-react, @heroicons/react | ~100KB |
| `state-vendor` | zustand, react-hook-form, zod | ~50KB |
| `viz-vendor` | d3, recharts | ~400KB |
| `animation-vendor` | framer-motion | ~120KB |
| `utils-vendor` | lodash, clsx, tailwind-merge | ~80KB |

**Total Vendor Chunks**: ~1.1MB (uncompressed)

### Current Optimizations

- Route-level code splitting via React.lazy (all pages lazy loaded)
- Vendor chunking configured in vite.config.ts
- Bundle analyzer (rollup-plugin-visualizer) enabled
- Console.log stripping in production builds

## Issues Identified

### Critical: D3 Star Import (~300KB)

**Location**: `apps/web/src/graphs/GraphCanvas.tsx:2`

```typescript
import * as d3 from 'd3'  // Imports ALL of D3
```

**Impact**: D3 is a large library (~300KB) and the current star import prevents tree-shaking. The component only uses:
- `d3-selection` (~20KB)
- `d3-force` (~15KB)
- `d3-zoom` (~10KB)
- `d3-drag` (~10KB)

**Estimated Savings**: ~245KB (81% reduction in D3 footprint)

**Recommendation**: Use selective imports:
```typescript
import { select } from 'd3-selection'
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceRadial, forceX, forceY } from 'd3-force'
import { zoom } from 'd3-zoom'
import { drag } from 'd3-drag'
```

### High: jQuery Dependency (~90KB)

**Files using jQuery** (15 files):
- `src/features/geospatial/GeospatialPanel.tsx`
- `src/features/RunbookPlanner.tsx`
- `src/components/PluginCatalog.tsx`
- `src/features/collab-widget/CollabWidget.tsx`
- `src/features/algos-widget/AlgosWidget.tsx`
- `src/features/federated-search/FederatedSearch.tsx`
- `src/features/workflow/WorkflowPanel.tsx`
- `src/features/history/HistoryControls.tsx`
- `src/features/ModelMatrix.tsx`
- `src/features/focusMode/bindings.ts`
- `src/components/MaestroBuildHUD.tsx`
- `src/features/redaction/redaction.js`
- `src/components/SchedulerBoard.tsx`
- `src/integrations/graph-focus-bridge.ts`

**Impact**: jQuery is a legacy dependency adding ~90KB. Most usages are simple DOM operations that can be replaced with native APIs.

**Recommendation**:
- Phase 1: Ensure all jQuery-using components are lazy-loaded
- Phase 2: Migrate to native DOM APIs or React refs

### Medium: MUI in Legacy Components (~200KB)

**Files using @mui/material** (13 files):
- `src/pages/AdminDashboard.tsx`
- `src/components/admin/DashboardOverview.tsx`
- `src/components/admin/UserManagement.tsx`
- `src/features/algos-widget/AlgosWidget.tsx`
- `src/features/collab-widget/CollabWidget.tsx`
- `src/features/ExplainRouteDrawer.tsx`
- `src/features/focusMode/PolicyChips.tsx`
- `src/features/geospatial/GeospatialPanel.tsx`
- `src/features/ModelMatrix.tsx`
- `src/features/RunbookPlanner.tsx`
- `src/features/workflow/WorkflowPanel.tsx`
- `src/theme.ts`

**Impact**: MUI is not in the main dependencies but is imported in legacy feature components. This adds ~200KB if these components are included in the main bundle.

**Recommendation**:
- Ensure MUI-using components are lazy-loaded
- Consider migrating to Radix/Tailwind for consistency

### Medium: Recharts Re-export in UI Barrel

**Location**: `apps/web/src/components/ui/index.ts:53-68`

```typescript
export { ResponsiveContainer, BarChart, Bar, ... } from 'recharts'
```

**Impact**: Re-exporting recharts from the UI barrel can cause the entire recharts library (~120KB) to be included when any UI component is imported.

**Recommendation**: Remove recharts re-exports from UI barrel. Import directly where needed.

### Low: Framer Motion May Be Unused

**Observation**: `framer-motion` is in vendor chunks (~120KB) but no direct imports found in source code.

**Recommendation**: Verify usage and remove if unused.

## Bundle Size Targets

### Performance Budget

| Metric | Current (Est.) | Target | Status |
|--------|----------------|--------|--------|
| Initial JS | ~600KB | 400KB | Needs work |
| Largest Chunk | ~400KB (viz) | 200KB | Needs work |
| LCP | Unknown | <2.5s | TBD |
| TTI | Unknown | <3.5s | TBD |

### Chunk Size Limits

Per `vite.config.ts`, the warning limit is 800KB. Recommended targets:

| Chunk | Current Limit | Recommended |
|-------|--------------|-------------|
| Main entry | 800KB | 200KB |
| Route chunks | 800KB | 150KB |
| Vendor chunks | 800KB | 250KB |

## Optimization Recommendations

### Immediate Actions (Phase 1)

1. **Fix D3 Star Import**
   - Convert `import * as d3` to selective imports
   - Estimated savings: 245KB

2. **Remove Recharts from UI Barrel**
   - Delete recharts re-exports from `components/ui/index.ts`
   - Import recharts directly in chart components

3. **Add Bundle Analysis Script**
   - Add `analyze:bundle` npm script
   - Generate stats on each build

4. **Lazy Load Heavy Feature Components**
   - Wrap GraphCanvas in Suspense boundary
   - Lazy load MapPane and TimelineRail

### Short-term Actions (Phase 2)

1. **jQuery Migration Planning**
   - Audit jQuery usage patterns
   - Create migration tickets for each file
   - Prioritize by usage frequency

2. **MUI Consolidation**
   - Migrate remaining MUI components to Radix/Tailwind
   - Remove MUI from dependencies

3. **Verify Framer Motion Usage**
   - Search for motion imports
   - Remove if unused, or lazy-load if used

### Monitoring & CI Integration

1. **Bundle Size CI Check**
   - Add workflow to track bundle size changes
   - Alert on >5% size increases

2. **Performance Budgets**
   - Add lighthouse CI integration
   - Set budgets for LCP, TTI, CLS

## Appendix: Package Size Reference

| Package | Minified Size | Gzipped |
|---------|--------------|---------|
| react | 8KB | 3KB |
| react-dom | 130KB | 42KB |
| d3 (full) | 290KB | 95KB |
| d3-force | 15KB | 5KB |
| recharts | 120KB | 40KB |
| framer-motion | 115KB | 35KB |
| @apollo/client | 150KB | 45KB |
| jquery | 87KB | 30KB |
| @mui/material | 200KB+ | 60KB+ |

## Next Steps

1. Implement Phase 1 optimizations (this PR)
2. Set up bundle monitoring CI
3. Create tickets for Phase 2 work
4. Establish performance testing baseline
