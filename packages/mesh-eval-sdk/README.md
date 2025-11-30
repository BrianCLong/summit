# @intelgraph/mesh-eval-sdk

TypeScript SDK for the Agentic Mesh Evaluation & Auto-Improvement Harness.

## Overview

This package provides core type definitions, validators, and utilities for building evaluation scenarios, scoring agent outputs, and implementing auto-improvement loops for the Agentic Mesh platform.

## Installation

```bash
pnpm add @intelgraph/mesh-eval-sdk
```

## Usage

### Basic Types

```typescript
import type {
  EvalScenario,
  EvalConfig,
  EvalRun,
  EvalScore,
  ScenarioResult,
} from '@intelgraph/mesh-eval-sdk';

// Define an evaluation scenario
const scenario: EvalScenario = {
  id: 'sc-code-refactor-001',
  version: '1.0.0',
  type: 'code_transformation',
  name: 'Simple Function Refactoring',
  description: 'Refactor a nested conditional into early returns',
  tags: ['code', 'refactoring', 'readability'],
  inputs: [
    {
      type: 'code',
      content: 'function foo(x) { if (x > 0) { ... } }',
    },
  ],
  constraints: [
    {
      type: 'time_limit',
      value: 30000,
      strict: true,
    },
  ],
  scoringStrategy: {
    method: 'rule_based',
    rules: {
      assertions: [
        {
          type: 'contains',
          value: 'return',
          weight: 1.0,
        },
      ],
    },
  },
  difficulty: 'easy',
  estimatedCost: 0.01,
  estimatedDuration: 5000,
  createdAt: new Date(),
  createdBy: 'system',
  updatedAt: new Date(),
};
```

### Validation

```typescript
import { validateScenario, safeValidate, EvalScenarioSchema } from '@intelgraph/mesh-eval-sdk';

// Validate and throw on error
const validatedScenario = validateScenario(unknownData);

// Safe validation
const result = safeValidate(EvalScenarioSchema, unknownData);
if (result.success) {
  console.log('Valid:', result.data);
} else {
  console.error('Invalid:', result.error);
}
```

### Utilities

```typescript
import {
  aggregateScores,
  calculateOverallScore,
  compareToBaseline,
  formatScore,
  formatCost,
  formatDuration,
  generateMarkdownSummary,
} from '@intelgraph/mesh-eval-sdk';

// Aggregate scenario results
const summary = aggregateScores(scenarioResults);

// Calculate weighted score
const overallScore = calculateOverallScore(
  { correctness: 0.9, safety: 0.95, efficiency: 0.8 },
  { correctness: 0.6, safety: 0.3, efficiency: 0.1 },
);

// Compare to baseline
const comparison = compareToBaseline(evalRun, baselineSnapshot);
console.log('Regressions:', comparison.regressions);
console.log('Improvements:', comparison.improvements);

// Format for display
console.log(formatScore(0.856)); // "85.6%"
console.log(formatCost(0.0042)); // "$0.0042"
console.log(formatDuration(125000)); // "2m 5s"

// Generate markdown report
const markdown = generateMarkdownSummary(evalRun);
```

## API Reference

### Core Types

- **`EvalScenario`**: Complete evaluation scenario definition
- **`EvalConfig`**: Configuration for an evaluation run
- **`EvalRun`**: Evaluation run instance with results
- **`EvalScore`**: Structured scoring output
- **`ScenarioResult`**: Result of executing a single scenario
- **`EvalFinding`**: Structured issue/insight
- **`BaselineSnapshot`**: Versioned performance baseline
- **`UpdateProposal`**: Proposed configuration update
- **`SelfPlayConfig`**: Self-play execution configuration
- **`CurriculumConfig`**: Curriculum learning configuration

See [types.ts](./src/types.ts) for complete type definitions.

### Validators

All validators are built with [Zod](https://zod.dev) for runtime type checking:

- **`EvalScenarioSchema`**
- **`EvalConfigSchema`**
- **`EvalRunSchema`**
- **`BaselineSnapshotSchema`**
- **`UpdateProposalSchema`**

Helper functions:
- **`validateScenario(data)`**: Validate and parse scenario
- **`validateEvalConfig(data)`**: Validate and parse config
- **`validateEvalRun(data)`**: Validate and parse run
- **`validateBaseline(data)`**: Validate and parse baseline
- **`validateProposal(data)`**: Validate and parse proposal
- **`safeValidate(schema, data)`**: Safe validation returning result object

### Utilities

#### ID Generation
- **`generateScenarioId(type, sequence?)`**: Generate scenario ID
- **`generateRunId(prefix?)`**: Generate run ID
- **`generateFindingId(runId, scenarioId, index)`**: Generate finding ID

#### Score Calculation
- **`calculateOverallScore(dimensions, weights?)`**: Calculate weighted score
- **`normalizeScore(score, min?, max?)`**: Normalize to 0-1
- **`determinePassFail(score, threshold?)`**: Determine pass/fail status
- **`aggregateScores(results)`**: Aggregate scenario results

#### Baseline Comparison
- **`compareToBaseline(run, baseline)`**: Compare run to baseline
- **`determineSeverity(magnitude)`**: Determine regression severity

#### Formatting
- **`formatScore(score, decimals?)`**: Format score as percentage
- **`formatCost(cost, decimals?)`**: Format cost as USD
- **`formatDuration(milliseconds)`**: Format duration
- **`formatTimestamp(date, includeTime?)`**: Format timestamp

#### Statistics
- **`calculatePercentile(value, distribution)`**: Calculate percentile
- **`calculateStats(values)`**: Statistical summary

#### Filtering
- **`filterByStatus(results, status)`**: Filter by status
- **`filterByMinScore(results, minScore)`**: Filter by minimum score
- **`groupByScenarioType(results, scenarios)`**: Group by scenario type

#### Report Generation
- **`generateMarkdownSummary(run)`**: Generate markdown report
- **`generateJsonArtifact(run)`**: Generate JSON artifact

## Development

```bash
# Build
pnpm build

# Type check
pnpm typecheck

# Lint
pnpm lint
pnpm lint:fix

# Test
pnpm test
```

## License

UNLICENSED - Internal use only
