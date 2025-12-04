# IntelGraph Simulation Harness

> **Purpose**: Automated scenario generation and evaluation framework for IntelGraph platform regression testing and model comparison.

## Overview

The Simulation Harness provides repeatable, deterministic testing for:
- **Copilot AI** behavior across versions
- **Analytics engines** for graph queries
- **UI workflows** via API-driven "ghost analysts"

## Architecture

```
sim-harness/
├── src/
│   ├── generator/       # Scenario data generation
│   ├── analyst/         # Ghost analyst workflow driver
│   ├── metrics/         # Metrics collection & reporting
│   ├── utils/           # Common utilities
│   └── types/           # TypeScript type definitions
├── test-data/
│   ├── scenarios/       # Scenario templates (YAML/JSON)
│   └── expectations/    # Expected outcomes for validation
├── reports/             # Generated evaluation reports
└── scripts/             # CLI and automation scripts
```

## Key Features

### 1. Scenario Generator
- **Templated scenarios**: Fraud rings, terror cells, corruption networks
- **Parameterization**: Graph size, noise level, missing data
- **Deterministic**: Fixed seeds for reproducibility
- **Output formats**: JSON compatible with IntelGraph ingestion APIs

### 2. Ghost Analyst
- **Scripted workflows**: YAML/JSON-defined investigation paths
- **API-driven**: Interacts only via public GraphQL/REST APIs
- **LLM integration**: Optional AI-driven exploration (future)
- **Session replay**: Record and replay analyst sessions

### 3. Metrics & Reporting
- **Performance**: Query latency, time-to-insight
- **Correctness**: Entity coverage, relationship discovery
- **Comparison**: Diff reports between builds/versions
- **Output formats**: JSON, CSV, HTML dashboards

## Quick Start

### Installation

```bash
# From repo root
pnpm install

# Build harness
cd packages/sim-harness
pnpm build
```

### Running a Scenario

```bash
# Run built-in fraud ring scenario
pnpm run-scenario --scenario fraud-ring --size medium

# Run with custom config
pnpm run-scenario --config ./test-data/scenarios/custom.yaml --seed 42

# Compare two builds
pnpm run-scenario --scenario terror-cell --baseline v1.2.0 --candidate v1.3.0
```

## Usage

### 1. Generate Scenario Data

```typescript
import { ScenarioGenerator } from '@intelgraph/sim-harness';

const generator = new ScenarioGenerator({
  template: 'fraud-ring',
  params: {
    nodeCount: 50,
    edgeDensity: 0.3,
    noiseLevel: 0.1,
    seed: 12345
  }
});

const scenario = await generator.generate();
// scenario.entities, scenario.relationships, scenario.signals
```

### 2. Run Ghost Analyst

```typescript
import { GhostAnalyst } from '@intelgraph/sim-harness';

const analyst = new GhostAnalyst({
  apiUrl: 'http://localhost:4000/graphql',
  script: './test-data/scenarios/fraud-investigation.yaml'
});

const session = await analyst.run({
  scenarioId: scenario.id,
  timeoutMs: 300000
});

console.log(session.metrics);
// { queriesIssued: 45, entitiesFound: 48, timeToInsight: 12500 }
```

### 3. Generate Report

```typescript
import { MetricsCollector } from '@intelgraph/sim-harness';

const collector = new MetricsCollector();
collector.addSession(session);

const report = await collector.generateReport({
  format: 'html',
  output: './reports/fraud-ring-eval.html'
});
```

## Scenario Templates

### Built-in Templates

| Template | Description | Default Size | Key Metrics |
|----------|-------------|--------------|-------------|
| **fraud-ring** | Financial fraud network | 50 entities, 80 edges | Transaction anomalies, shell companies |
| **terror-cell** | Terror network topology | 30 entities, 45 edges | Communication patterns, safe houses |
| **corruption-network** | Government corruption | 40 entities, 70 edges | Bribery chains, shell companies |
| **smuggling-operation** | Cross-border smuggling | 60 entities, 100 edges | Border crossings, logistics nodes |

### Custom Templates

Create YAML templates in `test-data/scenarios/`:

```yaml
name: custom-fraud-scenario
type: financial-crime
params:
  nodeCount: 100
  edgeDensity: 0.25
  seed: 42

entities:
  - type: PERSON
    distribution:
      count: 40
      attributes:
        role: [analyst, executive, intermediary]
        risk_score: normal(50, 15)

  - type: ORGANIZATION
    distribution:
      count: 30
      attributes:
        sector: [finance, tech, shell]
        risk_score: normal(60, 20)

relationships:
  - type: OWNS
    from: PERSON
    to: ORGANIZATION
    probability: 0.3

  - type: TRANSACTS_WITH
    from: ORGANIZATION
    to: ORGANIZATION
    probability: 0.5
    attributes:
      amount: lognormal(100000, 50000)
      timestamp: daterange(2024-01-01, 2024-12-31)

signals:
  - type: anomaly
    entities: [suspicious-transaction-pattern]
    count: 5

  - type: missing_data
    probability: 0.1
```

## Ghost Analyst Scripts

Define investigation workflows in YAML:

```yaml
name: fraud-investigation-workflow
description: Standard fraud investigation flow

steps:
  - name: create-investigation
    action: graphql-mutation
    query: |
      mutation CreateInvestigation($input: CreateInvestigationInput!) {
        createInvestigation(input: $input) { id }
      }
    variables:
      input:
        name: "{{scenario.name}}"
        type: "FRAUD_ANALYSIS"

  - name: search-high-risk-entities
    action: graphql-query
    query: |
      query SearchEntities($risk_threshold: Int!) {
        entities(filter: { risk_score: { gte: $risk_threshold }}) {
          id name type properties
        }
      }
    variables:
      risk_threshold: 70
    assertions:
      - entities.length >= 5

  - name: discover-relationships
    action: graphql-query
    query: |
      query GetRelationships($entityIds: [ID!]!) {
        relationships(filter: { fromEntityId: { in: $entityIds }}) {
          id type fromEntityId toEntityId
        }
      }
    variables:
      entityIds: "{{steps.search-high-risk-entities.result.entities[*].id}}"
    assertions:
      - relationships.length >= 10

  - name: copilot-analysis
    action: graphql-mutation
    query: |
      mutation StartCopilot($goal: String!, $investigationId: ID!) {
        startCopilotRun(goal: $goal, investigationId: $investigationId) {
          id status
        }
      }
    variables:
      goal: "Identify key players and transaction anomalies"
      investigationId: "{{steps.create-investigation.result.id}}"

  - name: wait-for-copilot
    action: poll
    endpoint: /copilot/runs/{{steps.copilot-analysis.result.id}}
    until: status == "COMPLETED"
    timeout: 120000
    interval: 2000
```

## Metrics

### Captured Metrics

**Performance:**
- Query latency (p50, p95, p99)
- Time to first insight
- Total session duration
- API call count

**Correctness:**
- Entity discovery rate (found / expected)
- Relationship coverage
- False positive rate
- False negative rate

**System:**
- Memory usage
- CPU utilization
- Error rate
- Retry count

### Report Formats

**JSON:**
```json
{
  "scenarioId": "fraud-ring-001",
  "timestamp": "2025-11-24T12:00:00Z",
  "metrics": {
    "performance": {
      "totalDuration": 45000,
      "queryLatency": { "p50": 120, "p95": 450, "p99": 890 },
      "timeToFirstInsight": 5200
    },
    "correctness": {
      "entitiesFound": 48,
      "entitiesExpected": 50,
      "discoveryRate": 0.96,
      "falsePositives": 2
    }
  }
}
```

**HTML Dashboard:**
- Interactive charts (Chart.js)
- Comparison tables
- Drill-down details
- Export to CSV

## Safety & Isolation

### Non-Production Guarantees

1. **No production data access**: All scenarios use synthetic data
2. **Isolated tenants**: Uses dedicated test tenant IDs
3. **Clear labeling**: All test data tagged with `sim_harness:true`
4. **Automatic cleanup**: Test data cleaned after evaluation (optional)

### Configuration Guards

```typescript
// Harness refuses to run against production
if (config.apiUrl.includes('prod.intelgraph.com')) {
  throw new Error('Harness cannot run against production endpoints');
}

if (!config.tenantId.startsWith('test-')) {
  throw new Error('Tenant ID must start with "test-" prefix');
}
```

## Integration with CI

### GitHub Actions Example

```yaml
name: Scenario Evaluation

on:
  pull_request:
    branches: [main]

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup environment
        run: make bootstrap

      - name: Start services
        run: make up

      - name: Run scenario evaluation
        run: |
          cd packages/sim-harness
          pnpm build
          pnpm run-scenario --scenario fraud-ring --seed 42 --output ci-report.json

      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: scenario-report
          path: packages/sim-harness/reports/
```

## API Contracts

### Public APIs Used

The harness interacts **only** with public APIs:

1. **GraphQL API** (`/graphql`)
   - Investigations, entities, relationships
   - Copilot runs
   - Graph queries

2. **REST API** (`/api/v1/*`)
   - Data import/export
   - Batch operations
   - Health checks

3. **WebSocket** (`/socket.io`)
   - Real-time updates (optional)

### No Direct Database Access

The harness **never** accesses:
- Neo4j directly
- PostgreSQL directly
- Redis directly

All data flows through platform APIs to ensure:
- Authorization checks
- Audit logging
- Schema validation

## Development

### Running Tests

```bash
# Unit tests
pnpm test

# Integration tests (requires running stack)
make up
pnpm test:integration

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

### Adding a New Scenario Template

1. Create template in `test-data/scenarios/my-scenario.yaml`
2. Define expectations in `test-data/expectations/my-scenario.json`
3. Add test in `src/generator/__tests__/my-scenario.test.ts`
4. Update this README

### Adding New Metrics

1. Extend `MetricsCollector` in `src/metrics/collector.ts`
2. Update report templates in `src/metrics/reporters/`
3. Add tests

## Troubleshooting

### Harness won't connect to API

```bash
# Check services are running
make smoke

# Verify API endpoint
curl http://localhost:4000/health

# Check harness config
cat test-data/scenarios/default-config.yaml
```

### Scenarios fail with auth errors

The harness requires a valid API token. Set in environment:

```bash
export INTELGRAPH_API_TOKEN="your-test-token"
```

Or in config file:

```yaml
api:
  url: http://localhost:4000/graphql
  token: ${INTELGRAPH_API_TOKEN}
  tenantId: test-harness-001
```

### Non-deterministic results

Ensure seed is fixed:

```yaml
params:
  seed: 42  # Fixed seed for reproducibility
```

## Future Enhancements

- [ ] LLM-based adaptive ghost analysts
- [ ] Multi-agent simulations (concurrent analysts)
- [ ] Anomaly injection (simulated system failures)
- [ ] Performance benchmarking dashboard
- [ ] Integration with A/B testing framework

## References

- [IntelGraph CLAUDE.md](/home/user/summit/CLAUDE.md)
- [Golden Path Smoke Test](/home/user/summit/scripts/smoke-test.js)
- [GraphQL Schema](/home/user/summit/graphql/schema.graphql)

## License

Proprietary - IntelGraph Team
