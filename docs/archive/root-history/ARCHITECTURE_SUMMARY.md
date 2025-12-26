# IntelGraph Summit Codebase Architecture Summary

## Overview
This is a large-scale, enterprise intelligence platform with a sophisticated multi-service architecture supporting real-time graph visualization, AI-powered analysis, and complex intelligence workflows.

---

## 1. PACKAGE ORGANIZATION

### Primary Package Structure (`/packages/`)
The codebase uses a monorepo structure with curated packages:

**Core Packages:**
- **common-types**: Shared TypeScript types and Zod schemas for cross-platform validation
  - Entity/Edge/Connector schemas
  - Envelope pattern for data interchange
  - Run status enums
  - Built on Zod for runtime validation + JSON schema generation

- **sdk-ts**: TypeScript SDK for client integration
- **maestro-core**: Workflow/orchestration core
- **maestro-cli**: CLI for maestro operations
- **graph-ai-core**: Graph AI analysis core
- **narrative-engine**: Natural language narrative generation

**Domain Packages:**
- **prov-ledger**: Provenance tracking and ledger
- **event-booster**: Event processing enhancement
- **influence-mining**: Influence network mining
- **geospatial-js**: Geospatial analysis library
- **search-js**: Search functionality library
- **graph-algos-js**: Graph algorithms library
- **reporting-js**: Reporting infrastructure
- **workflow-js**: Workflow execution library

**Specialized Packages:**
- **liquid-nano**: Micro-service framework
- **canary-lattice**: Resilience patterns
- **hit-protocol**: Intelligence transport protocol
- **mapping-dsl**: Domain-specific language for mappings
- **policy-audit**: Policy enforcement and auditing

### Key Pattern
- Packages follow feature-oriented organization
- Each package has `src/`, `test/`, and configuration files
- All use TypeScript with strict typing
- Distributed via npm with clear export boundaries

---

## 2. FRONTEND ARCHITECTURE

### Tech Stack
```
Framework:      React 18.3.1 (TSX/JSX)
State:          Redux Toolkit 2.8.2 + React-Redux 9.2.0
Styling:        Emotion 11.14, MUI 7.3.1, Tailwind
Bundler:        Vite 7.2.2
GraphQL Client: Apollo Client 3.13.9
Real-time:      Socket.io-client 4.8.1 + graphql-ws 5.16.2
Visualization:  
  - Cytoscape.js 3.33.1 (with cola, fcose, dagre, cose-bilkent layouts)
  - D3.js 7.9.0 + D3-force 3.0.0
  - Leaflet 1.9.4 + react-leaflet 5.0.0
  - react-grid-layout 1.5.2 (dashboard grids)
  - vis-timeline 8.3.0
Data Grid:      @mui/x-data-grid 8.10.1
Form Handling:  react-hook-form 7.62.0
Routing:        react-router-dom 7.9.6
Build Tools:    Jest 30.0.5, Vitest 4.0.9, Playwright 1.56.1
```

### Directory Structure (`/client/src/`)

```
client/src/
├── components/          # 64 component subdirectories
│   ├── graph/          # Graph visualization (Cytoscape, Cytoscape extensions)
│   ├── dashboard/      # Analytics dashboard widgets
│   ├── visualization/  # Advanced visualizations (DataVizStudio, NetworkAnalysis)
│   ├── timeline/       # Timeline components (vis-timeline integration)
│   ├── geospatial/     # Map and location-based viz
│   ├── ui/             # UI library components
│   ├── common/         # Shared components
│   └── [domain]/       # Domain-specific (cases, alerts, threat-hunting, etc.)
│
├── features/           # Feature modules (28 domains)
│   ├── graph/          # Graph feature logic
│   ├── link-analysis/  # Link analysis feature
│   ├── timeline/       # Timeline feature
│   ├── observability/  # Observability feature
│   ├── orchestrator/   # Workflow orchestration
│   └── ...
│
├── pages/              # Page-level components
│   ├── Dashboard/
│   ├── GraphWorkbench/
│   ├── Hunting/
│   ├── IOC/
│   ├── Investigations/
│   └── Search/
│
├── store/              # Redux state management
│   ├── slices/         # Redux slices
│   │   ├── graphSlice.js        # Graph state (large: 13.6KB)
│   │   ├── aiInsightsSlice.js
│   │   ├── graphInteractionSlice.js
│   │   ├── graphUISlice.js
│   │   ├── timelineSlice.js
│   │   ├── authSlice.js
│   │   └── uiSlice.ts
│   └── store.ts
│
├── graphql/            # GraphQL queries and mutations
│   ├── queries/        # GraphQL query definitions
│   └── generated/      # Auto-generated types
│
├── lib/                # Utility libraries
│   ├── apollo.ts       # Apollo Client configuration
│   ├── assistant/      # Assistant utilities
│   └── utils.ts
│
├── hooks/              # React hooks (custom)
├── context/            # React context providers
├── services/           # Business logic services
│   └── orchestrator/   # Orchestrator services
├── realtime/           # WebSocket implementation
│   └── socket.js       # Socket.io client
├── utils/              # Utility functions
├── types/              # TypeScript type definitions
├── styles/             # Global styles
├── theme/              # Theming configuration
└── locales/            # i18n translations
```

### State Management Pattern
Redux Toolkit slices for:
- **Graph State**: Nodes, edges, layout, selection, interactions
- **AI Insights**: AI analysis results and recommendations
- **Timeline State**: Time-based filtering and display
- **Auth State**: User authentication and permissions
- **UI State**: Modals, panels, visibility toggles

### Real-time Architecture
```javascript
// Socket.io client with custom event handling
socket.on('graph:op', payload)      // Graph operations
socket.on('ai:insight', payload)    // AI insights
socket.emit('graph:op', {graphId, op})
```

---

## 3. BACKEND/SERVER ARCHITECTURE

### Tech Stack
```
Framework:      Express 5.1.0
GraphQL:        Apollo Server 5.1.0 + Apollo Plugins
WebSocket:      uWebSockets.js + graphql-ws 6.0.6
Databases:
  - Neo4j 5.15 (graph database)
  - PostgreSQL 15 (relational data)
  - Redis 7 (caching/sessions)
  - TimescaleDB (time-series)
Messaging:      Socket.io 4.8.1
Job Queue:      BullMQ 5.63.2 + Bull Board
Auth:           JWT (jsonwebtoken 9.0.2)
Validation:     joi 18.0.1, express-validator 7.3.0, zod 4.1.12
Security:       helmet 8.1.0, cors 2.8.5, rate-limiting 8.2.1
Logging:        Pino 10.1.0, Morgan 1.10.1
Observability:  OpenTelemetry (Jaeger exporter, Prometheus)
ML/AI:          Python integration (tesseract, natural, sentiment)
Video:          ffmpeg-static, fluent-ffmpeg
Data:           Parquetjs, json2csv, sharp
```

### Directory Structure (`/server/src/`)

```
server/src/
├── app.ts              # Express app factory
├── index.ts            # Application entry point
├── live-server.ts      # Simplified production server with WebSocket
├── server.ts           # Main server setup
│
├── graphql/            # GraphQL layer
│   ├── schema/         # Type definitions (modular schemas)
│   ├── resolvers/      # GraphQL resolvers
│   ├── mutations/      # Mutation definitions
│   ├── directives/     # Custom GraphQL directives
│   ├── middleware/     # GraphQL middleware
│   ├── plugins/        # Apollo plugins
│   ├── subscriptions.ts # Subscription definitions
│   ├── schema.ts       # Main schema
│   ├── context.ts      # GraphQL context factory
│   └── apollo-v5-server.ts
│
├── websocket/          # WebSocket implementation
│   ├── core.ts         # WebSocket core (uWS, connection management)
│   └── connectionManager.ts # Connection pooling
│
├── http/               # HTTP routes
│   ├── metricsRoute.ts
│   └── ... other routes
│
├── routes/             # Express routes
│   ├── health.js       # Health checks
│   ├── monitoring.js
│   ├── ai.js
│   ├── rbacRoutes.js
│   └── ...
│
├── db/                 # Database layer
│   ├── neo4j.ts        # Neo4j driver & queries
│   ├── postgres.ts     # PostgreSQL connection
│   ├── redis.ts        # Redis client
│   ├── timescale.ts    # TimescaleDB setup
│   ├── pg.ts           # PostgreSQL utilities
│   ├── indexManager.ts # Index management
│   ├── queryOptimizer.ts # Query optimization
│   ├── migrations/     # Database migrations
│   ├── repositories/   # Data repositories
│   │   ├── evidenceRepo.ts
│   │   ├── feedback.ts
│   │   ├── audit.ts
│   │   ├── trustRiskRepo.ts
│   │   └── ...
│   └── seed.ts         # Data seeding
│
├── services/           # Business logic (150+ services)
│   ├── AIExtractionService.js
│   ├── AdvancedAnalyticsService.js
│   ├── AnalystDashboardService.ts
│   ├── ComplianceService.ts
│   ├── CopilotOrchestrationService.js
│   ├── AdvancedMLService.ts
│   ├── AlertTriageV2Service.ts
│   ├── [domain]Service.ts / .js
│   └── ... (40+ more services)
│
├── middleware/         # Express/GraphQL middleware
│   ├── audit-logger.js
│   ├── observability/  # OTEL tracing
│   └── auth.js
│
├── conductor/          # Workflow conductor
│   ├── worker-entrypoint.ts
│   └── orchestration
│
├── workers/            # Background workers
│   ├── trustScoreWorker.js
│   ├── retentionWorker.js
│   └── ...
│
├── maestro/            # Maestro workflow engine (16 subdirs)
│   ├── orchestration/
│   ├── execution/
│   └── ...
│
├── ai/                 # AI integration layer
├── integrations/       # Third-party integrations
├── auth/               # Authentication layer
├── observability/      # Metrics and tracing
├── otel.ts             # OpenTelemetry setup
├── telemetry/          # Telemetry collection
├── config.ts           # Configuration management
└── config/             # Environment-specific configs
```

### GraphQL Schema Architecture
- **Modular schemas**: `schema.core.js`, `schema.ai.js`, `schema.copilot.gql`, etc.
- **Resolver organization**: Separated by domain (ai, annotations, copilot, graphops, er)
- **Subscriptions**: Real-time updates via graphql-ws
- **Context**: JWT-based auth, tenant isolation, request correlation
- **Security plugins**: Custom directives for authorization

### Database Architecture

**Neo4j** (Graph Database)
- Entity nodes with properties
- Relationship edges with types
- Graph algorithms (GDS plugin)
- APOC procedures for complex operations
- Enterprise license (5.15+)

**PostgreSQL** (Relational)
- Audit logs, user data, metadata
- pg_stat_statements for performance monitoring
- Vector extensions (pgvector 0.2.1) for embeddings
- Connection pooling with optimized parameters

**Redis**
- Session management
- Real-time subscriptions
- Message pub/sub
- Socket.io adapter

**TimescaleDB**
- Time-series metrics
- Performance data collection

### Service Architecture Pattern
Each service file typically contains:
- Domain-specific business logic
- Data transformation
- Integration with databases
- Event emission for real-time updates

### Real-time WebSocket Implementation
```typescript
// uWebSockets.js server
// Features:
- JWT auth in connection handshake
- Connection pooling with backpressure management
- Topic-based subscriptions
- Heartbeat monitoring
- Redis pub/sub integration for multi-instance scaling
- Tenant isolation
```

---

## 4. EXISTING DATA VISUALIZATION IMPLEMENTATIONS

### Graph Visualization
**Location**: `/client/src/components/graph/`

1. **Cytoscape.js Based**
   - `CytoscapeGraph.jsx` (37.7KB)
   - `AdvancedGraphView.jsx` (18.7KB)
   - `EnhancedGraphExplorer.jsx` (67.6KB - large exploration interface)
   - `AdvancedCollaborativeGraph.jsx` (19.3KB)
   - Layouts: cola, fcose, dagre, cose-bilkent
   - Extensions: navigator, panzoom, context-menus, qtip, popper, grid-guide, edgehandles

2. **Advanced Analysis**
   - `KShortestPathsPanel.tsx` - Path analysis
   - `NeighborhoodStreaming.tsx` - Streaming neighborhood exploration
   - `DynamicEntityClustering.jsx` (13.6KB)
   - `CustomLayouts.js` (16.9KB)
   - `PerformanceMode.jsx` (17.4KB) - Virtual rendering for scale

3. **Supporting Features**
   - Edge inspector dialogs
   - Context menus
   - Graph collaboration demo
   - Relationship modals
   - TTP correlation overlays
   - Subgraph explorer
   - Virtualized detail panels

### Advanced Visualizations
**Location**: `/client/src/components/visualization/`

1. **DataVisualizationStudio.tsx** (28.8KB)
   - Multi-modal visualization designer
   - Interactive studio interface

2. **AdvancedNetworkAnalysis.tsx** (20.8KB)
   - Network analysis capabilities
   - Community detection visualization

3. **InteractiveGraphCanvas.tsx** (21.3KB)
   - Custom canvas-based rendering
   - Performance-optimized

### Dashboard Widgets
**Location**: `/client/src/components/dashboard/`

1. **AnalyticsDashboard.jsx** (23.6KB)
   - Multi-widget dashboard layout
   - Real-time updates

2. **Metric Widgets**
   - AttackHeatmapWidget.tsx - Heatmap of attack patterns
   - MTTTTrendWidget.tsx - Mean Time To Threat metric trends
   - LatencyPanels.tsx - Latency monitoring
   - ErrorPanels.tsx - Error tracking
   - StatsOverview.tsx - Key statistics
   - ResolverTop5.tsx - Top resolvers
   - ServiceHealthCard.js - Health visualization
   - GrafanaLinkCard.tsx - Grafana integration
   - LiveActivityFeed.tsx - Real-time activity stream

### Timeline Visualization
**Location**: `/client/src/components/timeline/`
- vis-timeline integration
- Temporal filtering and navigation
- Event correlation display

### Map/Geospatial
**Location**: `/client/src/components/geospatial/`
- Leaflet-based maps
- Location-based intelligence visualization
- Geographic filtering

### Features Using Visualization
**Location**: `/client/src/features/`
- **graph**: Graph workbench with full exploration
- **timeline**: Temporal analysis and visualization
- **link-analysis**: Relationship discovery visualization
- **observability**: System health and metrics visualization

---

## 5. REAL-TIME FEATURES

### WebSocket Stack
1. **Client Side** (`socket.js`)
   - Socket.io client 4.8.1
   - Event types: `socket:connect`, `socket:disconnect`, `graph:op`, `ai:insight`
   - Token-based auth from localStorage
   - Auto-reconnection with backoff

2. **Server Side** (`websocket/core.ts`)
   - uWebSockets.js for performance
   - Connection pooling with backpressure (64KB max)
   - Heartbeat monitoring every 30s
   - Redis adapter for multi-instance scaling
   - Tenant isolation via JWT claims
   - Topic-based subscriptions with `maestro:` prefix

### GraphQL Subscriptions
- Defined in `/server/src/graphql/subscriptions.ts`
- Uses graphql-ws protocol
- Real-time mutations trigger subscriptions
- WebSocket connection upgrade via Apollo Server plugin

### Event Streaming
1. **Graph Operations** (`graph:op`)
   - Create, update, delete entities/relationships
   - Broadcast to connected clients
   - Client-side state update via Redux

2. **AI Insights** (`ai:insight`)
   - AI analysis completions
   - Streaming from analysis services
   - Display in UI panels

3. **System Metrics**
   - Real-time performance data
   - Health status updates
   - Alert notifications

### Message Ordering
- Client-side clock (`let clock = 0`) for ordering
- Server adds timestamp to operations
- Ensures causal ordering of graph operations

---

## 6. API PATTERNS

### GraphQL API
```typescript
// Query Pattern
Query {
  investigations: [Investigation!]!
  entities(search: String, type: String): [Entity!]!
  relationships(entityId: ID): [Relationship!]!
  aiAnalysis(text: String!): AIAnalysisResult!
}

// Mutation Pattern
Mutation {
  createInvestigation(input: CreateInvestigationInput!): Investigation!
  createEntity(input: CreateEntityInput!): Entity!
  runAIAnalysis(input: AIAnalysisInput!): AIAnalysisResult!
}

// Subscription Pattern
Subscription {
  systemMetrics: SystemMetrics!
  investigationUpdates: Investigation!
  entityChanges: EntityChange!
  aiAnalysisProgress: AIAnalysisProgress!
}
```

### REST API Routes
```
/metrics                          # Prometheus metrics
/api/ai                          # AI endpoints
/api/narrative-sim               # Narrative simulation
/disclosures                     # Disclosure management
/rbac                            # RBAC operations
/search/evidence                 # Evidence search
/monitoring                      # Monitoring endpoints
/health                          # Health checks
```

### Common Data Structures
- **Envelope Pattern** (from common-types)
  - Source metadata
  - Kind (ENTITY/EDGE)
  - Payload (flexible)
  - Observability metadata (policyLabels, provenance)
  - Deduplication key

- **Entity Model**
  - ID, Kind, Payload
  - observedAt, tenantId
  - policyLabels, provenance chain

- **Edge Model**
  - ID, Type, SourceId, TargetId
  - Same metadata as Entity

### Authentication
- JWT tokens stored in localStorage (client)
- Token passed in `auth` parameter for Socket.io
- RBAC via JWT claims: tenantId, userId, roles, permissions
- Rate limiting: 600 requests per 60 seconds (default)

---

## 7. DATABASE & DATA LAYER

### Multi-Database Strategy

**Neo4j (Primary Graph Store)**
- Graph DB for entities and relationships
- GDS plugin for algorithm execution
- APOC for complex procedures
- Enterprise support for HA
- Backup strategy with persistent volumes

**PostgreSQL (Operational Data)**
- Audit trails
- User management
- Metadata
- Transactional data
- Optimization: shared_buffers=256MB, work_mem=4MB
- Connection limit: 200

**Redis (Caching & Real-time)**
- Session management
- Socket.io pub/sub adapter
- Cache layer for frequent queries
- Expiration policies

**TimescaleDB (Metrics)**
- Time-series metric collection
- Query optimization for temporal data
- Retention policies

### Data Access Patterns

1. **Repository Pattern**
   - `db/repositories/` contains domain-specific data access
   - Examples: evidenceRepo.ts, feedback.ts, audit.ts, trustRiskRepo.ts

2. **Query Optimization**
   - `db/queryOptimizer.ts` - Query planning and optimization
   - Index management via `db/indexManager.ts`
   - Statistics collection for better plans

3. **Migration System**
   - Located in `db/migrations/`
   - Version-based migration tracking
   - Schema versioning in code

### Seeding
- Demo data seeding: `seed-demo.ts`
- Configurable entity/relationship counts
- Development seeds: `seed.ts`, `seed-users.js`

---

## 8. SHARED LIBRARIES & UTILITIES

### Common Types Package
**Location**: `/packages/common-types`
- Zod schemas for validation
- Runtime type checking
- JSON schema generation
- Shared enums and constants
- Exports: Entity, Edge, Connector, Run, Secret, Envelope types

### Client Utilities
- **apolloClient**: GraphQL client setup with persisted queries
- **graphql.ts**: GraphQL utilities
- **toastBus.ts**: Toast notification system
- **utils.ts**: Helper functions
- **assistant/**: AI assistant utilities

### Server Utilities
- **lib/auth.ts**: JWT context extraction
- **lib/apollo.ts**: Apollo server utilities
- **middleware/**: Authentication, logging, error handling
- **config.ts**: Centralized configuration management

### UI Component Library
**Location**: `/client/src/ui/`
- Reusable component set
- Built on MUI + Emotion
- Custom themed components
- Graph-specific components in `ui/graph/`

---

## 9. ARCHITECTURAL PATTERNS & CONVENTIONS

### Feature Module Pattern
```
features/[feature-name]/
├── index.ts
├── components/
├── hooks/
├── services/
├── types/
└── store/  # optional Redux
```

### Service Class Pattern
- Domain-focused service classes
- Single responsibility
- Database/API integration
- Event emission for side effects
- Named exports matching class name

### GraphQL Resolver Pattern
```typescript
const resolvers = {
  Query: {
    fieldName: (parent, args, context, info) => { }
  },
  Mutation: {
    actionName: (parent, args, context, info) => { }
  },
  Subscription: {
    streamName: {
      subscribe: (parent, args, context) => { }
    }
  }
}
```

### Redux Slice Pattern
```typescript
const slice = createSlice({
  name: 'domain',
  initialState,
  reducers: { },
  extraReducers: { }
})
```

### Component Organization
- Feature components in `components/`
- Domain-specific subdirectories
- Page templates in `pages/`
- UI library in `ui/`

---

## 10. OBSERVABILITY & MONITORING

### OpenTelemetry Integration
- Jaeger exporter for distributed tracing
- Prometheus exporter for metrics
- Span context propagation
- Automatic instrumentation of Node.js

### Metrics Collection
- Prometheus format export at `/metrics`
- Active connection metrics
- Request latency tracking
- Error rate monitoring
- Business metrics (entity count, relationship count, etc.)

### Logging
- Pino logger for performance
- Structured JSON logging
- Request/response logging via pino-http
- Morgan for HTTP traffic logging
- Redacted authorization headers

### Monitoring Infrastructure
**Location**: `/observability/`
- Prometheus configuration
- Alert rules
- Grafana dashboards
- SLO definitions
- Anomaly detection config

---

## 11. DEPLOYMENT & INFRASTRUCTURE

### Docker Compose Services
- **Neo4j**: Graph database (enterprise)
- **PostgreSQL**: Relational data
- **Redis**: Caching and pub/sub
- **Server**: API server
- **Client**: Frontend application
- **Monitoring**: Prometheus, Grafana, Jaeger

### Build & Deploy
- **Client**: Vite build → static assets
- **Server**: TypeScript compilation → Node.js runtime
- **Tests**: Jest (server), Vitest + Playwright (client)

### Configuration
- `.env` files with sensible defaults
- Environment-specific configs
- Docker environment variables
- Database connection pooling
- Rate limiting tuning

---

## 12. RECOMMENDED ARCHITECTURE FOR NEW VISUALIZATION SYSTEM

Based on the current architecture, a new visualization system should:

1. **Use Existing Patterns**
   - Redux slices for visualization state
   - Socket.io for real-time updates
   - Cytoscape/D3 for new visualization types
   - React hooks for component logic

2. **Leverage Existing Libraries**
   - Reuse graph visualization infrastructure
   - Use MUI for consistent UI
   - Follow React 18 patterns with hooks

3. **Integration Points**
   - New resolver in GraphQL for visualization queries
   - New service class for visualization business logic
   - WebSocket events for real-time updates
   - Redux slice for state management

4. **Package It As**
   - Feature module in `/client/src/features/advanced-dashboard/`
   - Components in `/client/src/components/visualization/`
   - Services in `/client/src/services/`
   - GraphQL schema additions in `/server/src/graphql/`
   - New service classes in `/server/src/services/`

5. **Follow Existing Conventions**
   - TypeScript strict mode
   - Zod for data validation
   - Jest/Vitest for tests
   - Playwright for E2E testing
   - GraphQL subscription pattern for real-time

---

## Key Technologies Summary

### Frontend Stack
- React 18 + TypeScript
- Redux Toolkit for state
- Apollo Client for GraphQL
- Cytoscape/D3/Leaflet for visualization
- Socket.io for real-time
- Vite for bundling
- MUI + Emotion for styling

### Backend Stack
- Express 5 + TypeScript
- Apollo Server for GraphQL
- Neo4j + PostgreSQL + Redis databases
- uWebSockets for real-time
- BullMQ for job queues
- OpenTelemetry for observability

### Databases
- Neo4j 5.15 (graph)
- PostgreSQL 15 (relational)
- Redis 7 (cache)
- TimescaleDB (metrics)

### DevOps
- Docker & Docker Compose
- Prometheus & Grafana
- Jaeger distributed tracing
- Kubernetes-ready manifests

---

## Current Code Metrics

- **Frontend**: 33 source directories, 64+ component directories
- **Backend**: 150+ service files, 70+ route/resolver groups
- **Services**: 150+ domain-specific services
- **Packages**: 60+ reusable packages
- **Tests**: Jest + Vitest + Playwright suites
- **Configuration**: Multi-environment support

