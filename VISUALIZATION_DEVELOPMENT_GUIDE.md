# Visualization System Development Guide

Quick reference for building visualizations consistent with the IntelGraph codebase architecture.

## Quick Start: Building a New Visualization

### 1. Frontend Component Structure

```typescript
// /client/src/features/[feature]/components/NewVisualization.tsx

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Box, Paper } from '@mui/material';
import { useQuery } from '@apollo/client';
import { getSocket } from '@/realtime/socket';
import { VISUALIZATION_DATA_QUERY } from '@/features/[feature]/queries';

interface VisualizationProps {
  dataId: string;
  onUpdate?: (data: any) => void;
}

export const NewVisualization: React.FC<VisualizationProps> = ({ dataId, onUpdate }) => {
  const dispatch = useDispatch();
  const socket = getSocket();
  const [loading, setLoading] = useState(false);

  // GraphQL query for static data
  const { data, loading: queryLoading } = useQuery(VISUALIZATION_DATA_QUERY, {
    variables: { id: dataId }
  });

  // Real-time updates
  useEffect(() => {
    const handleUpdate = (payload: any) => {
      dispatch(updateVisualizationState(payload));
      onUpdate?.(payload);
    };

    socket.on('visualization:update', handleUpdate);
    return () => socket.off('visualization:update', handleUpdate);
  }, [socket, dispatch, onUpdate]);

  return (
    <Paper>
      {/* Your visualization component */}
    </Paper>
  );
};

export default NewVisualization;
```

### 2. Redux Slice for State Management

```typescript
// /client/src/store/slices/visualizationSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface VisualizationState {
  nodes: any[];
  edges: any[];
  selectedNode: string | null;
  layout: string;
  isLoading: boolean;
  error: string | null;
}

const initialState: VisualizationState = {
  nodes: [],
  edges: [],
  selectedNode: null,
  layout: 'hierarchical',
  isLoading: false,
  error: null,
};

const visualizationSlice = createSlice({
  name: 'visualization',
  initialState,
  reducers: {
    setNodes: (state, action: PayloadAction<any[]>) => {
      state.nodes = action.payload;
    },
    setEdges: (state, action: PayloadAction<any[]>) => {
      state.edges = action.payload;
    },
    selectNode: (state, action: PayloadAction<string | null>) => {
      state.selectedNode = action.payload;
    },
    setLayout: (state, action: PayloadAction<string>) => {
      state.layout = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export default visualizationSlice.reducer;
export const { setNodes, setEdges, selectNode, setLayout, setLoading, setError } = visualizationSlice.actions;
```

### 3. GraphQL Schema Addition

```typescript
// /server/src/graphql/schema/visualization.ts

export const visualizationTypeDefs = `
  type VisualizationNode {
    id: ID!
    label: String!
    type: String!
    data: JSON!
    position: Position!
  }

  type VisualizationEdge {
    id: ID!
    source: ID!
    target: ID!
    type: String!
    properties: JSON!
  }

  type Position {
    x: Float!
    y: Float!
  }

  extend type Query {
    visualizationData(id: ID!): VisualizationResult!
    nodeDetails(nodeId: ID!): VisualizationNode!
  }

  extend type Mutation {
    updateVisualizationLayout(id: ID!, layout: String!): Boolean!
  }

  extend type Subscription {
    visualizationUpdates(id: ID!): VisualizationUpdate!
  }

  type VisualizationUpdate {
    type: String!
    nodes: [VisualizationNode!]
    edges: [VisualizationEdge!]
    timestamp: DateTime!
  }

  type VisualizationResult {
    nodes: [VisualizationNode!]!
    edges: [VisualizationEdge!]!
    metadata: JSON!
  }
`;
```

### 4. GraphQL Resolver

```typescript
// /server/src/graphql/resolvers/visualization.ts

export const visualizationResolvers = {
  Query: {
    visualizationData: async (_, { id }, context) => {
      const { tenantId } = context;
      const service = new VisualizationService(context.db);
      return service.getVisualizationData(id, tenantId);
    },
  },
  
  Mutation: {
    updateVisualizationLayout: async (_, { id, layout }, context) => {
      const { tenantId } = context;
      const service = new VisualizationService(context.db);
      await service.updateLayout(id, layout, tenantId);
      
      // Emit to subscriptions
      context.pubsub.publish(`visualization:${id}`, {
        visualizationUpdates: {
          type: 'layoutChange',
          timestamp: new Date(),
        }
      });
      
      return true;
    },
  },
  
  Subscription: {
    visualizationUpdates: {
      subscribe: (_, { id }, context) => {
        return context.pubsub.asyncIterator([`visualization:${id}`]);
      },
    },
  },
};
```

### 5. Backend Service Class

```typescript
// /server/src/services/VisualizationService.ts

export class VisualizationService {
  constructor(private db: any) {}

  async getVisualizationData(id: string, tenantId: string) {
    // Query Neo4j for graph structure
    const nodes = await this.db.neo4j.run(
      `MATCH (n) WHERE n.tenantId = $tenantId AND n.visualizationId = $id RETURN n`,
      { tenantId, id }
    );

    const edges = await this.db.neo4j.run(
      `MATCH (a)-[r]->(b) WHERE a.tenantId = $tenantId RETURN r`,
      { tenantId }
    );

    return {
      nodes: this.formatNodes(nodes),
      edges: this.formatEdges(edges),
      metadata: { createdAt: new Date() },
    };
  }

  private formatNodes(records: any[]) {
    return records.map(r => ({
      id: r.get('n').properties.id,
      label: r.get('n').properties.name,
      type: r.get('n').labels[0],
      data: r.get('n').properties,
      position: { x: 0, y: 0 }, // Set by layout algorithm
    }));
  }

  private formatEdges(records: any[]) {
    return records.map(r => ({
      id: r.get('r').identity.toString(),
      source: r.get('r').start.toString(),
      target: r.get('r').end.toString(),
      type: r.get('r').type,
      properties: r.get('r').properties,
    }));
  }

  async updateLayout(id: string, layout: string, tenantId: string) {
    // Update in PostgreSQL for persistence
    await this.db.postgres.query(
      'UPDATE visualizations SET layout = $1 WHERE id = $2 AND tenant_id = $3',
      [layout, id, tenantId]
    );
  }
}
```

### 6. Real-time Socket Events

```typescript
// Server side: /server/src/websocket/core.ts additions
private setupVisualizationHandlers() {
  this.app.ws('visualization/:id', (ws, req) => {
    const { id } = req.params;
    const userId = this.extractUserId(req);
    
    ws.subscribe(`visualization:${id}:${userId}`);
    
    ws.on('message', (msg) => {
      const data = JSON.parse(msg);
      if (data.type === 'layout-change') {
        this.broadcast(`visualization:${id}`, data);
      }
    });
  });
}

// Client side: /client/src/features/[feature]/hooks/useVisualization.ts
export const useVisualizationUpdates = (visualizationId: string) => {
  const dispatch = useDispatch();
  const socket = getSocket();

  useEffect(() => {
    const handleUpdate = (data: any) => {
      dispatch(updateVisualizationState(data));
    };

    socket.on(`visualization:${visualizationId}`, handleUpdate);
    return () => socket.off(`visualization:${visualizationId}`, handleUpdate);
  }, [visualizationId, socket, dispatch]);
};
```

## Library Selection Guide

### For Graph Visualization
- **Cytoscape.js**: General-purpose, many layouts (existing choice)
- **D3.js**: Custom visualizations, full control (available)
- **Vis.js**: Timeline/network visualization (available)
- **Leaflet**: Geographic visualization (available)

### For Styling & UI
- **MUI**: Component library (existing)
- **Emotion**: CSS-in-JS (existing)
- **Tailwind**: Utility CSS (available)

### For State Management
- **Redux Toolkit**: Already in use, mature
- **Zustand**: Lightweight alternative
- **Jotai**: Atomic state management

### For Real-time
- **Socket.io**: Already integrated
- **graphql-ws**: GraphQL subscriptions (already integrated)
- **React Query**: Data synchronization (not used yet)

## Existing Patterns to Follow

### 1. Data Flow
```
GraphQL Query/Mutation
        ↓
Redux Slice Action
        ↓
Component Re-render
        ↓
WebSocket Update
        ↓
Redux Slice Reducer
        ↓
UI Update
```

### 2. File Organization
```
/client/src/features/[feature]/
├── components/
│   ├── MainVisualization.tsx
│   ├── Legend.tsx
│   └── Controls.tsx
├── hooks/
│   ├── useVisualization.ts
│   └── useVisualizationUpdates.ts
├── services/
│   └── VisualizationAPI.ts
├── queries/
│   └── visualization.graphql
├── types/
│   └── visualization.ts
└── index.ts
```

### 3. Type Safety
```typescript
// Define types with Zod if they need validation
import { z } from 'zod';

export const NodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['person', 'org', 'location']),
  properties: z.record(z.unknown()),
});

export type Node = z.infer<typeof NodeSchema>;
```

### 4. Testing Pattern
```typescript
// /client/src/features/[feature]/components/Visualization.test.tsx
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Visualization from './Visualization';

describe('Visualization Component', () => {
  it('renders with data', () => {
    const store = configureStore({
      reducer: { visualization: visualizationReducer }
    });
    
    render(
      <Provider store={store}>
        <Visualization dataId="test-id" />
      </Provider>
    );
    
    expect(screen.getByRole('canvas')).toBeInTheDocument();
  });
});
```

## Performance Optimization

### 1. Use React.memo for expensive renders
```typescript
export const VisualizationNode = React.memo(({ node, onSelect }: Props) => {
  return <div onClick={() => onSelect(node.id)}>{node.label}</div>;
}, (prev, next) => prev.node.id === next.node.id);
```

### 2. Virtualization for large lists
```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={nodes.length}
  itemSize={50}
  width={300}
>
  {({ index, style }) => <NodeItem node={nodes[index]} style={style} />}
</FixedSizeList>
```

### 3. Memoize selectors
```typescript
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

const visibleNodes = useMemo(() => {
  return nodes.filter(n => !n.hidden);
}, [nodes]);
```

### 4. Debounce updates
```typescript
import { debounce } from 'lodash';

const handlePan = useMemo(
  () => debounce((x, y) => dispatch(updateViewport({ x, y })), 100),
  [dispatch]
);
```

## Deployment Checklist

- [ ] Types are properly exported in `types.ts`
- [ ] GraphQL queries are persisted in `/graphql/queries/`
- [ ] Redux slices are registered in store
- [ ] Routes are added to router
- [ ] Feature is added to feature flag system
- [ ] Tests achieve >80% coverage
- [ ] Accessibility: ARIA labels, keyboard navigation
- [ ] Performance: Lighthouse score >90
- [ ] Documentation: Component Storybook stories
- [ ] E2E tests via Playwright

## Common Pitfalls to Avoid

1. **Not using Redux for shared state** - Use it for cross-component data
2. **Forgetting tenant isolation** - Always include tenantId in queries
3. **Direct DOM manipulation** - Use React refs instead
4. **Not handling loading states** - Always show loading spinners
5. **Missing error boundaries** - Wrap components that can fail
6. **Synchronous heavy operations** - Use Web Workers for large datasets
7. **Not unsubscribing from WebSocket** - Clean up in useEffect return
8. **Mutating state directly** - Redux requires immutable updates

