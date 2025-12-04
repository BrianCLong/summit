# Plan Eval Platform

Evaluation-first platform for Summit/IntelGraph with cost-aware routing and telemetry.

## Overview

This package provides a comprehensive toolkit for evaluating, routing, and monitoring tool-augmented language model systems. Key features:

- **Scenario-based evaluation**: YAML-defined multi-step scenarios with success criteria
- **Cost-aware routing**: Configurable quality-cost tradeoff optimization
- **Adaptive learning**: Routers that improve from evaluation outcomes
- **Safety checks**: Built-in red-team testing and safety validation
- **Structured traces**: Canonical trace schema for observability

## Installation

```bash
pnpm install
```

## Quick Start

### 1. List available scenarios

```bash
pnpm eval:run list
```

### 2. Run evaluations

```bash
pnpm eval:run run --router greedy_cost --cost-weight 0.5
```

### 3. Run safety tests

```bash
pnpm eval:run safety --verbose
```

### 4. Generate benchmark report

```bash
pnpm benchmark:report
```

## Architecture

```
plan-eval-platform/
├── src/
│   ├── eval/           # Evaluation engine
│   │   ├── runner.ts       # Main eval runner
│   │   ├── scenario-loader.ts  # YAML scenario loading
│   │   ├── metrics.ts      # Metrics aggregation
│   │   └── cli.ts          # Command-line interface
│   ├── runtime/        # Core runtime components
│   │   ├── trace-schema.ts    # Structured trace builder
│   │   ├── telemetry-client.ts  # JSONL/OTLP export
│   │   └── cost-model.ts      # Cost estimation
│   ├── routing/        # Routing implementations
│   │   ├── base-router.ts     # Abstract router
│   │   ├── random-router.ts   # Random baseline
│   │   ├── greedy-cost-router.ts  # Cost-aware greedy
│   │   └── adaptive-router.ts    # Learning router
│   ├── safety/         # Safety module
│   │   ├── checker.ts      # Pattern-based checks
│   │   └── red-team.ts     # Adversarial scenarios
│   └── types.ts        # Type definitions
├── scenarios/          # YAML evaluation scenarios
├── experiments/        # Evaluation traces output
├── benchmark/          # Benchmark reports
├── ip/                 # IP documentation
└── tests/              # Test suites
```

## Scenarios

Scenarios are defined in YAML format:

```yaml
id: code-correction-001
name: Fix Python Syntax Error
category: code_correction
difficulty: easy

tools:
  - name: code_interpreter
    costPerCall: 0.001
    avgLatencyMs: 150

steps:
  - id: step-1
    type: prompt
    input: |
      Fix the syntax error in this code...
    allowedTools:
      - code_interpreter

successCriteria:
  - type: contains
    value: "def function_name():"

constraints:
  maxTotalTokens: 1000
  maxTotalCostUsd: 0.01
```

## Routing

Three router implementations are available:

### Random Router (Baseline)
```typescript
import { createRandomRouter } from '@intelgraph/plan-eval-platform/routing';
const router = createRandomRouter();
```

### Greedy Cost-Aware Router
```typescript
import { createGreedyCostRouter } from '@intelgraph/plan-eval-platform/routing';
const router = createGreedyCostRouter(0.5); // costWeight: 0=quality, 1=cost
```

### Adaptive Router
```typescript
import { createAdaptiveRouter } from '@intelgraph/plan-eval-platform/routing';
const router = createAdaptiveRouter({ learningRate: 0.1 });

// Record outcomes for learning
router.recordEvalOutcome(toolId, category, success, cost, latency, quality);
```

## Safety

Built-in safety checks:

- Jailbreak detection
- PII detection
- Harmful content filtering
- Injection attack detection
- Data exfiltration prevention

```typescript
import { createSafetyChecker } from '@intelgraph/plan-eval-platform/safety';

const checker = createSafetyChecker();
const result = await checker.checkInput(userInput);

if (!result.passed) {
  console.log('Violations:', result.violations);
}
```

## Telemetry

Traces are output in JSONL format for analysis:

```typescript
import { createTelemetryClient } from '@intelgraph/plan-eval-platform/runtime';

const telemetry = createTelemetryClient('./traces.jsonl');
telemetry.recordTrace(trace);
```

## API Reference

### EvalRunner

```typescript
const runner = createEvalRunner({
  scenariosPath: './scenarios',
  outputPath: './traces.jsonl',
  routingConfig: {
    type: 'greedy_cost',
    costWeight: 0.5,
    latencyBudgetMs: 5000,
  },
});

const results = await runner.runAll();
```

### MetricsCollector

```typescript
const collector = new MetricsCollector();
collector.addResults(results);

const metrics = collector.computeMetrics();
const summary = collector.generateSummary();
```

### TraceBuilder

```typescript
const trace = new TraceBuilder(scenarioId, runId);
const eventId = trace.startEvent('tool_call_start', 'code_interpreter');
// ... execute tool
trace.endEvent(eventId, 'success', { durationMs: 150 });
const finalTrace = trace.build();
```

## Development

```bash
# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## License

MIT
