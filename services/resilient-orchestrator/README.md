# Resilient Workflow Orchestrator

Massive-scale, resilient automation workflows across hybrid, denied, or degraded network environments.

## Features

- **Adaptive Routing**: Dynamic route calculation with Dijkstra's algorithm, handling node failures and network degradation
- **Satellite Communications**: Store-and-forward messaging, priority queuing, bandwidth management for LEO/GEO/MEO constellations
- **Automatic Failover**: Multi-path redundancy with primary/secondary/satellite/mesh channel prioritization
- **Self-Healing**: Checkpoint-based recovery, task rerouting, graceful degradation
- **Real-Time Reporting**: WebSocket-based command reporting with classification handling
- **Coalition Federation**: Federated task execution across coalition partners with trust management

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    WorkflowOrchestrator                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Network    │  │  Satellite   │  │     Failover         │  │
│  │  Topology    │  │    Comm      │  │    Controller        │  │
│  │   Manager    │  │   Handler    │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Self-Healing │  │   Command    │  │     Coalition        │  │
│  │    Engine    │  │   Reporter   │  │    Federator         │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Start with default config
pnpm dev

# Or with custom configuration
REDIS_URL=redis://localhost:6379 \
NODE_ID=command-node-1 \
REPORTING_PORT=8080 \
pnpm dev
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `NODE_ID` | Auto-generated | Unique node identifier |
| `REPORTING_PORT` | `8080` | WebSocket reporting port |
| `HTTP_PORT` | `3000` | HTTP health/metrics port |
| `MAX_WORKFLOWS` | `100` | Max concurrent workflows |
| `MAX_TASKS` | `1000` | Max concurrent tasks |

## API Endpoints

- `GET /health` - Health status with statistics
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe
- `GET /metrics` - Prometheus metrics
- `GET /stats` - Detailed orchestrator statistics

## Usage

```typescript
import { WorkflowOrchestrator } from '@intelgraph/resilient-orchestrator';

const orchestrator = new WorkflowOrchestrator();
await orchestrator.start();

// Submit a workflow
const workflow = await orchestrator.submitWorkflow({
  name: 'data-collection',
  version: '1.0.0',
  priority: 'high',
  tasks: [
    { name: 'collect', type: 'data-collection', dependencies: [], timeout: 60000, input: {} },
    { name: 'process', type: 'data-processing', dependencies: ['collect'], timeout: 120000, input: {} },
    { name: 'report', type: 'reporting', dependencies: ['process'], timeout: 30000, input: {} },
  ],
  owner: 'system',
  metadata: {},
});

// Start execution
await orchestrator.startWorkflow(workflow.id);
```

## Healing Strategies

1. **Retry**: Exponential backoff for transient failures
2. **Reroute**: Reassign task to healthy node
3. **Failover**: Switch communication channel
4. **Checkpoint Resume**: Resume from last saved state
5. **Store-Forward**: Queue for later transmission
6. **Graceful Degradation**: Skip non-critical tasks

## Network Conditions

- `nominal`: Normal operation
- `degraded`: Reduced performance, increased latency
- `denied`: No direct connectivity, requires alternative routing
- `satellite-only`: Only satellite links available
- `offline`: Node completely unreachable

## Coalition Federation

Register partners and delegate tasks:

```typescript
const federator = orchestrator.getCoalitionFederator();

federator.registerPartner({
  name: 'Partner Alpha',
  classification: 'secret',
  endpoints: [{ protocol: 'tcp', address: 'partner.example.com', port: 8080, ... }],
  capabilities: ['imagery', 'signals'],
  trustLevel: 0.8,
  active: true,
  sharedWorkflows: [],
});

await federator.delegateTask(task, 'partner-id', 'execute');
```

## Metrics

Prometheus metrics available at `/metrics`:

- `resilient_orchestrator_workflows_total`
- `resilient_orchestrator_tasks_total`
- `resilient_orchestrator_healing_actions_total`
- `resilient_orchestrator_failovers_total`
- `resilient_orchestrator_satellite_queue_depth`
- `resilient_orchestrator_coalition_partners_active`
