# Scenario Evaluation Harness - Implementation Summary

**Date**: 2025-11-29
**Branch**: `claude/scenario-evaluation-harness-01LpEFk2r68S4iQQWVrNx8Af`
**Status**: ✅ Complete

---

## Overview

Implemented a comprehensive **Scenario Simulation & Evaluation Harness** for the IntelGraph platform. This framework enables repeatable, automated testing of Copilot AI, Analytics engines, and UI workflows through synthetic scenario generation and "ghost analyst" sessions.

## Deliverables

### 1. Core Components

#### ✅ Scenario Generator (`src/generator/`)
- **Deterministic data generation** using seeded random number generator (Mulberry32)
- **Built-in templates**:
  - `fraud-ring`: Financial crime network (50 entities, shell companies, layered transactions)
  - `terror-cell`: Security threat network (30 entities, communication patterns, safe houses)
  - `corruption-network`: Government corruption (40 entities, bribes, contracts)
- **Parameterizable scenarios**: Graph size, edge density, noise level, missing data
- **YAML-based custom templates** with attribute distributions (normal, lognormal, uniform, daterange)
- **Expected outcomes** for validation (critical entities, key relationships, anomalies)

**Key Files**:
- `src/generator/ScenarioGenerator.ts` - Main generator class
- `test-data/scenarios/*.yaml` - Template definitions
- `test-data/expectations/*.json` - Expected outcomes

#### ✅ Ghost Analyst (`src/analyst/`)
- **Workflow-driven automation** via YAML scripts
- **Multi-action support**:
  - GraphQL queries/mutations
  - REST API calls (GET/POST)
  - Polling operations with timeout/interval
  - Wait steps
  - Assertions
- **Template variable resolution** (`{{scenario.name}}`, `{{steps.stepName.result}}`)
- **Assertion engine** for validation
- **Context management** across workflow steps
- **Metrics capture**: Query latency, entity/relationship counts, time-to-insight

**Key Files**:
- `src/analyst/GhostAnalyst.ts` - Workflow driver
- `test-data/workflows/basic-investigation.yaml` - Example workflow

#### ✅ Metrics & Reporting (`src/metrics/`)
- **Multi-format reporters**: JSON, HTML (interactive dashboard), CSV
- **Performance metrics**:
  - Total duration, query latency (p50/p95/p99)
  - Time to first insight
  - Query count
- **Correctness metrics**:
  - Entity/relationship discovery rates
  - False positive/negative rates
- **Reliability metrics**:
  - Success rate, error rate, timeout rate
- **Version comparison** with delta calculations
- **HTML dashboard** with:
  - Metric cards with color coding
  - Session details table
  - Comparison tables (baseline vs candidate)
  - Raw JSON export

**Key Files**:
- `src/metrics/MetricsCollector.ts` - Aggregation logic
- `src/metrics/reporters/HtmlReporter.ts` - Interactive dashboard
- `src/metrics/reporters/JsonReporter.ts` - Structured output
- `src/metrics/reporters/CsvReporter.ts` - Spreadsheet export

#### ✅ Safety Guards (`src/utils/`)
- **Production URL blocking** (checks for prod/mil/gov domains)
- **Tenant ID validation** (requires test-/sim-/harness- prefix)
- **Scenario size limits** (max 10,000 entities+relationships)
- **Query validation** (blocks DELETE/TRUNCATE/DROP)
- **Data tagging** (all entities marked with `sim_harness: true`)

**Key Files**:
- `src/utils/safety.ts` - Safety validation
- `src/utils/random.ts` - Deterministic RNG

### 2. CLI Tool

**Commands**:
```bash
# Run evaluation
sim-harness run --scenario fraud-ring --sessions 5 --format all

# List built-in scenarios
sim-harness list-scenarios

# Generate scenario data only
sim-harness generate --scenario fraud-ring --output scenario.json
```

**Options**:
- `--scenario`: Template name or YAML path
- `--workflow`: Workflow YAML path
- `--api-url`: API endpoint (default: localhost:4000/graphql)
- `--tenant-id`: Test tenant ID
- `--seed`: Random seed for reproducibility
- `--size`: small/medium/large
- `--sessions`: Number of runs
- `--format`: json/html/csv/all
- `--verbose`: Detailed logging

**Key Files**:
- `src/cli.ts` - CLI implementation (Commander.js)

### 3. Testing

#### Unit Tests
- ✅ Scenario generation determinism (fixed seeds → identical output)
- ✅ Entity/relationship count validation
- ✅ Expected outcomes computation
- ✅ Safety guard enforcement

#### Integration Tests
- ✅ End-to-end workflow execution (requires running stack)
- ✅ Multi-session metrics collection
- ✅ API interaction validation

**Coverage**: Jest with ts-jest, targeting 50% minimum

**Key Files**:
- `src/__tests__/ScenarioGenerator.test.ts`
- `src/__tests__/integration.test.ts`
- `jest.config.cjs`

### 4. CI/CD Integration

**GitHub Actions Workflow**: `.github/workflows/scenario-evaluation.yml`

**Jobs**:
1. **scenario-tests**:
   - Build harness
   - Start IntelGraph stack
   - Run 3 scenarios (fraud-ring, terror-cell, corruption-network)
   - Validate success criteria (80% success rate, 70% discovery rate)
   - Upload reports as artifacts
   - Comment on PR with results table

2. **integration-tests**:
   - Run integration test suite
   - Requires running stack

**Triggers**:
- Pull requests affecting sim-harness or core APIs
- Manual workflow dispatch with custom scenario/session count

### 5. Documentation

**Files Created**:
- ✅ `README.md` - Architecture overview, features, setup
- ✅ `USAGE.md` - Detailed usage guide with examples
- ✅ `package.json` - Package metadata, scripts, dependencies
- ✅ `tsconfig.json` - TypeScript configuration
- ✅ `.gitignore` - Excludes dist/, reports/, node_modules/

**Documentation Quality**:
- Comprehensive API examples
- CLI usage patterns
- Programmatic usage (TypeScript)
- Troubleshooting section
- Integration with CI/CD
- Custom scenario creation guide

### 6. Example Scripts

**Files**:
- `scripts/example-run.sh` - Complete example workflow

---

## Architecture Decisions

### ✅ API-Only Interaction
- **No direct database access** (Neo4j, PostgreSQL, Redis)
- All data flows through GraphQL/REST APIs
- Ensures:
  - Authorization checks
  - Audit logging
  - Schema validation

### ✅ Deterministic Testing
- Fixed seeds for reproducible results
- Same scenario → same data every time
- Critical for regression testing

### ✅ Safety-First Design
- Multiple layers of validation
- Production URL blocking
- Test tenant enforcement
- Clear labeling (`sim_harness: true`)

### ✅ Config-Driven Extensibility
- YAML scenarios (no code changes needed)
- YAML workflows (declarative investigation paths)
- JSON expectations (ground truth for validation)

### ✅ Multi-Format Reporting
- **JSON**: Machine-readable for CI
- **HTML**: Interactive dashboards for humans
- **CSV**: Spreadsheet analysis

---

## File Structure

```
packages/sim-harness/
├── src/
│   ├── generator/
│   │   └── ScenarioGenerator.ts        # Synthetic data generation
│   ├── analyst/
│   │   └── GhostAnalyst.ts             # Workflow automation
│   ├── metrics/
│   │   ├── MetricsCollector.ts         # Aggregation
│   │   └── reporters/
│   │       ├── HtmlReporter.ts         # Interactive dashboard
│   │       ├── JsonReporter.ts         # Structured output
│   │       └── CsvReporter.ts          # Spreadsheet export
│   ├── utils/
│   │   ├── random.ts                   # Seeded RNG
│   │   └── safety.ts                   # Safety guards
│   ├── types/
│   │   └── index.ts                    # TypeScript types
│   ├── __tests__/
│   │   ├── ScenarioGenerator.test.ts   # Unit tests
│   │   └── integration.test.ts         # Integration tests
│   ├── index.ts                        # Public API
│   └── cli.ts                          # CLI tool
├── test-data/
│   ├── scenarios/
│   │   ├── fraud-ring.yaml             # Financial crime template
│   │   ├── terror-cell.yaml            # Security threat template
│   │   └── corruption-network.yaml     # Corruption template
│   ├── workflows/
│   │   └── basic-investigation.yaml    # Example workflow
│   └── expectations/
│       └── fraud-ring.json             # Expected outcomes
├── scripts/
│   └── example-run.sh                  # Usage example
├── reports/                            # Generated reports (gitignored)
├── README.md                           # Architecture overview
├── USAGE.md                            # Detailed usage guide
├── package.json                        # Package config
├── tsconfig.json                       # TypeScript config
├── jest.config.cjs                     # Jest config
└── .gitignore
```

---

## Usage Examples

### Quick Start
```bash
cd packages/sim-harness
pnpm install
pnpm build

# Run evaluation (requires stack: make up)
pnpm run-scenario run --scenario fraud-ring --seed 42 --sessions 3
```

### Programmatic Usage
```typescript
import { ScenarioGenerator, GhostAnalyst, MetricsCollector } from '@intelgraph/sim-harness';

// Generate scenario
const generator = new ScenarioGenerator({ template: 'fraud-ring', params: { seed: 42 } });
const scenario = await generator.generate();

// Run ghost analyst
const analyst = new GhostAnalyst({
  apiUrl: 'http://localhost:4000/graphql',
  tenantId: 'test-001',
  script: workflow
});
const session = await analyst.run({ scenario });

// Collect metrics
const collector = new MetricsCollector();
collector.addSession(session);
const report = await collector.generateReport();
```

### CI Integration
```yaml
- name: Run scenario evaluation
  run: |
    cd packages/sim-harness
    pnpm build
    pnpm run-scenario run --scenario fraud-ring --sessions 5 --format json
```

---

## Metrics & Validation

### Quality Thresholds (CI)
- **Success Rate**: ≥ 80%
- **Entity Discovery Rate**: ≥ 70%
- **Relationship Discovery Rate**: ≥ 70%
- **Max Query Latency (p95)**: < 5000ms

### Captured Metrics
- **Performance**: Duration, latency percentiles, time-to-insight
- **Correctness**: Discovery rates, false positives/negatives
- **Reliability**: Success/error/timeout rates

---

## Integration Points

### APIs Used
1. **GraphQL API** (`/graphql`):
   - `createInvestigation`
   - `createEntity`
   - `createRelationship`
   - `startCopilotRun`
   - Entity/relationship queries

2. **REST API** (`/api/*`):
   - Health checks
   - Batch operations (future)

3. **WebSocket** (`/socket.io`):
   - Real-time updates (optional)

### Dependencies
- `axios`: HTTP client
- `commander`: CLI framework
- `ws`: WebSocket client
- `yaml`: YAML parsing
- `uuid`: ID generation
- `zod`: Schema validation (future)

---

## Testing Strategy

### Local Testing
```bash
# Unit tests
pnpm test

# Integration tests (requires stack)
make up
pnpm test:integration

# Manual CLI test
pnpm run-scenario run --scenario fraud-ring --verbose
```

### CI Testing
- Automated on PR (affects sim-harness or core APIs)
- Runs all 3 scenarios
- Validates quality thresholds
- Uploads reports as artifacts
- Comments on PR with results

---

## Future Enhancements

**Roadmap** (from README.md):
- [ ] LLM-based adaptive ghost analysts
- [ ] Multi-agent simulations (concurrent analysts)
- [ ] Anomaly injection (simulated system failures)
- [ ] Performance benchmarking dashboard
- [ ] Integration with A/B testing framework
- [ ] More scenario templates (money laundering, insider threats, etc.)
- [ ] Advanced assertions (JSONPath, regex patterns)
- [ ] Session recording/replay for debugging

---

## Compliance with Requirements

### ✅ SCOPE - Non-Production Module
- Works **only** via public APIs (no direct DB access)
- Confined to `sim-harness/` package
- Does not touch production codepaths

### ✅ Scenario Generator
- ✅ Templated scenarios (fraud, terror, corruption)
- ✅ Parameterization (size, noise, missing data)
- ✅ Deterministic (fixed seeds)
- ✅ Ingestible formats (JSON → GraphQL API)

### ✅ Ghost Analyst
- ✅ Scripted workflows (YAML)
- ✅ API-driven (GraphQL/REST only)
- ✅ Session capture with metrics

### ✅ Metrics & Reporting
- ✅ Performance, correctness, reliability metrics
- ✅ Multi-format output (JSON, HTML, CSV)
- ✅ Version comparison support
- ✅ Regression detection

### ✅ Safety
- ✅ Production URL blocking
- ✅ Test tenant enforcement
- ✅ Data size limits
- ✅ Clear labeling (`sim_harness: true`)

### ✅ Testing & Quality
- ✅ Unit tests (determinism, validation)
- ✅ Integration tests (end-to-end)
- ✅ CI workflow for automation

---

## Git Commit

**Branch**: `claude/scenario-evaluation-harness-01LpEFk2r68S4iQQWVrNx8Af`

**Commit Message**:
```
feat: add scenario evaluation harness for IntelGraph

Implements comprehensive simulation and evaluation framework for testing
Copilot, Analytics, and UI workflows through automated "ghost analyst" sessions.
```

**Files Added**: 26 files (4,250+ lines)
- Core implementation (TypeScript)
- Tests (Jest)
- Documentation (README, USAGE)
- CI workflow (GitHub Actions)
- Example scenarios and workflows

**Status**: ✅ Pushed to remote

---

## Next Steps

### For Developers
1. **Install dependencies**:
   ```bash
   cd packages/sim-harness
   pnpm install
   ```

2. **Build harness**:
   ```bash
   pnpm build
   ```

3. **Run example**:
   ```bash
   make up  # Start IntelGraph stack
   pnpm run-scenario run --scenario fraud-ring
   ```

4. **View report**:
   ```bash
   open reports/*-report.html
   ```

### For CI/CD
- Workflow auto-runs on PRs affecting sim-harness
- Manual trigger via GitHub Actions UI
- Reports uploaded as artifacts

### For Custom Scenarios
1. Create YAML template in `test-data/scenarios/`
2. Define expected outcomes in `test-data/expectations/`
3. Run: `pnpm run-scenario run --scenario custom.yaml`

---

## References

- **Implementation**: `packages/sim-harness/`
- **Documentation**: `packages/sim-harness/README.md`, `USAGE.md`
- **CI Workflow**: `.github/workflows/scenario-evaluation.yml`
- **CLAUDE.md**: Followed project conventions
- **Golden Path**: Modeled after `scripts/smoke-test.js`

---

**End of Implementation Summary**
