# Predictive & Simulation Engine (GA)

## Overview
The Predictive & Simulation Engine ("Scenario Lab") provides risk forecasting, what-if analysis, and campaign simulation capabilities over the graph data. It operates purely on snapshot views of the graph, ensuring no side effects on the production data store.

## Architecture
The service is located in `server/src/predictive/` and exposes a REST API.
It utilizes an in-memory `SimpleGraphEngine` to perform graph algorithms (Centrality, Communities, PageRank) on transient data.

### Key Components
- **PredictiveService**: Orchestrator for fetching data and running models.
- **SimpleGraphEngine**: In-memory graph analysis for "what-if" scenarios.
- **Forecasting**: Pure functions for Time-Series analysis (ARIMA-lite, Exponential Smoothing).
- **CampaignSimulator**: Logic for simulating information spread or campaign progression.

## APIs

All APIs require a `legalBasis` object in the request body for governance authorization.

### 1. Risk Forecasting
`POST /api/predictive/forecast/risk`

**Input:**
```json
{
  "entityId": "string",
  "metric": "risk",
  "horizon": 7,
  "legalBasis": {
    "purpose": "Risk Assessment",
    "policyId": "POL-001"
  }
}
```

**Output:**
Returns historical data and forecasted values with confidence intervals.

### 2. What-If Scenarios
`POST /api/predictive/simulate/what-if`

Allows injecting hypothetical nodes and edges into a graph snapshot to see how metrics change.

**Input:**
```json
{
  "investigationId": "inv-123",
  "injectedNodes": [{ "id": "h1", "label": "Person", "properties": {} }],
  "injectedEdges": [{ "source": "h1", "target": "existing-node", "type": "CONTACT" }],
  "legalBasis": { ... }
}
```

**Output:**
Returns `baselineMetrics`, `scenarioMetrics`, and the `delta` (change in density, centrality, etc.).

### 3. Campaign Simulation
`POST /api/predictive/simulate/campaign`

Simulates the spread of a campaign from seed entities.

**Input:**
```json
{
  "investigationId": "inv-123",
  "seedEntityIds": ["seed-1", "seed-2"],
  "steps": 5,
  "parameters": {
    "spreadProbability": 0.5,
    "decayFactor": 0.1
  },
  "legalBasis": { ... }
}
```

**Output:**
Returns a step-by-step trajectory of infected nodes and impact assessment.

## Models

### Forecasting
We use interpretable statistical models:
- **Simple Moving Average (SMA)**
- **Exponential Smoothing (ETS)**
- **Linear Trend**

### Simulation
- **Graph Dynamics**: Simulated using BFS-based propagation with probabilistic edges.
- **Metrics**: Standard graph metrics (PageRank, Degree Centrality, Density, Connected Components).

## Usage Example
```typescript
import { PredictiveService } from '../predictive/PredictiveService';

const service = new PredictiveService();
const forecast = await service.forecastRisk({ ... });
```
