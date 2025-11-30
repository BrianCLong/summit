# Scenario Engine Service

What-If & Counterfactual Modeling Engine for IntelGraph

## Overview

The Scenario Engine Service provides a sandbox environment for analysts and models to explore counterfactual scenarios without affecting production data. It enables:

- **Sandbox Scenarios**: Isolated copies of graph/case subsets
- **What-If Operations**: Add/remove/alter nodes and edges, adjust timings, enable/disable rules
- **Impact Metrics**: Compute deltas from baseline including detection time, path lengths, centrality, and risk scores
- **Scenario Comparison**: Compare multiple scenarios to understand the impact of different interventions

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Scenario Engine Service                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Routes    │  │ Middleware  │  │     Express Server      │  │
│  │             │  │             │  │                         │  │
│  │ /scenarios  │  │ tenantGuard │  │  GET  /health           │  │
│  │ /whatif     │  │ correlation │  │  GET  /metrics          │  │
│  │ /analytics  │  │             │  │  POST /api/v1/...       │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘  │
│         │                │                       │               │
│  ┌──────▼────────────────▼───────────────────────▼──────────────┐│
│  │                      Services Layer                          ││
│  │  ┌────────────────┐  ┌─────────────────┐  ┌───────────────┐  ││
│  │  │ ScenarioStore  │  │ WhatIfOperations│  │ScenarioAnalytics││
│  │  │                │  │                 │  │               │  ││
│  │  │ CRUD, Branching│  │ Node/Edge ops   │  │ Centrality    │  ││
│  │  │ Versioning     │  │ Timing ops      │  │ Path metrics  │  ││
│  │  │ Lifecycle      │  │ Rule ops        │  │ Risk metrics  │  ││
│  │  └───────┬────────┘  └────────┬────────┘  └───────┬───────┘  ││
│  │          │                    │                    │          ││
│  │  ┌───────▼────────────────────▼────────────────────▼───────┐ ││
│  │  │                    SandboxGraph                         │ ││
│  │  │                                                         │ ││
│  │  │  Copy-on-Write Delta Overlay over Source Graph          │ ││
│  │  │  • Fast creation from templates                         │ ││
│  │  │  • Isolated modifications                               │ ││
│  │  │  • Full audit trail                                     │ ││
│  │  └─────────────────────────────────────────────────────────┘ ││
│  └──────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │    Source Graph Provider      │
              │    (Graph Core / Neo4j)       │
              │    READ-ONLY ACCESS           │
              └───────────────────────────────┘
```

## Key Features

### 1. Sandbox Graph (Copy-on-Write)

The `SandboxGraph` implements a delta overlay model:
- References source graph data without copying
- Applies modifications as an overlay
- Never mutates production data
- Supports fast cloning for scenario branching

### 2. What-If Operations

Support for comprehensive scenario manipulation:
- **Node Operations**: Add, remove, update entities
- **Edge Operations**: Add, remove, update relationships
- **Timing Operations**: Delay/advance event timestamps
- **Rule Operations**: Enable/disable detection rules with parameters
- **Parameter Operations**: Set scenario-wide parameters

### 3. Analytics & Metrics

Compute graph metrics within scenario context:
- **Centrality**: PageRank, Betweenness, Closeness, Eigenvector
- **Paths**: Average path length, diameter
- **Clustering**: Clustering coefficient, connected components
- **Risk**: Aggregate risk scores, risk distribution
- **Detection**: Coverage, average detection time

### 4. Delta Computation

Compare scenarios and track changes:
- Absolute and relative deltas
- Significance detection
- Structural differences (added/removed/modified nodes/edges)

## API Reference

### Scenarios

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/scenarios` | Create a new scenario |
| GET | `/api/v1/scenarios` | List scenarios for tenant |
| GET | `/api/v1/scenarios/:id` | Get scenario details |
| PATCH | `/api/v1/scenarios/:id` | Update scenario metadata |
| DELETE | `/api/v1/scenarios/:id` | Delete a scenario |
| POST | `/api/v1/scenarios/:id/branch` | Create a branch |
| POST | `/api/v1/scenarios/:id/snapshot` | Snapshot current state |
| POST | `/api/v1/scenarios/:id/activate` | Activate scenario |
| POST | `/api/v1/scenarios/:id/archive` | Archive scenario |

### What-If Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/whatif/:id/execute` | Execute single operation |
| POST | `/api/v1/whatif/:id/execute-batch` | Execute batch operations |
| POST | `/api/v1/whatif/:id/entities` | Add entity |
| DELETE | `/api/v1/whatif/:id/entities/:entityId` | Remove entity |
| POST | `/api/v1/whatif/:id/relationships` | Create relationship |
| DELETE | `/api/v1/whatif/:id/relationships/:relId` | Remove relationship |
| POST | `/api/v1/whatif/:id/delay-event` | Delay an event |
| POST | `/api/v1/whatif/:id/rules/:ruleId/enable` | Enable rule |
| POST | `/api/v1/whatif/:id/rules/:ruleId/disable` | Disable rule |
| POST | `/api/v1/whatif/:id/rollback/:deltaSetId` | Rollback changes |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/analytics/:id/compute` | Compute metrics |
| GET | `/api/v1/analytics/:id/metrics` | Get stored metrics |
| POST | `/api/v1/analytics/:id/baseline` | Set baseline |
| GET | `/api/v1/analytics/:id/baseline` | Get baseline |
| GET | `/api/v1/analytics/:id/deltas` | Get deltas from baseline |
| GET | `/api/v1/analytics/:id/export` | Export graph |
| GET | `/api/v1/analytics/:id/top-nodes` | Get top nodes by metric |
| POST | `/api/v1/analytics/compare` | Compare two scenarios |

## Usage Examples

### Create a Scenario

```bash
curl -X POST http://localhost:3500/api/v1/scenarios \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: tenant-001" \
  -H "X-User-Id: analyst-001" \
  -d '{
    "name": "Supply Chain Disruption Analysis",
    "description": "What if key supplier goes offline?",
    "mode": "sandbox",
    "params": {
      "sourceNodeIds": ["supplier-123"],
      "includeNeighbors": true,
      "neighborDepth": 2,
      "maxNodes": 1000
    },
    "assumptions": ["Supplier X becomes unavailable for 30 days"],
    "tags": ["supply-chain", "disruption"]
  }'
```

### Execute What-If Operation

```bash
curl -X POST http://localhost:3500/api/v1/whatif/{scenarioId}/execute \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: tenant-001" \
  -d '{
    "operation": {
      "removeNode": {
        "nodeId": "supplier-123",
        "cascade": true
      }
    },
    "description": "Remove supplier to simulate outage"
  }'
```

### Compute and Compare Metrics

```bash
# Compute metrics
curl -X POST http://localhost:3500/api/v1/analytics/{scenarioId}/compute \
  -H "X-Tenant-Id: tenant-001"

# Compare two scenarios
curl -X POST http://localhost:3500/api/v1/analytics/compare \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: tenant-001" \
  -d '{
    "scenario1Id": "baseline-scenario-id",
    "scenario2Id": "disruption-scenario-id"
  }'
```

## Security & Guardrails

### Production Data Protection

The service implements strict guardrails:

1. **Environment Label**: All scenarios are marked `environment: 'non-production'`
2. **Tenant Isolation**: Each scenario is scoped to a tenant
3. **Read-Only Source Access**: Source graph provider is read-only
4. **No Leakback**: Changes never propagate to production graphs
5. **Production Block**: Requests with `X-Environment: production` are rejected

### Required Headers

| Header | Required | Description |
|--------|----------|-------------|
| `X-Tenant-Id` | Yes | Tenant identifier |
| `X-User-Id` | No | User identifier (defaults to 'anonymous') |
| `X-Correlation-Id` | No | Request correlation ID |

## Development

### Prerequisites

- Node.js >= 18
- pnpm >= 9

### Setup

```bash
cd services/scenario-engine-service
pnpm install
```

### Run Development Server

```bash
pnpm dev
```

### Run Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch
```

### Build

```bash
pnpm build
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3500 | Server port |
| `MAX_SCENARIOS_PER_TENANT` | 100 | Maximum scenarios per tenant |
| `DEFAULT_RETENTION_DAYS` | 30 | Default scenario retention |
| `ENABLE_AUTO_CLEANUP` | true | Enable automatic cleanup job |

## Integration with IntelGraph

The Scenario Engine integrates with:

- **Graph Core**: Source graph provider for copy-on-write
- **Graph Algorithms**: Centrality and path algorithms
- **Analytics Service**: Risk and detection metrics
- **Policy Engine**: Rule evaluation in scenario context

## Data Model

### Scenario

```typescript
interface Scenario {
  id: string;
  name: string;
  description?: string;
  mode: 'sandbox' | 'simulation' | 'counterfactual' | 'forecast';
  status: 'draft' | 'active' | 'computing' | 'completed' | 'archived' | 'failed';
  params: ScenarioParams;
  policy: ScenarioPolicyLabels;
  graphId?: string;
  deltaSets: DeltaSet[];
  baselineMetrics?: OutcomeMetrics;
  currentMetrics?: OutcomeMetrics;
  assumptions: string[];
  tags: string[];
  version: number;
  parentScenarioId?: string;
  childScenarioIds: string[];
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
}
```

### Delta Operations

```typescript
type DeltaOperationType =
  | 'add_node'
  | 'remove_node'
  | 'update_node'
  | 'add_edge'
  | 'remove_edge'
  | 'update_edge'
  | 'adjust_timing'
  | 'enable_rule'
  | 'disable_rule'
  | 'set_parameter';
```

## License

MIT License - see LICENSE file for details.
