# Simulation Harness Usage Guide

## Quick Start

### 1. Install Dependencies

```bash
cd packages/sim-harness
pnpm install
pnpm build
```

### 2. Start IntelGraph Stack

```bash
# From repo root
make bootstrap
make up

# Verify services are running
make smoke
```

### 3. Run a Scenario

```bash
# Run fraud-ring scenario
pnpm run-scenario --scenario fraud-ring --seed 42

# Run with custom workflow
pnpm run-scenario \
  --scenario fraud-ring \
  --workflow ./test-data/workflows/basic-investigation.yaml \
  --output ./my-reports

# Run multiple sessions for reliability testing
pnpm run-scenario --scenario fraud-ring --sessions 10
```

## CLI Commands

### Run Evaluation

```bash
sim-harness run [options]

Options:
  -s, --scenario <name>     Scenario name or path to YAML file
  -w, --workflow <path>     Path to workflow YAML file
  --api-url <url>           API URL (default: http://localhost:4000/graphql)
  --tenant-id <id>          Tenant ID (default: test-harness-001)
  --token <token>           API authentication token
  --seed <number>           Random seed for determinism (default: 42)
  --size <size>             Scenario size: small, medium, large (default: medium)
  --output <path>           Output directory (default: ./reports)
  --format <format>         Report format: json, html, csv, all (default: html)
  --verbose                 Verbose logging
  --sessions <count>        Number of sessions to run (default: 1)
```

### List Available Scenarios

```bash
sim-harness list-scenarios
```

Output:
```
Built-in Scenarios:

  fraud-ring
    Type: financial-crime
    Description: Financial fraud network with shell companies
    Entities: 50

  terror-cell
    Type: security-threat
    Description: Terror network with communication patterns
    Entities: 30
```

### Generate Scenario Data Only

```bash
sim-harness generate --scenario fraud-ring --output my-scenario.json
```

## Programmatic Usage

### Generate and Ingest Scenario

```typescript
import { ScenarioGenerator } from '@intelgraph/sim-harness';
import axios from 'axios';

// Generate scenario
const generator = new ScenarioGenerator({
  template: 'fraud-ring',
  params: { seed: 42 }
});

const scenario = await generator.generate();

// Ingest via API
const apiUrl = 'http://localhost:4000/graphql';

// Create investigation
const createInvestigationMutation = `
  mutation CreateInvestigation($input: CreateInvestigationInput!) {
    createInvestigation(input: $input) {
      id
    }
  }
`;

const { data } = await axios.post(apiUrl, {
  query: createInvestigationMutation,
  variables: {
    input: {
      name: scenario.name,
      description: scenario.description,
      type: 'FRAUD_ANALYSIS'
    }
  }
});

const investigationId = data.data.createInvestigation.id;

// Add entities
for (const entity of scenario.entities) {
  await axios.post(apiUrl, {
    query: `
      mutation AddEntity($input: CreateEntityInput!) {
        createEntity(input: $input) { id }
      }
    `,
    variables: {
      input: {
        investigationId,
        ...entity
      }
    }
  });
}
```

### Run Ghost Analyst

```typescript
import { GhostAnalyst } from '@intelgraph/sim-harness';
import type { WorkflowScript } from '@intelgraph/sim-harness';

const workflow: WorkflowScript = {
  name: 'fraud-investigation',
  steps: [
    {
      name: 'search-high-risk',
      action: 'graphql-query',
      query: `
        query SearchHighRisk {
          entities(filter: { risk_score: { gte: 70 }}) {
            id name type properties
          }
        }
      `,
      assertions: ['entities.length >= 5']
    }
  ]
};

const analyst = new GhostAnalyst({
  apiUrl: 'http://localhost:4000/graphql',
  tenantId: 'test-001',
  script: workflow,
  verbose: true
});

const session = await analyst.run({ scenarioId: 'my-scenario' });
console.log('Session status:', session.status);
console.log('Queries issued:', session.metrics.queriesIssued);
```

### Collect Metrics

```typescript
import { MetricsCollector, HtmlReporter } from '@intelgraph/sim-harness';

const collector = new MetricsCollector();
collector.setScenario(scenario);

// Run multiple sessions
for (let i = 0; i < 5; i++) {
  const analyst = new GhostAnalyst({ ... });
  const session = await analyst.run({ ... });
  collector.addSession(session);
}

// Generate report
const report = await collector.generateReport();

// Export as HTML
const htmlReporter = new HtmlReporter();
const html = htmlReporter.generate(report);
fs.writeFileSync('report.html', html);
```

### Compare Versions

```typescript
// Run baseline
const baselineCollector = new MetricsCollector();
// ... run sessions ...
const baselineReport = await baselineCollector.generateReport();

// Run candidate
const candidateCollector = new MetricsCollector();
// ... run sessions ...
const candidateReport = await candidateCollector.generateReport({
  baseline: baselineReport.aggregateMetrics,
  baselineVersion: 'v1.2.0',
  candidateVersion: 'v1.3.0'
});

// Check for regressions
if (candidateReport.comparison) {
  const perfDelta = candidateReport.comparison.deltas.performance.avgDuration;
  if (perfDelta > 10) {
    console.warn('Performance regression detected:', perfDelta, '% slower');
  }
}
```

## Environment Variables

```bash
# API configuration
export API_URL=http://localhost:4000/graphql
export WS_URL=http://localhost:4000
export TENANT_ID=test-harness-001
export API_TOKEN=your-token-here

# Harness configuration
export SKIP_INTEGRATION=true  # Skip integration tests
```

## CI Integration

### GitHub Actions Example

```yaml
name: Scenario Regression Tests

on:
  pull_request:
    branches: [main]

jobs:
  scenario-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 18

      - name: Install pnpm
        run: corepack enable

      - name: Bootstrap environment
        run: make bootstrap

      - name: Start services
        run: make up

      - name: Wait for stack
        run: ./scripts/wait-for-stack.sh

      - name: Run scenario evaluations
        run: |
          cd packages/sim-harness
          pnpm build

          # Run fraud-ring scenario
          pnpm run-scenario \
            --scenario fraud-ring \
            --seed 42 \
            --sessions 5 \
            --format all \
            --output ./reports

      - name: Check success criteria
        run: |
          cd packages/sim-harness
          node -e "
            const report = require('./reports/scenario-*-report.json');
            if (report.aggregateMetrics.reliability.successRate < 0.95) {
              console.error('Success rate below threshold');
              process.exit(1);
            }
          "

      - name: Upload reports
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: scenario-reports
          path: packages/sim-harness/reports/

      - name: Cleanup
        if: always()
        run: make down
```

## Tips & Best Practices

1. **Use Fixed Seeds**: Always use fixed seeds for reproducible results
   ```bash
   pnpm run-scenario --scenario fraud-ring --seed 42
   ```

2. **Start Small**: Test with small scenarios first
   ```bash
   pnpm run-scenario --scenario fraud-ring --size small
   ```

3. **Verbose Mode**: Use `--verbose` for debugging
   ```bash
   pnpm run-scenario --scenario fraud-ring --verbose
   ```

4. **Multiple Sessions**: Run multiple sessions for statistical significance
   ```bash
   pnpm run-scenario --scenario fraud-ring --sessions 10
   ```

5. **Check Reports**: Always review HTML reports for insights
   ```bash
   open reports/*-report.html
   ```

6. **Version Comparison**: Save baseline reports for regression testing
   ```bash
   # Save baseline
   pnpm run-scenario --scenario fraud-ring --output baseline/

   # After changes
   pnpm run-scenario --scenario fraud-ring --output candidate/

   # Compare manually or via script
   ```

## Troubleshooting

### API Connection Errors

```
Error: connect ECONNREFUSED 127.0.0.1:4000
```

**Solution**: Ensure IntelGraph stack is running
```bash
make up
curl http://localhost:4000/health
```

### Safety Errors

```
SAFETY: Tenant ID must start with 'test-' prefix
```

**Solution**: Use proper tenant ID
```bash
pnpm run-scenario --tenant-id test-my-harness
```

### Assertion Failures

```
Step 'search-high-risk' failed: Assertions failed: entities.length >= 5
```

**Solution**: Check scenario data or adjust assertions in workflow YAML

## Next Steps

- Create custom scenario templates in `test-data/scenarios/`
- Define custom workflows in `test-data/workflows/`
- Integrate with CI/CD pipelines
- Build dashboards from JSON/CSV reports
