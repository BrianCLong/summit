# Digital Twin Platform

Next-generation Digital Twin platform for Summit/IntelGraph that provides:

- **Automatic twin generation** from real-world entity data
- **Multi-physics simulation** (Monte Carlo, Agent-Based, System Dynamics, Hybrid)
- **Real-time streaming integration** via Kafka
- **Bayesian state estimation** with confidence tracking
- **Full provenance chain** for audit and compliance

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Digital Twin Platform                        │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────┤
│  GraphQL    │   Stream    │  State      │ Simulation  │  Event  │
│  API        │   Ingestion │  Estimator  │ Engine      │  Bus    │
├─────────────┴─────────────┴─────────────┴─────────────┴─────────┤
│                        Twin Repository                           │
├──────────────────┬──────────────────┬───────────────────────────┤
│   PostgreSQL     │     Neo4j        │         Redis             │
│   (canonical)    │   (graph)        │       (cache)             │
└──────────────────┴──────────────────┴───────────────────────────┘
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
```

## API Endpoints

- `GET /health` - Health check
- `GET /health/ready` - Readiness probe
- `POST /graphql` - GraphQL endpoint

## GraphQL Operations

```graphql
# Create a twin
mutation {
  createTwin(input: {
    name: "Asset-001"
    type: SYSTEM
    initialState: { temperature: 25, pressure: 101 }
  }) {
    metadata { id name }
    state
  }
}

# Run simulation
mutation {
  runSimulation(input: {
    twinId: "uuid"
    config: {
      engine: MONTE_CARLO
      timeHorizon: 30
      timeStep: 1
      iterations: 1000
      parameters: { temperature_volatility: 0.05 }
    }
  }) {
    outcomes { scenario probability metrics }
    insights
    recommendations
  }
}
```

## Simulation Engines

| Engine | Use Case | Output |
|--------|----------|--------|
| MONTE_CARLO | Uncertainty quantification | Distribution statistics |
| AGENT_BASED | Multi-actor dynamics | Emergent behavior |
| SYSTEM_DYNAMICS | Feedback loops | Equilibrium states |
| HYBRID | Combined analysis | Ensemble predictions |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4100 | Server port |
| DATABASE_URL | postgresql://localhost:5432/intelgraph | PostgreSQL connection |
| REDIS_URL | redis://localhost:6379 | Redis connection |
| NEO4J_URI | bolt://localhost:7687 | Neo4j connection |
| KAFKA_BROKERS | localhost:9092 | Kafka brokers |
