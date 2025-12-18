# IntelGraph Scenario Simulation & Evaluation Harness

A comprehensive testing framework for simulating analyst workflows and evaluating Copilot, Analytics, and UI flows in the IntelGraph platform.

## Overview

The sim-harness provides:

- **Scenario Generator**: Create synthetic graph/case data for various investigation types
- **Ghost Analyst**: Automated analyst workflows that interact with platform APIs
- **Metrics Collection**: Capture performance and quality metrics
- **Reporting**: Generate comparison reports for regression testing and model evaluation

## Architecture

```
sim-harness/
├── src/
│   ├── generators/      # Scenario and data generators
│   ├── drivers/         # Ghost analyst automation
│   ├── metrics/         # Metrics collection
│   ├── reporters/       # Report generation
│   ├── types/           # TypeScript types
│   └── utils/           # Utilities
├── scenarios/           # Scenario configurations
├── config/              # Runtime configuration
└── __tests__/           # Tests
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Run a scenario
pnpm sim:run --scenario fraud-ring --config config/default.yaml

# Run with custom parameters
pnpm sim:run --scenario terror-cell --size large --noise 0.3

# Generate report
pnpm sim:run --scenario all --report --output ./reports/
```

## Safety Features

- **Non-Production Only**: All endpoints must be explicitly configured
- **Sandbox Mode**: Isolated from production tenants and data
- **Config Validation**: Strict validation of all runtime configurations
- **Audit Trail**: Complete logging of all simulated operations

## Scenarios

### Built-in Scenarios

1. **Fraud Ring**: Financial fraud networks with shell companies
2. **Terror Cell**: Network analysis with temporal patterns
3. **Corruption Network**: Political corruption with evidence chains
4. **Supply Chain**: Complex multi-tier supply relationships
5. **Money Laundering**: Transaction flows across jurisdictions

### Custom Scenarios

Create custom scenarios using YAML templates:

```yaml
name: Custom Investigation
type: INTELLIGENCE_ANALYSIS
parameters:
  entities:
    count: 50
    types: [PERSON, ORGANIZATION, LOCATION]
  relationships:
    density: 0.3
    types: [AFFILIATED_WITH, TRANSACTED_WITH, LOCATED_IN]
  noise:
    level: 0.2
    missing_data: 0.1
```

## Ghost Analyst

The ghost analyst simulates human analyst workflows:

```typescript
// Scripted workflow
const workflow = {
  steps: [
    { type: 'CREATE_INVESTIGATION', params: { name: 'Test' } },
    { type: 'QUERY_ENTITIES', params: { type: 'PERSON' } },
    { type: 'EXPAND_NETWORK', params: { depth: 2 } },
    { type: 'RUN_COPILOT', params: { goal: 'Find key nodes' } },
  ],
};

// AI-driven exploration
const aiAgent = new AIGhostAnalyst({
  model: 'gpt-4',
  strategy: 'exploratory',
  maxSteps: 20,
});
```

## Metrics

Collected metrics include:

- **Task Success**: Investigation completion rate
- **Time-to-Insight**: Duration to key findings
- **Query Efficiency**: Number of queries needed
- **Coverage**: Percentage of graph explored
- **Quality**: Precision/recall of findings

## Reporting

Generate detailed comparison reports:

```bash
# Compare two builds
pnpm sim:run --baseline v1.0.0 --candidate v1.1.0 --report

# Regression testing
pnpm sim:run --scenarios all --baseline prod --report
```

Reports include:

- Performance comparisons
- Quality metrics
- Regression detection
- Visual diff charts

## Configuration

### Environment Variables

```bash
# API endpoints (required)
export SIM_API_URL=http://localhost:4000
export SIM_GRAPHQL_URL=http://localhost:4000/graphql

# Scenario parameters
export SIM_GRAPH_SIZE=medium
export SIM_NOISE_LEVEL=0.2
export SIM_SEED=12345

# Output
export SIM_REPORT_DIR=./reports
export SIM_LOG_LEVEL=info
```

### Config Files

`config/default.yaml`:

```yaml
api:
  baseUrl: http://localhost:4000
  graphqlUrl: http://localhost:4000/graphql
  timeout: 30000
  retries: 3

scenarios:
  defaultSize: medium
  defaultNoise: 0.1
  deterministic: true
  seed: 42

ghost_analyst:
  maxSteps: 50
  thinkTime: 1000
  strategy: systematic

metrics:
  enabled: true
  detailed: true
  exportFormat: json

reporting:
  outputDir: ./reports
  format: html
  includeCharts: true
```

## Development

```bash
# Run tests
pnpm test

# Integration tests
pnpm test:integration

# Linting
pnpm lint

# Type checking
pnpm typecheck
```

## CI/CD Integration

```yaml
# .github/workflows/sim-harness.yml
- name: Run Simulation Harness
  run: |
    pnpm --filter @intelgraph/sim-harness build
    pnpm --filter @intelgraph/sim-harness sim:run --scenarios all --report

- name: Upload Reports
  uses: actions/upload-artifact@v3
  with:
    name: sim-reports
    path: sim-harness/reports/
```

## API

### Scenario Generator

```typescript
import { ScenarioGenerator } from '@intelgraph/sim-harness';

const generator = new ScenarioGenerator({
  seed: 42,
  deterministic: true,
});

const scenario = await generator.generate('fraud-ring', {
  size: 'large',
  noise: 0.2,
  complexity: 'high',
});
```

### Ghost Analyst

```typescript
import { GhostAnalyst } from '@intelgraph/sim-harness';

const analyst = new GhostAnalyst({
  apiUrl: 'http://localhost:4000',
  strategy: 'systematic',
});

const session = await analyst.runWorkflow(workflow);
const metrics = await analyst.getMetrics();
```

### Metrics Collection

```typescript
import { MetricsCollector } from '@intelgraph/sim-harness';

const collector = new MetricsCollector();
collector.start();

// Run simulation...

const metrics = collector.getMetrics();
const report = collector.generateReport();
```

## License

Proprietary - IntelGraph Platform
