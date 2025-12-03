# KG Explorer Performance Guide

## Overview

The Knowledge Graph Explorer (`KGExplorer`) is designed for high-performance graph visualization with support for large datasets. This document outlines performance characteristics, optimization strategies, and best practices.

## Performance Characteristics

### Rendering Performance

| Graph Size | Nodes | Edges | Target FPS | Notes |
|------------|-------|-------|------------|-------|
| Small | < 100 | < 200 | 60 | Smooth interactions, all features enabled |
| Medium | 100-500 | 500-1500 | 45-60 | May reduce animation complexity |
| Large | 500-2000 | 2000-5000 | 30-45 | Consider clustering, reduce label rendering |
| Very Large | > 2000 | > 5000 | 20-30 | Requires virtualization/LOD |

### Memory Usage

- **Base Component**: ~2-3 MB
- **Per Node**: ~500 bytes (DOM) + ~200 bytes (data)
- **Per Edge**: ~300 bytes (DOM) + ~150 bytes (data)
- **Cytoscape Instance**: ~1-2 MB base overhead

## Optimization Strategies

### 1. Layout Optimization

```typescript
// Use appropriate layout for data size
const layoutOptions = {
  // For small graphs (< 100 nodes): fcose with high quality
  fcose: {
    quality: 'default',
    numIter: 2500,
    randomize: true,
  },

  // For medium graphs (100-500 nodes): reduce iterations
  fcose_medium: {
    quality: 'default',
    numIter: 1000,
    randomize: false,
  },

  // For large graphs (> 500 nodes): use faster layout
  dagre: {
    // Faster than force-directed for large hierarchical graphs
    rankDir: 'TB',
  },
};
```

### 2. Element Batching

```typescript
// Always batch element updates
cy.batch(() => {
  cy.elements().remove();
  cy.add(newElements);
});

// Avoid individual element updates in loops
// Bad:
elements.forEach(el => cy.add(el)); // Multiple redraws

// Good:
cy.add(elements); // Single redraw
```

### 3. Label Rendering Optimization

```typescript
// Reduce label rendering overhead for large graphs
const styleForLargeGraph = {
  selector: 'node',
  style: {
    // Hide labels below zoom threshold
    'label': nodeCount > 500
      ? (node) => cy.zoom() > 0.5 ? node.data('label') : ''
      : 'data(label)',

    // Limit text width
    'text-max-width': 80,
    'text-wrap': 'ellipsis',
  },
};
```

### 4. Event Throttling

```typescript
// Throttle expensive event handlers
import { throttle } from 'lodash';

const handleMouseMove = throttle((e) => {
  // Update hover state
}, 50);

cy.on('mousemove', 'node', handleMouseMove);
```

### 5. Virtualization for Very Large Graphs

For graphs with > 2000 nodes, consider:

1. **Level of Detail (LOD)**: Show simplified nodes at low zoom
2. **Clustering**: Group dense regions into meta-nodes
3. **Viewport Culling**: Only render visible elements
4. **Progressive Loading**: Load and render in chunks

```typescript
// Example: Viewport-based element visibility
cy.on('viewport', throttle(() => {
  const extent = cy.extent();
  cy.nodes().forEach(node => {
    const pos = node.position();
    const visible =
      pos.x >= extent.x1 && pos.x <= extent.x2 &&
      pos.y >= extent.y1 && pos.y <= extent.y2;
    node.style('display', visible ? 'element' : 'none');
  });
}, 100));
```

## GraphQL Query Optimization

### 1. Field Selection

```graphql
# Only request needed fields
query GetGraphData($investigationId: ID!) {
  graphData(investigationId: $investigationId) {
    nodes {
      id
      label
      type
      # Only fetch these if needed:
      # description
      # properties
    }
    edges {
      id
      fromEntityId
      toEntityId
      type
      label
    }
    nodeCount
    edgeCount
  }
}
```

### 2. Pagination for Large Results

```graphql
query GetGraphDataPaginated(
  $investigationId: ID!
  $first: Int = 100
  $after: String
) {
  graphData(
    investigationId: $investigationId
    first: $first
    after: $after
  ) {
    nodes {
      id
      label
      type
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### 3. Subscription Batching

```typescript
// Batch subscription updates
const BATCH_INTERVAL = 500; // ms

const batchedUpdates: GraphUpdate[] = [];
let batchTimeout: NodeJS.Timeout | null = null;

function handleSubscriptionUpdate(update: GraphUpdate) {
  batchedUpdates.push(update);

  if (!batchTimeout) {
    batchTimeout = setTimeout(() => {
      applyBatchedUpdates(batchedUpdates);
      batchedUpdates.length = 0;
      batchTimeout = null;
    }, BATCH_INTERVAL);
  }
}
```

## Mobile Performance

### Touch Optimization

```typescript
// Reduce render quality during gestures
cy.on('pinchstart panstart', () => {
  cy.style().selector('node').style({
    'text-opacity': 0,
    'border-width': 1,
  }).update();
});

cy.on('pinchend panend', () => {
  cy.style().selector('node').style({
    'text-opacity': 1,
    'border-width': 2,
  }).update();
});
```

### Memory Management on Mobile

```typescript
// Cleanup on unmount
useEffect(() => {
  return () => {
    cy.destroy();
    // Clear any cached data
    queryClient.removeQueries(['graphData', investigationId]);
  };
}, []);
```

## Monitoring Performance

### Key Metrics to Track

1. **Frame Rate (FPS)**: Target 30+ during interactions
2. **Time to Interactive (TTI)**: < 2s for initial render
3. **Memory Usage**: Monitor for leaks during long sessions
4. **Query Response Time**: < 500ms for graph data queries

### Performance Measurement

```typescript
// Measure layout performance
const startTime = performance.now();
cy.layout(options).run();
const layoutTime = performance.now() - startTime;

if (layoutTime > 1000) {
  console.warn(`Layout took ${layoutTime}ms - consider optimization`);
}

// Use React DevTools Profiler for component rendering
// Use Chrome DevTools Performance tab for detailed analysis
```

## Recommended Configuration by Use Case

### Interactive Analysis (Default)

```typescript
{
  enableRAGPreview: true,
  enableDragTraversal: true,
  pollInterval: 30000,
  enableSubscription: true,
}
```

### Large Dataset Viewing

```typescript
{
  enableRAGPreview: false,  // Reduce queries
  enableDragTraversal: false,  // Simpler interactions
  pollInterval: 60000,  // Less frequent updates
  enableSubscription: false,  // Manual refresh only
}
```

### Mobile / Low-Power Devices

```typescript
{
  enableRAGPreview: false,
  enableDragTraversal: false,
  pollInterval: 0,  // Manual refresh only
  enableSubscription: false,
  reducedMotion: true,
}
```

## Troubleshooting

### Slow Initial Load

1. Check network tab for slow GraphQL queries
2. Verify graph size is within expected limits
3. Consider lazy loading the component

### Janky Animations

1. Reduce animation duration
2. Use `will-change: transform` for animated elements
3. Disable non-essential visual effects

### Memory Leaks

1. Ensure proper cleanup on unmount
2. Remove event listeners
3. Clear cached query data when leaving view

### High CPU Usage

1. Check for runaway event handlers
2. Throttle expensive operations
3. Consider using Web Workers for data processing

## Browser Support

| Browser | Min Version | Notes |
|---------|-------------|-------|
| Chrome | 80+ | Full support |
| Firefox | 75+ | Full support |
| Safari | 14+ | Full support |
| Edge | 80+ | Full support |
| Mobile Safari | 14+ | Touch optimizations applied |
| Chrome Android | 80+ | Touch optimizations applied |

## Additional Resources

- [Cytoscape.js Performance Tips](https://js.cytoscape.org/#performance)
- [Apollo Client Caching](https://www.apollographql.com/docs/react/caching/)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
