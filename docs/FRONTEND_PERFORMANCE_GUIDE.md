# Frontend Performance Best Practices Guide

> **Last Updated**: 2025-11-20
> **Purpose**: Comprehensive guide for optimizing React application performance in the Summit/IntelGraph platform

## Table of Contents

1. [Overview](#overview)
2. [Code Splitting & Lazy Loading](#code-splitting--lazy-loading)
3. [Component Optimization](#component-optimization)
4. [Context API Performance](#context-api-performance)
5. [GraphQL Query Optimization](#graphql-query-optimization)
6. [Bundle Size Optimization](#bundle-size-optimization)
7. [Performance Monitoring](#performance-monitoring)
8. [Common Anti-Patterns](#common-anti-patterns)
9. [Performance Checklist](#performance-checklist)

---

## Overview

### Performance Goals

- **Initial Bundle Size**: < 500KB gzipped for critical path
- **Time to Interactive (TTI)**: < 3 seconds on 3G
- **First Contentful Paint (FCP)**: < 1.5 seconds
- **Largest Contentful Paint (LCP)**: < 2.5 seconds
- **Cumulative Layout Shift (CLS)**: < 0.1
- **First Input Delay (FID)**: < 100ms

### Key Principles

1. **Lazy load everything not immediately needed**
2. **Memoize expensive computations and callbacks**
3. **Minimize re-renders with React.memo**
4. **Split vendor bundles for better caching**
5. **Monitor performance with Web Vitals**

---

## Code Splitting & Lazy Loading

### Route-Based Code Splitting

**❌ Bad**: Loading all routes eagerly

```typescript
// DON'T: This loads all pages on initial load
import HomePage from '@/pages/HomePage'
import ExplorePage from '@/pages/ExplorePage'
import AlertsPage from '@/pages/AlertsPage'
```

**✅ Good**: Lazy load routes

```typescript
// DO: Lazy load pages for better initial load
const HomePage = React.lazy(() => import('@/pages/HomePage'))
const ExplorePage = React.lazy(() => import('@/pages/ExplorePage'))
const AlertsPage = React.lazy(() => import('@/pages/AlertsPage'))

function App() {
  return (
    <React.Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/alerts" element={<AlertsPage />} />
      </Routes>
    </React.Suspense>
  )
}
```

### Component-Level Code Splitting

**Heavy components** (graphs, maps, charts) should be lazy loaded:

```typescript
// Lazy load heavy visualization components
const GraphExplorer = React.lazy(
  () => import('@/components/graph/GraphExplorer')
)
const GeoMapPanel = React.lazy(() => import('@/components/geoint/GeoMapPanel'))
const TimelineView = React.lazy(
  () => import('@/features/timeline/TimelineView')
)

function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Only load graph when user expands this section */}
      {showGraph && (
        <React.Suspense fallback={<Skeleton height={400} />}>
          <GraphExplorer />
        </React.Suspense>
      )}
    </div>
  )
}
```

### Library Code Splitting

**Heavy libraries** (D3, Cytoscape, Leaflet) should be dynamically imported:

```typescript
// ❌ Bad: Eager import of heavy library
import * as d3 from 'd3'

// ✅ Good: Dynamic import when needed
function TimelineChart() {
  const [d3, setD3] = useState(null)

  useEffect(() => {
    import('d3').then((d3Module) => {
      setD3(d3Module)
    })
  }, [])

  if (!d3) return <LoadingSpinner />

  // Use d3 here...
}
```

**Even better**: Import only needed modules

```typescript
// ✅ Best: Import only what you need
import { scaleTime, scaleLinear } from 'd3-scale'
import { axisBottom, axisLeft } from 'd3-axis'
import { line } from 'd3-shape'

// Instead of entire D3 (~250KB), you're only loading ~30KB
```

---

## Component Optimization

### React.memo

Use `React.memo` to prevent unnecessary re-renders when props haven't changed:

```typescript
// ❌ Bad: Component re-renders on every parent update
function EntityCard({ entity }) {
  return (
    <div>
      <h3>{entity.name}</h3>
      <p>{entity.type}</p>
    </div>
  )
}

// ✅ Good: Component only re-renders when entity changes
const EntityCard = React.memo(({ entity }) => {
  return (
    <div>
      <h3>{entity.name}</h3>
      <p>{entity.type}</p>
    </div>
  )
})

// ✅ Better: With custom comparison for complex props
const EntityCard = React.memo(
  ({ entity }) => {
    return (
      <div>
        <h3>{entity.name}</h3>
        <p>{entity.type}</p>
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Return true if props are equal (skip re-render)
    return prevProps.entity.id === nextProps.entity.id
  }
)
```

### When to Use React.memo

✅ **USE** React.memo for:

- List items (EntityCard, AlertCard, CaseCard, etc.)
- Dashboard widgets/cards
- Complex visualizations (charts, graphs, maps)
- Components that render frequently but props change infrequently

❌ **DON'T USE** React.memo for:

- Tiny components (<10 lines)
- Components that always receive new props
- Components that rarely re-render

### useMemo for Expensive Computations

```typescript
function DataTable({ data, filters }) {
  // ❌ Bad: Recomputes on every render
  const filteredData = data.filter(
    (item) => item.status === filters.status && item.priority === filters.priority
  )

  // ✅ Good: Only recomputes when dependencies change
  const filteredData = useMemo(() => {
    return data.filter(
      (item) =>
        item.status === filters.status && item.priority === filters.priority
    )
  }, [data, filters])

  return <Table data={filteredData} />
}
```

### useCallback for Function Props

```typescript
function ParentComponent() {
  const [count, setCount] = useState(0)
  const [other, setOther] = useState('')

  // ❌ Bad: New function on every render, child re-renders unnecessarily
  const handleClick = () => {
    setCount(count + 1)
  }

  // ✅ Good: Function identity stable, child doesn't re-render
  const handleClick = useCallback(() => {
    setCount((prev) => prev + 1)
  }, [])

  return <ChildComponent onClick={handleClick} />
}

const ChildComponent = React.memo(({ onClick }) => {
  return <button onClick={onClick}>Click me</button>
})
```

---

## Context API Performance

### Memoize Context Values

**❌ Bad**: Context value recreated on every render

```typescript
function AuthProvider({ children }) {
  const { data, loading } = useQuery(CURRENT_USER)
  const user = data?.me

  const hasRole = (role) => user?.role === role
  const hasPermission = (perm) => permissions.includes(perm)

  // ❌ New object on every render → all consumers re-render!
  return (
    <AuthContext.Provider value={{ user, loading, hasRole, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}
```

**✅ Good**: Memoize all context values

```typescript
function AuthProvider({ children }) {
  const { data, loading } = useQuery(CURRENT_USER)
  const user = data?.me

  // Memoize computed values
  const permissions = useMemo(
    () => (user ? ROLE_PERMISSIONS[user.role] || [] : []),
    [user]
  )

  // Memoize functions
  const hasRole = useCallback((role) => user?.role === role, [user])

  const hasPermission = useCallback(
    (perm) => permissions.includes('*') || permissions.includes(perm),
    [permissions]
  )

  // Memoize the entire context value
  const value = useMemo(
    () => ({ user, loading, hasRole, hasPermission }),
    [user, loading, hasRole, hasPermission]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
```

### Split Contexts

If context updates frequently, split it into separate contexts:

```typescript
// ❌ Bad: Single context with fast-changing and slow-changing data
const AppContext = createContext({ user, theme, notifications })

// ✅ Good: Separate contexts
const UserContext = createContext(null) // Changes rarely
const ThemeContext = createContext('light') // Changes rarely
const NotificationsContext = createContext([]) // Changes frequently

// Now components can subscribe to only what they need
```

---

## GraphQL Query Optimization

### Request Only Required Fields

**❌ Bad**: Over-fetching data

```graphql
query GetEntities {
  entities {
    id
    name
    type
    description
    metadata
    properties
    relationships {
      id
      type
      target {
        id
        name
        type
        description
        metadata
      }
    }
    tags
    createdAt
    updatedAt
    createdBy {
      id
      name
      email
      avatar
    }
  }
}
```

**✅ Good**: Request only what you display

```graphql
query GetEntities {
  entities {
    id
    name
    type
    # Only fetch relationships count, not full data
    relationshipsCount
    tags
  }
}
```

### Use Fragments

```graphql
fragment EntityBasicInfo on Entity {
  id
  name
  type
}

query GetEntities {
  entities {
    ...EntityBasicInfo
  }
}

query GetEntityDetail($id: ID!) {
  entity(id: $id) {
    ...EntityBasicInfo
    description
    metadata
    relationships {
      id
      type
      target {
        ...EntityBasicInfo
      }
    }
  }
}
```

### Pagination

```typescript
// ❌ Bad: Loading all entities at once
const { data } = useQuery(GET_ALL_ENTITIES)

// ✅ Good: Paginated query
const { data, fetchMore } = useQuery(GET_ENTITIES, {
  variables: { first: 50, offset: 0 },
})

function loadMore() {
  fetchMore({
    variables: { offset: data.entities.length },
  })
}
```

### Caching Strategy

```typescript
const { data } = useQuery(GET_ENTITIES, {
  fetchPolicy: 'cache-first', // Use cache first, then network
  nextFetchPolicy: 'cache-first', // Continue using cache
})

// For frequently changing data
const { data } = useQuery(GET_LIVE_METRICS, {
  fetchPolicy: 'network-only', // Always fetch fresh data
  pollInterval: 30000, // Poll every 30 seconds
})
```

---

## Bundle Size Optimization

### Vite Configuration

Our optimized `vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code for better caching
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'apollo-vendor': ['@apollo/client', 'graphql', 'graphql-ws'],
          'mui-vendor': ['@mui/material', '@mui/icons-material'],
          'graph-vendor': ['cytoscape', /* cytoscape plugins */],
          'd3-vendor': ['d3'],
          'map-vendor': ['leaflet', 'react-leaflet'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@apollo/client'],
    exclude: ['cytoscape', 'd3', 'leaflet'], // Lazy loaded
  },
})
```

### Analyze Bundle

```bash
# Build and generate bundle analysis
pnpm build

# Open dist/stats.html to see bundle visualization
open dist/stats.html
```

### Tree Shaking

```typescript
// ❌ Bad: Imports entire library
import _ from 'lodash'
import * as d3 from 'd3'

// ✅ Good: Import only what you need
import debounce from 'lodash/debounce'
import uniq from 'lodash/uniq'
import { scaleLinear } from 'd3-scale'
```

---

## Performance Monitoring

### Web Vitals

Add Web Vitals monitoring to track real user performance:

```typescript
// src/lib/performance.ts
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals'

export function reportWebVitals() {
  onCLS(console.log)
  onFID(console.log)
  onFCP(console.log)
  onLCP(console.log)
  onTTFB(console.log)
}

// In production, send to analytics
export function reportWebVitalsToAnalytics() {
  function sendToAnalytics(metric) {
    // Send to your analytics service
    fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify(metric),
    })
  }

  onCLS(sendToAnalytics)
  onFID(sendToAnalytics)
  onFCP(sendToAnalytics)
  onLCP(sendToAnalytics)
  onTTFB(sendToAnalytics)
}

// In main.tsx or App.tsx
reportWebVitals()
```

### React DevTools Profiler

```typescript
// Wrap expensive components with Profiler in development
function onRenderCallback(
  id, // component name
  phase, // "mount" or "update"
  actualDuration, // time spent rendering
  baseDuration, // estimated time without memoization
  startTime,
  commitTime
) {
  console.log(`${id} ${phase} took ${actualDuration}ms`)
}

function App() {
  return (
    <Profiler id="App" onRender={onRenderCallback}>
      <Router>...</Router>
    </Profiler>
  )
}
```

### Performance Budgets

Add performance budgets to your CI/CD:

```json
// package.json
{
  "scripts": {
    "build": "vite build",
    "build:check-size": "vite build && bundlesize"
  },
  "bundlesize": [
    {
      "path": "./dist/assets/*.js",
      "maxSize": "500kb"
    },
    {
      "path": "./dist/assets/*.css",
      "maxSize": "50kb"
    }
  ]
}
```

---

## Common Anti-Patterns

### ❌ Anti-Pattern 1: Inline Objects/Arrays as Props

```typescript
// ❌ Bad: New object on every render
<ChildComponent
  config={{ theme: 'dark', size: 'large' }}
  items={['item1', 'item2']}
/>

// ✅ Good: Stable references
const config = useMemo(() => ({ theme: 'dark', size: 'large' }), [])
const items = useMemo(() => ['item1', 'item2'], [])

<ChildComponent config={config} items={items} />
```

### ❌ Anti-Pattern 2: Massive Components

```typescript
// ❌ Bad: 1000+ line component
function CytoscapeGraph() {
  // 1000+ lines of rendering, state management, effects...
}

// ✅ Good: Split into smaller components
function CytoscapeGraph() {
  return (
    <GraphCanvas>
      <GraphControls />
      <GraphSettings />
      <GraphExport />
    </GraphCanvas>
  )
}
```

### ❌ Anti-Pattern 3: Not Using Keys in Lists

```typescript
// ❌ Bad: No keys or index as key
{items.map((item, index) => <Item key={index} {...item} />)}

// ✅ Good: Stable, unique keys
{items.map(item => <Item key={item.id} {...item} />)}
```

### ❌ Anti-Pattern 4: Expensive Calculations in Render

```typescript
// ❌ Bad: Runs on every render
function Component({ data }) {
  const processed = complexCalculation(data) // Runs every render!
  return <div>{processed}</div>
}

// ✅ Good: Memoized
function Component({ data }) {
  const processed = useMemo(() => complexCalculation(data), [data])
  return <div>{processed}</div>
}
```

### ❌ Anti-Pattern 5: D3 Full Re-render

```typescript
// ❌ Bad: Destroys and recreates entire DOM
useEffect(() => {
  const svg = d3.select(svgRef.current)
  svg.selectAll('*').remove() // ❌ Expensive!

  // Recreate everything...
}, [data])

// ✅ Good: Use D3's join pattern
useEffect(() => {
  const svg = d3.select(svgRef.current)

  svg
    .selectAll('circle')
    .data(data, (d) => d.id) // ✅ Key function
    .join(
      (enter) => enter.append('circle').attr('r', 0),
      (update) => update.attr('cx', (d) => d.x),
      (exit) => exit.remove()
    )
}, [data])
```

---

## Performance Checklist

### Before Committing Code

- [ ] Are all route components lazy loaded?
- [ ] Are heavy dependencies (Cytoscape, D3, Leaflet) lazy loaded?
- [ ] Are list items wrapped with `React.memo`?
- [ ] Are expensive calculations wrapped with `useMemo`?
- [ ] Are callback props wrapped with `useCallback`?
- [ ] Are Context values memoized?
- [ ] Are GraphQL queries requesting only needed fields?
- [ ] Are components <300 lines? (If not, can they be split?)
- [ ] No inline objects/arrays as props to memoized components?

### Before Releasing

- [ ] Bundle size analyzed with `dist/stats.html`?
- [ ] No single chunk >500KB?
- [ ] Lighthouse score >90?
- [ ] Core Web Vitals in green?
- [ ] Tested on slow 3G connection?
- [ ] No console warnings in production build?

---

## Examples from Our Codebase

### ✅ Good Example: Lazy Loaded Routes

**File**: `apps/web/src/App.tsx`

```typescript
// Lazy load all pages
const HomePage = React.lazy(() => import('@/pages/HomePage'))
const ExplorePage = React.lazy(() => import('@/pages/ExplorePage'))
// ...

function App() {
  return (
    <React.Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/explore" element={<ExplorePage />} />
      </Routes>
    </React.Suspense>
  )
}
```

### ✅ Good Example: Optimized Context

**File**: `client/src/context/AuthContext.jsx`

```typescript
export function AuthProvider({ children }) {
  const { data, loading } = useQuery(CURRENT_USER)
  const user = data?.me

  // All memoized!
  const permissions = useMemo(() => getRolePermissions(user), [user])
  const hasRole = useCallback((role) => user?.role === role, [user])
  const hasPermission = useCallback(
    (perm) => permissions.includes(perm),
    [permissions]
  )

  const value = useMemo(
    () => ({ user, loading, hasRole, hasPermission }),
    [user, loading, hasRole, hasPermission]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
```

### ❌ Needs Improvement: Large Graph Component

**File**: `client/src/components/graph/CytoscapeGraph.jsx` (1403 lines)

**Action Item**: Split into:

- `CytoscapeCanvas.jsx` - Core rendering
- `GraphControls.jsx` - Zoom, pan, layout controls
- `GraphSettings.jsx` - Settings panel
- `useGraphState.js` - State management hook
- `useGraphLayout.js` - Layout logic hook

---

## Resources

### Tools

- **React DevTools Profiler**: Identify slow components
- **Lighthouse**: Measure Core Web Vitals
- **Bundle Phobia**: Check package sizes before installing
- **Webpack Bundle Analyzer / Rollup Visualizer**: Analyze bundle composition

### Further Reading

- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Web Vitals](https://web.dev/vitals/)
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/)
- [Vite Performance](https://vitejs.dev/guide/performance.html)

---

## Questions?

For performance-related questions or suggestions, reach out to the frontend team or open a discussion in the `#frontend-performance` channel.

---

**Remember**: Performance is a feature, not an afterthought. Make it part of your development workflow! 🚀
