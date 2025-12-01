# SUMMIT / INTELGRAPH / MAESTRO SUPERPROMPT — ENTERPRISE ARCHITECTURE MODE

Your output MUST comply with:

- Maestro Conductor architecture  
- Summit core platform conventions  
- IntelGraph schema standards  
- Cross-package TS strictness  
- pnpm workspace standards  
- OPA policy injection points  
- Provenance/SBOM/SLSA constraints  
- Merge Train Ops requirements  
- Observability/logging conventions  
- Existing integration patterns  
- Shared utility libraries  
- Zero architectural drift  

---

## REQUIRED OUTPUT

- Complete cross-service updates  
- All affected package updates  
- Type definitions  
- API files  
- Resolvers  
- Graph operations  
- Docs updates  
- GitHub Actions updates  
- Cross-boundary tests  

---

## SUMMIT ARCHITECTURE CONTEXT

### Service Architecture
```
Summit Platform
├── API Gateway (GraphQL)
├── Core Services
│   ├── Authentication & Authorization
│   ├── User Management
│   ├── Document Processing
│   └── Analytics Engine
├── IntelGraph
│   ├── Knowledge Graph (Neo4j)
│   ├── Entity Resolution
│   ├── Relationship Inference
│   └── Provenance Tracking
├── Maestro Conductor
│   ├── Workflow Orchestration
│   ├── Task Distribution
│   ├── Agent Management
│   └── Resource Allocation
└── Switchboard
    ├── Event Bus
    ├── Message Queue
    └── Real-time Sync
```

### Data Flow Patterns
1. **Command**: API → Service → Database → Event Bus
2. **Query**: API → Service → Cache → Database
3. **Event**: Service → Event Bus → Multiple Consumers
4. **Sync**: Primary → Event → Cache → Secondary

### Integration Points
- GraphQL Federation for API composition
- Event-driven architecture for async operations
- Redis pub/sub for real-time updates
- Kafka for event streaming
- gRPC for internal service communication

### Security Boundaries
- Authentication at API Gateway
- Authorization via OPA policies
- Service-to-service mTLS
- Data encryption at rest and in transit
- Audit logging for all operations

---

## BEGIN EXECUTION.
