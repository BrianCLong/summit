# IntelGraph Simulation Harness - Usage Examples

This document provides practical examples for using the simulation harness.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Running Scenarios](#running-scenarios)
3. [Custom Workflows](#custom-workflows)
4. [Generating Reports](#generating-reports)
5. [Programmatic Usage](#programmatic-usage)
6. [CI/CD Integration](#cicd-integration)

## Quick Start

### Run a Simple Scenario

```bash
# Install dependencies
pnpm install

# Build the harness
pnpm build

# Run fraud ring scenario
pnpm sim:run --scenario fraud-ring --size medium

# Run with deterministic seed
pnpm sim:run --scenario fraud-ring --seed 42
```

### Using Environment Variables

```bash
export SIM_API_URL=http://localhost:4000
export SIM_GRAPHQL_URL=http://localhost:4000/graphql
export SIM_GRAPH_SIZE=large
export SIM_NOISE_LEVEL=0.2
export SIM_SEED=12345
export SIM_REPORT_DIR=./my-reports

pnpm sim:run --scenario terror-cell
```

## Running Scenarios

### Fraud Ring Investigation

```bash
# Small fraud network
pnpm sim:run \
  --scenario fraud-ring \
  --size small \
  --noise 0.1 \
  --seed 42 \
  --output ./reports/fraud-ring

# Large fraud network with high noise
pnpm sim:run \
  --scenario fraud-ring \
  --size xlarge \
  --noise 0.3 \
  --seed 99
```

### Terror Cell Analysis

```bash
pnpm sim:run \
  --scenario terror-cell \
  --size medium \
  --config config/high-security.yaml \
  --output ./reports/terror-cell
```

### Corruption Network

```bash
pnpm sim:run \
  --scenario corruption-network \
  --size large \
  --noise 0.15 \
  --output ./reports/corruption
```

### Run All Scenarios

```bash
pnpm sim:run --scenario all --output ./reports/all-scenarios
```

## Custom Workflows

### Create a Custom Workflow File

Create `workflows/custom-investigation.yaml`:

```yaml
name: Custom Investigation Workflow
description: Custom workflow for specific testing needs
strategy: targeted
steps:
  - type: CREATE_INVESTIGATION
    params: {}

  - type: ADD_ENTITY
    params:
      entityIndex: 0

  - type: ADD_ENTITY
    params:
      entityIndex: 1

  - type: ADD_RELATIONSHIP
    params:
      relationshipIndex: 0

  - type: QUERY_ENTITIES
    params:
      type: PERSON
      limit: 50

  - type: RUN_COPILOT
    params:
      goal: "Find connections between entities"
      timeout: 60000

  - type: EXPAND_NETWORK
    params:
      entityId: first-entity
      depth: 2

  - type: SEARCH
    params:
      query: "high risk"

  - type: EXPORT_DATA
    params: {}
```

### Run Custom Workflow

```bash
pnpm sim:run \
  --scenario fraud-ring \
  --workflow workflows/custom-investigation.yaml \
  --output ./reports/custom
```

## Generating Reports

### Comparison Report

```bash
# Run baseline version
pnpm sim:run --scenario all --output ./reports/v1.0.0

# Save metrics with version tag
cp ./reports/metrics-*.json ./reports/metrics-v1.0.0.json

# Run candidate version
pnpm sim:run --scenario all --output ./reports/v1.1.0

# Save metrics with version tag
cp ./reports/metrics-*.json ./reports/metrics-v1.1.0.json

# Generate comparison
pnpm sim:run \
  --report \
  --baseline v1.0.0 \
  --candidate v1.1.0 \
  --output ./reports
```

### HTML Report

```bash
# Configure for HTML output
pnpm sim:run \
  --scenario all \
  --report \
  --config config/html-report.yaml \
  --output ./reports
```

`config/html-report.yaml`:

```yaml
reporting:
  outputDir: ./reports
  format: html
  includeCharts: true
```

## Programmatic Usage

### TypeScript/JavaScript

```typescript
import {
  ScenarioGenerator,
  GhostAnalyst,
  MetricsCollector,
  ComparisonReporter,
  ConfigLoader,
  ScenarioParameters,
  Workflow,
} from '@intelgraph/sim-harness';

async function runSimulation() {
  // Load configuration
  const config = ConfigLoader.loadFromFile('config/custom.yaml');

  // Generate scenario
  const generator = new ScenarioGenerator(42);
  const params: ScenarioParameters = {
    type: 'fraud-ring',
    size: 'large',
    noiseLevel: 0.15,
    missingDataRate: 0.1,
    conflictingEvidenceRate: 0.05,
    seed: 42,
  };

  const scenarioData = await generator.generate(params);
  console.log(
    `Generated ${scenarioData.entities.length} entities and ${scenarioData.relationships.length} relationships`
  );

  // Create workflow
  const workflow: Workflow = {
    name: 'Custom Workflow',
    description: 'Programmatic workflow',
    strategy: 'systematic',
    steps: [
      { type: 'CREATE_INVESTIGATION', params: {} },
      { type: 'ADD_ENTITY', params: { entityIndex: 0 } },
      { type: 'QUERY_ENTITIES', params: {} },
      { type: 'RUN_COPILOT', params: {} },
    ],
  };

  // Run ghost analyst
  const analyst = new GhostAnalyst(config);
  const session = await analyst.runWorkflow(workflow, scenarioData);

  console.log(`Session completed: ${session.id}`);
  console.log(`Success rate: ${(session.metrics.successRate * 100).toFixed(2)}%`);
  console.log(`Coverage: ${(session.metrics.coverageRate * 100).toFixed(2)}%`);

  // Export metrics
  const metricsCollector = analyst.getMetricsCollector();
  const json = metricsCollector.exportToJSON();
  const csv = metricsCollector.exportToCSV();

  console.log('Metrics:', json);
}

runSimulation().catch(console.error);
```

### Generate Comparison Report

```typescript
import {
  MetricsCollector,
  ComparisonReporter,
  SessionMetrics,
} from '@intelgraph/sim-harness';
import * as fs from 'fs';

async function generateReport() {
  // Load metrics
  const baselineMetrics: SessionMetrics[] = JSON.parse(
    fs.readFileSync('./reports/metrics-v1.0.0.json', 'utf8')
  ).completedSessions;

  const candidateMetrics: SessionMetrics[] = JSON.parse(
    fs.readFileSync('./reports/metrics-v1.1.0.json', 'utf8')
  ).completedSessions;

  // Generate comparison
  const reporter = new ComparisonReporter();
  const report = reporter.generateComparison(
    { version: 'v1.0.0', metrics: baselineMetrics },
    { version: 'v1.1.0', metrics: candidateMetrics }
  );

  // Save report
  const reportPath = await reporter.saveReport(report, './reports', 'html');
  console.log(`Report saved: ${reportPath}`);

  // Print summary
  console.log('\nComparison Summary:');
  console.log(`Success Rate Delta: ${(report.comparison.successRateDelta * 100).toFixed(2)}%`);
  console.log(`Performance Delta: ${report.comparison.performanceDelta.toFixed(2)}%`);

  if (report.comparison.regressions.length > 0) {
    console.log('\nRegressions:');
    report.comparison.regressions.forEach((r) => console.log(`  - ${r}`));
  }
}

generateReport().catch(console.error);
```

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/sim-harness.yml`:

```yaml
name: Simulation Harness Tests

on:
  pull_request:
  push:
    branches: [main]

jobs:
  simulation-tests:
    runs-on: ubuntu-latest

    services:
      neo4j:
        image: neo4j:5
        env:
          NEO4J_AUTH: neo4j/testpassword
        ports:
          - 7474:7474
          - 7687:7687

      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpassword
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build harness
        run: pnpm --filter @intelgraph/sim-harness build

      - name: Start API server
        run: |
          pnpm --filter @intelgraph/server start &
          sleep 10

      - name: Run simulation tests
        env:
          SIM_API_URL: http://localhost:4000
          SIM_GRAPHQL_URL: http://localhost:4000/graphql
          SIM_LOG_LEVEL: info
        run: |
          pnpm --filter @intelgraph/sim-harness sim:run \
            --scenario all \
            --output ./reports

      - name: Upload reports
        uses: actions/upload-artifact@v3
        with:
          name: simulation-reports
          path: sim-harness/reports/

      - name: Check for regressions
        run: |
          if [ -f "./reports/comparison-*.html" ]; then
            echo "Checking for regressions..."
            # Add regression check logic
          fi
```

### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
simulation_tests:
  stage: test
  image: node:18
  services:
    - name: neo4j:5
      alias: neo4j
    - name: postgres:15
      alias: postgres
  variables:
    NEO4J_AUTH: neo4j/testpassword
    POSTGRES_PASSWORD: testpassword
    SIM_API_URL: http://localhost:4000
    SIM_GRAPHQL_URL: http://localhost:4000/graphql
  before_script:
    - npm install -g pnpm@9
    - pnpm install --frozen-lockfile
    - pnpm --filter @intelgraph/sim-harness build
  script:
    - pnpm --filter @intelgraph/server start &
    - sleep 10
    - pnpm --filter @intelgraph/sim-harness sim:run --scenario all --output ./reports
  artifacts:
    paths:
      - sim-harness/reports/
    expire_in: 1 week
```

## Advanced Usage

### Parallel Execution

```bash
# Run multiple scenarios in parallel
pnpm sim:run --scenario fraud-ring --output ./reports/fraud &
pnpm sim:run --scenario terror-cell --output ./reports/terror &
pnpm sim:run --scenario corruption-network --output ./reports/corruption &
wait

echo "All scenarios completed"
```

### Regression Testing

```bash
#!/bin/bash
# regression-test.sh

BASELINE_VERSION="v1.0.0"
CANDIDATE_VERSION="v1.1.0"

# Run baseline
echo "Running baseline version: $BASELINE_VERSION"
pnpm sim:run --scenario all --output "./reports/$BASELINE_VERSION"

# Run candidate
echo "Running candidate version: $CANDIDATE_VERSION"
pnpm sim:run --scenario all --output "./reports/$CANDIDATE_VERSION"

# Generate comparison
echo "Generating comparison report"
pnpm sim:run \
  --report \
  --baseline "$BASELINE_VERSION" \
  --candidate "$CANDIDATE_VERSION" \
  --output ./reports

# Check for regressions
if grep -q "REGRESSIONS DETECTED" ./reports/comparison-*.html; then
  echo "❌ Regressions detected!"
  exit 1
else
  echo "✅ No regressions"
  exit 0
fi
```

### Load Testing

```typescript
import { ScenarioGenerator, GhostAnalyst, ConfigLoader } from '@intelgraph/sim-harness';

async function loadTest() {
  const config = ConfigLoader.getDefaults();
  const generator = new ScenarioGenerator();
  const analyst = new GhostAnalyst(config);

  const concurrentSessions = 10;
  const promises = [];

  for (let i = 0; i < concurrentSessions; i++) {
    const scenario = await generator.generate({
      type: 'fraud-ring',
      size: 'medium',
      noiseLevel: 0.1,
      missingDataRate: 0.05,
      conflictingEvidenceRate: 0.03,
    });

    const workflow = createDefaultWorkflow(scenario);
    promises.push(analyst.runWorkflow(workflow, scenario));
  }

  const sessions = await Promise.all(promises);
  console.log(`Completed ${sessions.length} concurrent sessions`);
}

loadTest().catch(console.error);
```

---

For more information, see the [main README](README.md) and [API documentation](docs/API.md).
