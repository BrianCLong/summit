# Getting Started with Agentic Mesh Evaluation

> **Quick Start Guide for the Evaluation & Auto-Improvement Harness**

## Overview

This guide will help you get started with the Agentic Mesh Evaluation system, from creating scenarios to running evaluations and interpreting results.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Quick Start](#quick-start)
3. [Creating Scenarios](#creating-scenarios)
4. [Running Evaluations](#running-evaluations)
5. [Understanding Scores](#understanding-scores)
6. [Baseline Management](#baseline-management)
7. [Common Workflows](#common-workflows)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The evaluation system consists of several key components:

```
┌─────────────────┐      ┌──────────────┐      ┌─────────────┐
│   Scenario      │──────▶│   Scoring    │──────▶│    Eval     │
│   Registry      │      │   Engine     │      │   Runner    │
└─────────────────┘      └──────────────┘      └─────────────┘
        │                        │                     │
        │                        │                     │
        ▼                        ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Agentic Mesh Orchestrator                      │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Scenario Registry** - Stores and manages evaluation scenarios
2. **Scoring Engine** - Evaluates agent outputs using pluggable strategies
3. **Eval Runner** - Orchestrates evaluation runs
4. **Baseline Store** - Manages performance baselines
5. **Metrics Exporter** - Exports evaluation metrics

---

## Quick Start

### Prerequisites

```bash
# Ensure dependencies are installed
pnpm install

# Build the SDK and services
pnpm build

# Start required services (database, etc.)
docker-compose up -d postgres
```

### 1. Start the Scenario Registry

```bash
# Run database migrations
cd services/scenario-registry
pnpm db:migrate

# Start the service
pnpm dev
```

The registry will be available at `http://localhost:3100`.

### 2. Load Seed Scenarios

```bash
# Load the example scenarios
# (Script to be created)
node scripts/load-scenarios.js
```

### 3. Run a Smoke Evaluation

```bash
# Run the smoke test suite
# (Once eval-runner is implemented)
mesh-eval run --suite smoke
```

---

## Creating Scenarios

### Scenario Structure

A scenario consists of:

- **Metadata**: ID, name, description, tags, difficulty
- **Inputs**: What to provide to the agent
- **Constraints**: Time limits, cost limits, policy requirements
- **Scoring Strategy**: How to evaluate the output
- **Expected Outputs** (optional): Ground truth or assertions

### Example: Simple Code Refactoring Scenario

```yaml
id: sc-code-transformation-001
version: 1.0.0
type: code_transformation
name: Refactor Nested Conditionals
description: |
  Refactor deeply nested conditionals into early returns

tags:
  - code
  - refactoring
  - readability

inputs:
  - type: code
    content: |
      function processUser(user) {
        if (user) {
          if (user.isActive) {
            // ... nested logic
          }
        }
      }

constraints:
  - type: time_limit
    value: 60000
    strict: true

scoringStrategy:
  method: hybrid
  rules:
    assertions:
      - type: contains
        value: "if (!user)"
        weight: 0.3
  llmJudge:
    model: claude-sonnet-4
    prompt: "Evaluate this refactoring on readability..."
    dimensions:
      - readability
      - correctness
  weights:
    rule_based: 0.5
    llm_judged: 0.5

difficulty: easy
estimatedCost: 0.02
estimatedDuration: 5000
```

### Creating a Scenario via API

```typescript
import { ScenarioRepository } from '@intelgraph/scenario-registry';
import type { EvalScenario } from '@intelgraph/mesh-eval-sdk';

const scenario: EvalScenario = {
  id: 'sc-custom-001',
  version: '1.0.0',
  type: 'custom',
  name: 'My Custom Scenario',
  // ... rest of scenario definition
};

const repo = new ScenarioRepository(db);
await repo.create(scenario);
```

### Scenario Types

The system supports several scenario types:

- **`code_transformation`**: Code refactoring, optimization, bug fixes
- **`incident_investigation`**: Debugging, root cause analysis
- **`research_synthesis`**: Information gathering, summarization
- **`policy_sensitive`**: Security, compliance, data protection
- **`adversarial_prompting`**: Prompt injection, jailbreak attempts
- **`multi_step_reasoning`**: Complex problem solving
- **`tool_usage`**: Tool selection and usage patterns

---

## Running Evaluations

### Basic Evaluation Run

```typescript
import { ScoringEngine } from '@intelgraph/scoring-engine';
import type { ScoringContext } from '@intelgraph/scoring-engine';

const engine = new ScoringEngine();

const context: ScoringContext = {
  scenario: myScenario,
  output: agentOutput,
  policyEvents: [], // Optional
};

const score = await engine.score(context);

console.log(`Score: ${score.overall}`);
console.log(`Status: ${score.passFailStatus}`);
console.log(`Rationale: ${score.rationale}`);
```

### Scoring Strategies

#### 1. Rule-Based Scoring

Uses assertions to check output:

```yaml
scoringStrategy:
  method: rule_based
  rules:
    assertions:
      - type: contains
        value: "expected text"
        weight: 1.0
      - type: not_contains
        value: "forbidden text"
        weight: 1.0
    aggregation: all  # or 'any' or 'weighted_average'
```

#### 2. LLM-Judged Scoring

Uses a judge model to evaluate:

```yaml
scoringStrategy:
  method: llm_judged
  llmJudge:
    model: claude-sonnet-4
    prompt: |
      Evaluate on these dimensions:
      1. Correctness (0-1)
      2. Clarity (0-1)
      Provide scores and rationale.
    dimensions:
      - correctness
      - clarity
    temperature: 0.3
```

#### 3. Policy-Based Scoring

Checks policy compliance:

```yaml
scoringStrategy:
  method: policy_based
  policyScoring:
    maxViolations: 0
    requiredCompliance:
      - data-protection-policy
      - credential-security-policy
```

#### 4. Hybrid Scoring

Combines multiple strategies:

```yaml
scoringStrategy:
  method: hybrid
  rules:
    # ... rule-based config
  llmJudge:
    # ... LLM judge config
  policyScoring:
    # ... policy config
  weights:
    rule_based: 0.3
    llm_judged: 0.4
    policy_based: 0.3
```

---

## Understanding Scores

### Score Structure

```typescript
interface EvalScore {
  overall: number;              // 0-1 normalized score
  dimensions: Record<string, number>;  // Dimension-specific scores
  passFailStatus: 'pass' | 'fail' | 'partial' | 'uncertain';
  rationale: string;            // Explanation
  strengths: string[];          // What went well
  weaknesses: string[];         // What needs improvement
  scoringMethod: string;        // How it was scored
  judgeModel?: string;          // Judge model if applicable
  confidence?: number;          // Confidence in the score
}
```

### Interpreting Scores

- **0.9 - 1.0**: Excellent - Exceeds expectations
- **0.7 - 0.9**: Good - Meets expectations
- **0.5 - 0.7**: Fair - Partially meets expectations
- **0.0 - 0.5**: Poor - Does not meet expectations

**Safety-Critical Scenarios**: Typically require ≥0.9 to pass.

### Dimension Scores

Common dimensions include:

- **`correctness`**: Output is factually correct
- **`completeness`**: All requirements addressed
- **`coherence`**: Output is well-structured and logical
- **`safety`**: No policy violations or harmful content
- **`efficiency`**: Resource usage (time, cost)

---

## Baseline Management

### Creating a Baseline

```typescript
import type { BaselineSnapshot } from '@intelgraph/mesh-eval-sdk';

const baseline: BaselineSnapshot = {
  id: 'baseline-v1.0.0',
  version: '1.0.0',
  track: 'release',
  metrics: {
    overallPassRate: 0.92,
    avgCorrectness: 0.88,
    avgSafety: 0.95,
    avgCost: 0.05,
    p95Latency: 5000,
  },
  scenarioBaselines: new Map([
    ['sc-code-001', { passRate: 0.95, avgScore: 0.90, ... }],
    // ... more scenarios
  ]),
  gitCommit: 'abc123',
  createdAt: new Date(),
  createdBy: 'ci-system',
};
```

### Comparing to Baseline

```typescript
import { compareToBaseline } from '@intelgraph/mesh-eval-sdk';

const comparison = compareToBaseline(evalRun, baselineSnapshot);

console.log('Regressions:', comparison.regressions);
console.log('Improvements:', comparison.improvements);

if (comparison.regressions.length > 0) {
  console.error('REGRESSION DETECTED');
  comparison.regressions.forEach(r => {
    console.error(`- ${r.subject}: ${r.metric} dropped by ${r.delta}`);
  });
}
```

---

## Common Workflows

### Workflow 1: Local Development Testing

```bash
# 1. Create or modify a scenario
vi eval/scenarios/my-scenario.yaml

# 2. Run evaluation against specific scenario
mesh-eval run --scenarios sc-my-scenario-001

# 3. Review results
cat ./artifacts/eval-results.json
```

### Workflow 2: CI/CD Integration

```yaml
# .github/workflows/eval.yml
- name: Run Evaluation Smoke Suite
  run: |
    mesh-eval run --suite smoke --output ./artifacts/

- name: Compare to Baseline
  run: |
    mesh-eval compare \
      --current ./artifacts/eval.json \
      --baseline ./baselines/main.json \
      --policy ./eval/baseline-policy.yaml

- name: Fail on Regression
  run: |
    if [ $? -ne 0 ]; then
      echo "Regression detected!"
      exit 1
    fi
```

### Workflow 3: Batch Evaluation

```typescript
// Run evaluation across multiple scenarios
const scenarios = await scenarioRepo.list({ type: 'code_transformation' });

const results = [];
for (const scenario of scenarios.scenarios) {
  const score = await engine.score({
    scenario,
    output: await runAgentOnScenario(scenario),
  });
  results.push({ scenario: scenario.id, score });
}

// Aggregate and report
const summary = aggregateScores(results.map(r => ({
  scenarioId: r.scenario,
  score: r.score,
  // ...
})));

console.log(`Pass rate: ${summary.passRate * 100}%`);
```

---

## Troubleshooting

### Issue: Scenario Registry Won't Start

**Solution**: Check database connection

```bash
# Verify PostgreSQL is running
docker ps | grep postgres

# Check connection
psql -h localhost -U postgres -d intelgraph

# Re-run migrations
cd services/scenario-registry
pnpm db:migrate
```

### Issue: LLM Judge Scoring Fails

**Solution**: Ensure model client is configured

```typescript
// Configure model client
const modelClient = {
  async generateCompletion(params) {
    // Call your model gateway/router
    return await modelGateway.complete(params);
  }
};

const engine = new ScoringEngine(modelClient);
```

### Issue: Scores Are Always 0

**Solution**: Check scoring strategy configuration

```typescript
// Verify strategy has required fields
const strategy = scenario.scoringStrategy;

if (strategy.method === 'rule_based' && !strategy.rules) {
  console.error('Rule-based strategy requires rules configuration');
}

if (strategy.method === 'llm_judged' && !strategy.llmJudge) {
  console.error('LLM-judged strategy requires llmJudge configuration');
}
```

### Issue: High Evaluation Costs

**Solution**: Optimize scenarios and use caching

```yaml
# Use cheaper models for simple scenarios
llmJudge:
  model: claude-haiku  # Instead of opus

# Add cost constraints
constraints:
  - type: cost_limit
    value: 0.10
    strict: true
```

---

## Next Steps

1. **Create Custom Scenarios**: Define scenarios for your specific use cases
2. **Set Up CI Integration**: Automate evaluation in your CI/CD pipeline
3. **Establish Baselines**: Create performance baselines for regression detection
4. **Implement Self-Play**: Use self-play for continuous improvement
5. **Monitor Trends**: Set up dashboards to track evaluation metrics over time

---

## Resources

- [Architecture Documentation](./20-eval-architecture.md)
- [Self-Play Guide](./25-selfplay-curriculum.md)
- [Dashboard Configuration](./28-eval-dashboards.md)
- [API Reference](../../packages/mesh-eval-sdk/README.md)

---

**Need Help?**: Contact the platform team or file an issue on GitHub.
