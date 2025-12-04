# Simulation Harness - Quick Reference

## Installation

```bash
cd packages/sim-harness
pnpm install
pnpm build
```

## CLI Commands

### Run Scenario Evaluation
```bash
# Basic run
pnpm run-scenario run --scenario fraud-ring

# With all options
pnpm run-scenario run \
  --scenario fraud-ring \
  --workflow ./test-data/workflows/basic-investigation.yaml \
  --api-url http://localhost:4000/graphql \
  --tenant-id test-my-evaluation \
  --seed 42 \
  --size medium \
  --sessions 5 \
  --format all \
  --output ./reports \
  --verbose
```

### List Available Scenarios
```bash
pnpm run-scenario list-scenarios
```

### Generate Scenario Data Only
```bash
pnpm run-scenario generate --scenario fraud-ring --output scenario.json
```

## Built-in Scenarios

| Name | Type | Entities | Use Case |
|------|------|----------|----------|
| `fraud-ring` | Financial crime | 50 | Shell companies, layered transactions |
| `terror-cell` | Security threat | 30 | Communication patterns, safe houses |
| `corruption-network` | Government corruption | 40 | Bribes, contracts, shell companies |

## Scenario Sizes

- `--size small`: ~50% of default entity count
- `--size medium`: Default entity count (default)
- `--size large`: ~200% of default entity count

## Report Formats

- `--format json`: Machine-readable JSON
- `--format html`: Interactive dashboard
- `--format csv`: Spreadsheet export
- `--format all`: Generate all formats

## Environment Variables

```bash
export API_URL=http://localhost:4000/graphql
export TENANT_ID=test-harness-001
export API_TOKEN=your-token
```

## Programmatic Usage

### Generate Scenario
```typescript
import { ScenarioGenerator } from '@intelgraph/sim-harness';

const generator = new ScenarioGenerator({
  template: 'fraud-ring',
  params: { seed: 42 }
});

const scenario = await generator.generate();
```

### Run Ghost Analyst
```typescript
import { GhostAnalyst } from '@intelgraph/sim-harness';

const analyst = new GhostAnalyst({
  apiUrl: 'http://localhost:4000/graphql',
  tenantId: 'test-001',
  script: workflow,
  verbose: true
});

const session = await analyst.run({ scenario });
```

### Collect Metrics
```typescript
import { MetricsCollector, HtmlReporter } from '@intelgraph/sim-harness';

const collector = new MetricsCollector();
collector.addSession(session);

const report = await collector.generateReport();

const html = new HtmlReporter().generate(report);
fs.writeFileSync('report.html', html);
```

## Testing

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

## Common Workflows

### Quick Smoke Test
```bash
make up
pnpm run-scenario run --scenario fraud-ring --size small --sessions 1
```

### Regression Testing
```bash
# Run baseline
pnpm run-scenario run --scenario fraud-ring --seed 42 --sessions 10 --output baseline/

# After changes
pnpm run-scenario run --scenario fraud-ring --seed 42 --sessions 10 --output candidate/

# Compare reports manually or use compare-versions.sh
```

### CI Integration
```yaml
- name: Run scenario tests
  run: |
    cd packages/sim-harness
    pnpm build
    pnpm run-scenario run --scenario fraud-ring --sessions 5 --format json
```

## Troubleshooting

### API Connection Refused
```bash
# Ensure stack is running
make up
curl http://localhost:4000/health
```

### Safety Error: Tenant ID
```bash
# Use test- prefix
pnpm run-scenario run --tenant-id test-my-harness
```

### Slow Performance
```bash
# Reduce scenario size or sessions
pnpm run-scenario run --size small --sessions 1
```

### TypeScript Errors
```bash
# Rebuild
pnpm clean
pnpm build
```

## File Locations

- **Scenarios**: `test-data/scenarios/*.yaml`
- **Workflows**: `test-data/workflows/*.yaml`
- **Expectations**: `test-data/expectations/*.json`
- **Reports**: `reports/` (gitignored)
- **Source**: `src/`
- **Tests**: `src/__tests__/`

## Quality Thresholds (CI)

- **Success Rate**: ≥ 80%
- **Entity Discovery**: ≥ 70%
- **Relationship Discovery**: ≥ 70%
- **Max Latency (p95)**: < 5000ms

## Help & Documentation

- Full docs: `README.md`
- Usage guide: `USAGE.md`
- Implementation summary: `IMPLEMENTATION_SUMMARY.md`
- CLI help: `pnpm run-scenario --help`

## Example Scripts

```bash
# Run all scenarios
./scripts/example-run.sh

# Compare versions
./scripts/compare-versions.sh fraud-ring v1.2.0 v1.3.0 5 42
```

## Key TypeScript Types

```typescript
interface GeneratedScenario {
  id: string;
  name: string;
  entities: Entity[];
  relationships: Relationship[];
  signals: Signal[];
  expectedOutcomes: ExpectedOutcomes;
}

interface AnalystSession {
  id: string;
  scenarioId: string;
  status: 'completed' | 'failed' | 'timeout';
  metrics: SessionMetrics;
}

interface EvaluationReport {
  scenarioId: string;
  sessions: AnalystSession[];
  aggregateMetrics: AggregateMetrics;
}
```

## Safety Features

✅ Production URL blocking
✅ Test tenant enforcement
✅ Scenario size limits
✅ Query validation (no DELETE/DROP)
✅ Data tagging (`sim_harness: true`)

## Resources

- **GitHub**: BrianCLong/summit
- **Branch**: claude/scenario-evaluation-harness-01LpEFk2r68S4iQQWVrNx8Af
- **Package**: @intelgraph/sim-harness
- **CI**: `.github/workflows/scenario-evaluation.yml`
