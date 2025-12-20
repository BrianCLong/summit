# IntelGraph Architecture Quick Reference

## Critical File Locations

### Frontend
- **Redux Store**: `/client/src/store/` - State management
- **Components**: `/client/src/components/` - All UI components
- **Graph Viz**: `/client/src/components/graph/` - Existing graph visualizations
- **Dashboard**: `/client/src/components/dashboard/` - Dashboard widgets
- **Advanced Viz**: `/client/src/components/visualization/` - Advanced visualizations
- **Apollo Client**: `/client/src/lib/apollo.ts` - GraphQL setup
- **Socket.io**: `/client/src/realtime/socket.js` - Real-time client

### Backend
- **Express App**: `/server/src/app.ts` - Main application factory
- **GraphQL Schema**: `/server/src/graphql/` - All schema definitions
- **Resolvers**: `/server/src/graphql/resolvers/` - Resolver implementations
- **Services**: `/server/src/services/` - Business logic (150+ files)
- **WebSocket**: `/server/src/websocket/` - Real-time server (uWS)
- **Database**: `/server/src/db/` - Database connections and repositories
- **Neo4j**: `/server/src/db/neo4j.ts` - Graph DB driver

### Packages
- **Common Types**: `/packages/common-types/` - Shared Zod schemas
- **SDK-TS**: `/packages/sdk-ts/` - TypeScript SDK

## Tech Stack At-a-Glance

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend Framework** | React | 18.3.1 | UI rendering |
| **State Management** | Redux Toolkit | 2.8.2 | Global state |
| **GraphQL Client** | Apollo Client | 3.13.9 | Data fetching |
| **Real-time** | Socket.io | 4.8.1 | Live updates |
| **Graphs** | Cytoscape.js | 3.33.1 | Network visualization |
| **Maps** | Leaflet | 1.9.4 | Geospatial |
| **Timeline** | vis-timeline | 8.3.0 | Temporal visualization |
| **UI Components** | MUI | 7.3.1 | Component library |
| **Styling** | Emotion | 11.14 | CSS-in-JS |
| **Bundler** | Vite | 7.2.2 | Build tool |
| **Backend Framework** | Express | 5.1.0 | HTTP server |
| **GraphQL Server** | Apollo Server | 5.1.0 | GraphQL execution |
| **WebSocket** | uWebSockets.js | - | High-perf WS |
| **Graph DB** | Neo4j | 5.15 | Graph storage |
| **SQL DB** | PostgreSQL | 15 | Relational data |
| **Cache** | Redis | 7 | Session/cache |
| **Job Queue** | BullMQ | 5.63.2 | Background jobs |
| **Logging** | Pino | 10.1.0 | Performance logging |
| **Observability** | OpenTelemetry | - | Tracing & metrics |
| **Validation** | Zod | 4.1.12 | Schema validation |

## Key Architectural Patterns

### 1. State Flow (Frontend)
```
User Action → Redux Dispatch → Service Call → GraphQL/REST → 
Response → Redux Reducer → Component Re-render
```

### 2. Real-time Flow
```
Server Event → Socket.emit → Client Socket.on → Redux Reducer → 
Component Re-render
```

### 3. Data Modeling
```
Zod Schema (common-types) → TypeScript Type → GraphQL Type → 
Database Model
```

### 4. Service Architecture
```
Express Route / GraphQL Resolver → Service Class → 
Repository/Query → Database
```

## Common Code Snippets

### Connecting to Redux
```typescript
import { useDispatch, useSelector } from 'react-redux';

const Component = () => {
  const dispatch = useDispatch();
  const data = useSelector(state => state.domain.data);
  
  dispatch(actionCreator(payload));
};
```

### GraphQL Query
```typescript
import { useQuery } from '@apollo/client';
import { MY_QUERY } from '@/graphql/queries';

const { data, loading, error } = useQuery(MY_QUERY, {
  variables: { id: '123' }
});
```

### Socket.io Real-time
```typescript
import { getSocket } from '@/realtime/socket';

const socket = getSocket();
socket.on('event-name', (payload) => {
  dispatch(updateState(payload));
});

socket.emit('event-name', { data });
```

### Backend Service
```typescript
export class DomainService {
  constructor(private db: any) {}
  
  async getData(id: string, tenantId: string) {
    return this.db.neo4j.run(`MATCH (n) RETURN n`);
  }
}
```

### GraphQL Resolver
```typescript
export const resolvers = {
  Query: {
    getData: async (_, { id }, { tenantId }) => {
      const service = new DomainService(db);
      return service.getData(id, tenantId);
    }
  }
};
```

## Authentication & Authorization

- **Storage**: JWT in localStorage (`auth_token`, `token`)
- **Socket.io**: Token in auth parameter during connection
- **GraphQL Context**: JWT decoded in `getContext()`
- **Authorization**: RBAC via JWT claims (`tenantId`, `roles`, `permissions`)
- **Multi-tenancy**: All queries filtered by `tenantId`

## Database Querying

### Neo4j (Graph)
```cypher
MATCH (n:Entity {tenantId: $tenantId})
RETURN n LIMIT 10
```

### PostgreSQL (Relational)
```sql
SELECT * FROM entities WHERE tenant_id = $1 AND deleted_at IS NULL
```

### Redis (Cache)
```typescript
const cached = await redis.get(`entity:${id}`);
if (!cached) {
  const data = await fetchFromDB();
  await redis.set(`entity:${id}`, JSON.stringify(data), 'EX', 3600);
}
```

## Performance Considerations

1. **Debounce**: High-frequency events (panning, zooming)
2. **Memoization**: Expensive selectors and derived state
3. **Virtualization**: Large lists (10k+ items)
4. **Lazy Loading**: Code splitting by feature
5. **Query Optimization**: Index management, query plans
6. **Caching**: Redis for frequently accessed data
7. **Connection Pooling**: Database connections

## Environment Variables

### Client (`.env`)
```
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
VITE_GRAPHQL_ENDPOINT=/graphql
```

### Server (`.env`)
```
PORT=4000
NEO4J_URI=bolt://neo4j:7687
POSTGRES_URL=postgres://user:pass@localhost:5432/db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

## Testing

### Jest (Server)
```bash
npm run test -- services/MyService.test.ts
npm run test -- --coverage
```

### Vitest (Client)
```bash
npm run test -- components/MyComponent.test.tsx
```

### Playwright (E2E)
```bash
npm run test:e2e -- --headed
```

## Docker Compose

Start all services:
```bash
docker-compose -f server/docker-compose.prod.yml up
```

Key services:
- `neo4j`: Neo4j database
- `postgres`: PostgreSQL database
- `redis`: Redis cache
- `server`: API server
- `client`: Frontend (if included)

## Monitoring & Debugging

- **Logs**: `http://localhost:4000/monitoring`
- **Metrics**: `http://localhost:4000/metrics` (Prometheus format)
- **GraphQL Playground**: `http://localhost:4000/graphql`
- **Neo4j Browser**: `http://localhost:7474`
- **Grafana**: `http://localhost:3000` (if running)
- **Jaeger Tracing**: `http://localhost:6831` (configurable)

## Common Tasks

### Add a new feature
1. Create feature directory in `/client/src/features/`
2. Create Redux slice in `/client/src/store/slices/`
3. Add GraphQL schema in `/server/src/graphql/schema/`
4. Add resolver in `/server/src/graphql/resolvers/`
5. Create service in `/server/src/services/`
6. Add route/tests
7. Update router configuration

### Add real-time updates
1. Create Socket.io event handler in `/server/src/websocket/`
2. Add listener hook in `/client/src/hooks/`
3. Dispatch Redux action on event
4. Or use GraphQL subscriptions pattern

### Add a database query
1. Create repository in `/server/src/db/repositories/`
2. Use in service class
3. Expose via GraphQL resolver
4. Query from client via Apollo

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Redux state not updating | Check reducer is pure, use immer |
| Socket.io not connecting | Check auth token, verify URL |
| GraphQL query fails | Check types match schema, verify resolver |
| Database query slow | Check indexes, use query optimizer, cache |
| Component not re-rendering | Check Redux selector, memoization |
| Memory leak in real-time | Unsubscribe from events in cleanup |

## Release & Deployment

1. **Bump version**: Update `package.json` versions
2. **Build**: `npm run build` (client & server)
3. **Test**: `npm run test:coverage`
4. **Docker build**: `docker build -t intelgraph:latest .`
5. **Push**: Deploy to container registry
6. **Verify**: Health checks pass, metrics good
7. **Monitor**: Watch logs and traces

