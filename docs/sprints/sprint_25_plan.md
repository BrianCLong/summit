# Summit Sprint 25+ Design & Planning

## Executive Summary
This document outlines the architectural design and work plan for the Q4 2025 "Strategic Sprint" focused on Provenance, Predictive Analytics, Governance, and Agentic Automation. The goal is to elevate the platform from a "reactive" graph tool to a "proactive" intelligence system with high-assurance governance.

### Core Design Decisions
1.  **Provenance as Truth**: The `ProvenanceLedger` is the single source of truth. We will extend it to track "AI Inference" and "Analytic" events, ensuring every insight displayed to a user can be traced back to raw telemetry.
2.  **Predictive Modularity**: The `PredictiveService` will be decoupled from the core graph. It will consume "Snapshots" (subgraphs) and output "Forecasts" (time-series). This separation ensures that heavy ML jobs don't block the operational graph.
3.  **Governance by Default**: OPA policies will move from "audit" (checking logs) to "gate" (checking requests) for critical operations like Model Deployment and Dataset Export.
4.  **Agentic Testing**: We will implement a dedicated `SyntheticDataService` (Agent) that continuously fusses the system with realistic scenarios (e.g., "Coordinated Inauthentic Behavior" patterns) to validate detection logic.

---

## 1. Provenance & Lineage System

### Task List
- [ ] **Schema Expansion**: Update `ProvenanceEntry` type to support `InferenceEvent` and `AnalyticsOutput` subtypes.
- [ ] **Ledger Upgrade**: Add `trackInference(modelId, inputHash, outputHash)` method to `ProvenanceLedger`.
- [ ] **Traceability API**: Implement `GET /api/provenance/lineage/{entityId}` returning a directed graph of events.
- [ ] **Visualization**: Create `LineageGraph` React component using `react-flow` or `vis-js` to render the event chain.

### Proposed Schema (TypeScript)
```typescript
interface InferenceEvent extends ProvenanceEntry {
  actionType: 'AI_INFERENCE';
  payload: {
    modelId: string;
    modelVersion: string;
    inputHash: string; // Hash of the input prompt/data
    outputHash: string; // Hash of the generated response
    confidence: number;
    tokens: { prompt: number; completion: number };
  };
}

interface AnalyticsOutput extends ProvenanceEntry {
  actionType: 'ANALYTICS_COMPUTE';
  payload: {
    algorithm: 'pagerank' | 'community_detection';
    parameters: Record<string, any>;
    snapshotId: string; // Reference to the graph state used
  };
}
```

### API Design
- `GET /api/provenance/lineage/:id`
    - Returns: `{ nodes: ProvenanceNode[], edges: ProvenanceEdge[] }`
    - `nodes` represent Artifacts (Data, Model, Insight).
    - `edges` represent Actions (Ingested, Transformed, Inferred).

---

## 2. Predictive Analytics Module

### Task List
- [ ] **Schema Definition**: Define `Forecast` and `RiskScore` types in GraphQL schema.
- [ ] **Service Implementation**: Enhance `PredictiveService` to support pluggable "Forecasting Models" (e.g., ARIMA, Prophet, or simple Heuristics for MVP).
- [ ] **Integration**: Connect `PredictiveService` to `ProvenanceLedger` to read historical metric data.
- [ ] **UI**: Build `PredictiveDashboard` widget showing "Risk Forecast" charts with confidence intervals.

### GraphQL Schema Draft
```graphql
type ForecastPoint {
  timestamp: String!
  value: Float!
  confidenceLow: Float
  confidenceHigh: Float
}

type RiskForecast {
  entityId: ID!
  metric: String!
  horizon: String! # e.g. "7d"
  points: [ForecastPoint!]!
  modelUsed: String!
}

extend type Query {
  getRiskForecast(entityId: ID!, metric: String!): RiskForecast
}
```

---

## 3. Agent-Driven Test Data Generator

### Task List
- [ ] **Service Creation**: Create `server/src/testing/SyntheticDataService.ts`.
- [ ] **Scenario Builder**: Implement "Scenario" definitions (e.g., `SocialBotnet`, `FinancialFraudRing`).
- [ ] **Generator Logic**: Use `faker.js` + graph patterns to generate coherent subgraphs (Nodes + Edges + Time-series).
- [ ] **API Trigger**: Expose `POST /api/testing/generate` (Admin only) to trigger scenarios.

### Design Pattern
- **Scenario Interface**:
  ```typescript
  interface Scenario {
    name: string;
    description: string;
    generate(context: GenerationContext): Promise<GraphData>;
  }
  ```
- **Execution**: The service runs a Scenario, converts the output to `IngestionEvents`, and pushes them to the standard `IngestionPipeline` to test the full stack.

---

## 4. Governance & Policy Automation

### Task List
- [ ] **Policy Authoring**: Create `policy/ai_safety.rego` to block high-risk AI prompts/responses.
- [ ] **Policy Authoring**: Create `policy/predictive_access.rego` to restrict who can view future-risk scores.
- [ ] **Enforcement Hook**: Add `PolicyEnforcementMiddleware` to `PredictiveService` and `AIInferenceService`.
- [ ] **CI Check**: Add `governance-check` step to CI to validate all `.rego` files are syntactically correct and pass unit tests.

### OPA Policy Example (`predictive_access.rego`)
```rego
package predictive.access

default allow = false

allow {
    input.user.role == "analyst"
    input.resource.sensitivity == "low"
}

allow {
    input.user.role == "risk_officer"
    # Risk officers can see everything
}
```

---

## 5. Golden Path CI Enhancements

### Task List
- [ ] **Dependency Scanning**: Integrate `trivy` or `npm audit` into `ci-security.yml`.
- [ ] **Provenance Check**: Add a script `scripts/ci/check_provenance_coverage.sh` that greps for `@trace` or `provenance.log()` calls in new code.
- [ ] **Policy Test**: Update `workflows/governance-check.yml` to run `opa test ./policy`.
- [ ] **Rollback Automation**: Add a `on: failure` hook in the deployment workflow to trigger a rollback if the "Smoke Test" fails.

### Testing Blueprint
- **Unit Tests**: Jest for all services (`PredictiveService`, `ProvenanceLedger`).
- **Integration Tests**: Supertest for APIs (`/api/provenance`, `/api/predictive`).
- **Policy Tests**: Rego unit tests for all new policies.
- **E2E Tests**: Playwright test ensuring a user can:
    1.  Log in.
    2.  View an entity.
    3.  See its Lineage Graph.
    4.  See its Risk Forecast.

---
