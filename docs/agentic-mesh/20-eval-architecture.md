# Agentic Mesh Evaluation & Auto-Improvement Architecture

> **Version**: 1.0.0
> **Last Updated**: 2025-11-22
> **Status**: Active Development
> **Owner**: Platform Team

## Executive Summary

The **Mesh Evaluation Harness** is a production-grade subsystem for continuously evaluating, benchmarking, and improving the Agentic Mesh platform through:

- **Systematic benchmarking** against baselines and external systems
- **Self-play and curriculum learning** for continuous improvement
- **Safety-first feedback loops** into policy and routing
- **Regression protection** with versioned baselines
- **Full observability** of evaluation metrics

This system treats evaluation as a **first-class production concern**, not a research afterthought.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Data Models](#data-models)
4. [Integration Points](#integration-points)
5. [Evaluation Lifecycle](#evaluation-lifecycle)
6. [Self-Play & Curriculum](#self-play--curriculum)
7. [Feedback Loops](#feedback-loops)
8. [Security & Compliance](#security--compliance)
9. [Deployment](#deployment)
10. [Observability](#observability)

---

## Architecture Overview

### Design Principles

1. **Production-Grade**: All components are production-ready with proper error handling, logging, and monitoring
2. **Modular**: Each component has clear boundaries and can be developed/deployed independently
3. **Composable**: Evaluation strategies can be mixed and matched
4. **Safe**: All improvements flow through policy enforcement and human approval
5. **Observable**: Rich metrics and dashboards for all evaluation activities

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Mesh Evaluation Harness                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │  Scenario   │  │   Scoring    │  │   Self-Play         │   │
│  │  Registry   │  │   Engine     │  │   Coordinator       │   │
│  └─────────────┘  └──────────────┘  └─────────────────────┘   │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │    Eval     │  │   Baseline   │  │   Feedback          │   │
│  │   Runner    │  │    Store     │  │   Optimizer         │   │
│  └─────────────┘  └──────────────┘  └─────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │            Metrics Exporter & Observability             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                            ▲  │
                            │  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Agentic Mesh Core                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │    Mesh     │  │   Routing    │  │    Policy           │   │
│  │ Orchestrator│  │   Gateway    │  │    Engine           │   │
│  └─────────────┘  └──────────────┘  └─────────────────────┘   │
│                                                                 │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │ Provenance  │  │    Agent     │  │    Tool             │   │
│  │  Service    │  │   Registry   │  │   Registry          │   │
│  └─────────────┘  └──────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Scenario Registry

**Purpose**: Centralized repository for evaluation scenarios and tasks

**Responsibilities**:
- Store and version evaluation scenarios
- Provide CRUD API for scenario management
- Support scenario tagging and categorization
- Enable scenario search and filtering

**API Surface**:
```typescript
POST   /scenarios              # Create new scenario
GET    /scenarios              # List scenarios (with filters)
GET    /scenarios/:id          # Get specific scenario
PUT    /scenarios/:id          # Update scenario
DELETE /scenarios/:id          # Delete scenario
GET    /scenarios/tags         # List available tags
GET    /scenarios/types        # List scenario types
```

**Storage**: PostgreSQL with JSONB for flexible scenario data

**Service Location**: `services/scenario-registry/`

### 2. Scoring Engine

**Purpose**: Pluggable framework for evaluating agent outputs

**Responsibilities**:
- Execute scoring strategies (rule-based, LLM-judged, policy-based)
- Combine multiple scoring approaches
- Provide structured, comparable results
- Support custom scoring plugins

**Scoring Modes**:

1. **Rule-Based**:
   - Exact match / regex validation
   - Assertion-based checks
   - Structural validation

2. **LLM-Judged**:
   - Designated judge agent evaluates outputs
   - Multi-dimensional scoring (correctness, coherence, safety)
   - Rationale generation

3. **Policy-Based**:
   - Policy enforcement event counts
   - Security/compliance threshold checks
   - Redaction and escalation tracking

**Service Location**: `services/scoring-engine/`

### 3. Eval Runner

**Purpose**: Orchestrate evaluation runs across scenarios and agents

**Responsibilities**:
- Load and prepare scenarios
- Submit tasks to Mesh Orchestrator
- Collect and aggregate results
- Invoke scoring engine
- Generate reports and artifacts

**Execution Modes**:
- **Smoke Suite**: Fast, critical path scenarios
- **Extended Suite**: Comprehensive coverage
- **Safety Suite**: Security and policy focus
- **Custom Suite**: User-defined scenario sets

**CLI Interface**:
```bash
mesh-eval run --suite smoke
mesh-eval run --suite safety --output ./artifacts/
mesh-eval run --scenarios sc-001,sc-002 --config ./eval-config.yaml
```

**Service Location**: `services/eval-runner/`

### 4. Self-Play Coordinator

**Purpose**: Generate synthetic scenarios and run multi-agent self-play

**Responsibilities**:
- Generate scenario variations and perturbations
- Orchestrate multi-agent self-play (planner/critic/red-team)
- Identify failure modes and edge cases
- Build curriculum based on performance gaps

**Self-Play Strategies**:
- **Adversarial**: Red-team vs. policy enforcement
- **Collaborative**: Planner + critic + verifier loops
- **Exploratory**: Automated scenario space exploration

**Service Location**: `services/selfplay-coordinator/`

### 5. Baseline Store

**Purpose**: Version and manage performance baselines

**Responsibilities**:
- Store versioned baseline metrics
- Compare new runs against baselines
- Detect and flag regressions
- Support multiple baseline tracks (release, branch, experimental)

**Baseline Types**:
- **Release Baselines**: Official metrics per release
- **Branch Baselines**: Development branch tracking
- **Experimental Baselines**: Feature testing

**Service Location**: `services/mesh-eval-baselines/`

### 6. Feedback Optimizer

**Purpose**: Convert evaluation insights into actionable improvements

**Responsibilities**:
- Analyze evaluation results for optimization opportunities
- Generate policy and routing update proposals
- Support A/B testing of configurations
- Provide human approval workflow

**Output Artifacts**:
- Routing configuration updates
- Policy rule adjustments
- Agent weight recommendations
- Model selection optimizations

**Service Location**: `services/mesh-eval-feedback/`

### 7. Metrics Exporter

**Purpose**: Export evaluation metrics to observability stack

**Responsibilities**:
- Emit Prometheus metrics
- Send OpenTelemetry traces
- Generate structured logs
- Support custom metric exporters

**Key Metrics**:
- `mesh_eval_scenario_pass_rate`
- `mesh_eval_safety_violations`
- `mesh_eval_cost_per_scenario`
- `mesh_eval_latency_p95`

**Service Location**: `services/mesh-eval-metrics/`

---

## Data Models

### Core Types

All types defined in: `packages/mesh-eval-sdk/src/types.ts`

#### EvalScenario

Describes a task or test case for evaluation.

```typescript
interface EvalScenario {
  id: string;                    // Unique identifier (e.g., "sc-code-refactor-001")
  version: string;               // Semantic version
  type: ScenarioType;            // Scenario category
  name: string;                  // Human-readable name
  description: string;           // Detailed description
  tags: string[];                // Classification tags

  // Input specification
  inputs: ScenarioInput[];       // Input artifacts and prompts
  constraints: Constraint[];     // Execution constraints

  // Evaluation specification
  expectedOutputs?: ExpectedOutput[];  // Ground truth (if available)
  scoringStrategy: ScoringStrategy;    // How to score this scenario
  rubric?: EvaluationRubric;           // Scoring rubric

  // Metadata
  difficulty: 'trivial' | 'easy' | 'medium' | 'hard' | 'expert';
  estimatedCost: number;         // Estimated cost in USD
  estimatedDuration: number;     // Estimated duration in ms

  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

type ScenarioType =
  | 'code_transformation'
  | 'incident_investigation'
  | 'research_synthesis'
  | 'policy_sensitive'
  | 'export_controlled'
  | 'adversarial_prompting'
  | 'multi_step_reasoning'
  | 'tool_usage'
  | 'custom';

interface ScenarioInput {
  type: 'text' | 'code' | 'file' | 'structured';
  content: string | object;
  metadata?: Record<string, unknown>;
}

interface Constraint {
  type: 'time_limit' | 'cost_limit' | 'policy_requirement' | 'tool_restriction';
  value: unknown;
  strict: boolean;  // Hard fail vs. soft warning
}
```

#### EvalConfig

Configuration for an evaluation run.

```typescript
interface EvalConfig {
  id: string;
  name: string;

  // What to evaluate
  scenarios: string[];           // Scenario IDs or suite name

  // How to evaluate
  agents: AgentConfig[];         // Which agents to use
  models: ModelConfig[];         // Which models to route to
  routingPolicy?: string;        // Routing policy version
  tools?: string[];              // Available tools

  // Evaluation parameters
  iterations?: number;           // Runs per scenario
  parallelism?: number;          // Concurrent executions
  timeout?: number;              // Global timeout

  // Output configuration
  outputPath?: string;
  reportFormat?: 'json' | 'markdown' | 'html' | 'all';

  metadata?: Record<string, unknown>;
}
```

#### EvalRun

An instance of executing an evaluation.

```typescript
interface EvalRun {
  id: string;                    // Unique run ID
  configId: string;              // Reference to EvalConfig

  // Execution metadata
  startedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

  // Results
  scenarios: ScenarioResult[];   // Results per scenario
  summary: EvalSummary;          // Aggregate metrics

  // Context
  gitCommit?: string;            // Code version
  branch?: string;
  environment: string;           // dev, staging, prod
  triggeredBy: string;           // User or CI system

  // Artifacts
  artifactUrls?: string[];       // S3/storage URLs

  metadata?: Record<string, unknown>;
}

interface ScenarioResult {
  scenarioId: string;
  status: 'pass' | 'fail' | 'skip' | 'error';
  score: EvalScore;
  findings: EvalFinding[];
  executionTime: number;
  cost: number;

  // Detailed outputs
  agentOutputs: unknown[];
  policyEvents: PolicyEvent[];
  provenanceTrace: string;       // Reference to provenance service
}
```

#### EvalScore

Structured scoring output.

```typescript
interface EvalScore {
  // Numeric scores (0-1 normalized)
  overall: number;
  dimensions: {
    correctness?: number;
    coherence?: number;
    completeness?: number;
    safety?: number;
    efficiency?: number;
    [key: string]: number | undefined;
  };

  // Categorical assessments
  passFailStatus: 'pass' | 'fail' | 'partial' | 'uncertain';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';

  // Qualitative feedback
  rationale: string;             // Why this score
  strengths: string[];           // What went well
  weaknesses: string[];          // What needs improvement

  // Scoring metadata
  scoringMethod: 'rule_based' | 'llm_judged' | 'policy_based' | 'hybrid';
  judgeModel?: string;           // If LLM-judged
  confidence?: number;           // Judge confidence (0-1)
}
```

#### EvalFinding

Structured description of issues or insights.

```typescript
interface EvalFinding {
  id: string;
  scenarioId: string;
  runId: string;

  type: FindingType;
  severity: 'info' | 'warning' | 'error' | 'critical';

  title: string;
  description: string;

  // Location information
  location?: {
    agent?: string;
    step?: number;
    toolCall?: string;
    line?: number;
  };

  // Remediation
  recommendation?: string;
  relatedFindings?: string[];    // Link to similar issues

  createdAt: Date;
}

type FindingType =
  | 'correctness_issue'
  | 'safety_violation'
  | 'policy_breach'
  | 'performance_regression'
  | 'cost_anomaly'
  | 'tool_misuse'
  | 'reasoning_error'
  | 'hallucination'
  | 'prompt_injection'
  | 'data_leakage';
```

#### BaselineSnapshot

Versioned performance baseline.

```typescript
interface BaselineSnapshot {
  id: string;
  version: string;               // Semantic version or git tag
  track: 'release' | 'branch' | 'experimental';

  // Aggregate metrics
  metrics: {
    overallPassRate: number;
    avgCorrectness: number;
    avgSafety: number;
    avgCost: number;
    p95Latency: number;
    [key: string]: number;
  };

  // Per-scenario baselines
  scenarioBaselines: Map<string, ScenarioBaseline>;

  // Metadata
  createdAt: Date;
  createdBy: string;
  gitCommit: string;
  notes?: string;
}

interface ScenarioBaseline {
  scenarioId: string;
  passRate: number;
  avgScore: number;
  p95Latency: number;
  avgCost: number;
}
```

#### UpdateProposal

Proposed changes to routing or policy.

```typescript
interface UpdateProposal {
  id: string;
  type: 'routing' | 'policy' | 'agent_config';

  // What changed
  summary: string;
  diff: ConfigDiff;              // Structured diff

  // Why
  rationale: string;
  supportingData: {
    evalRunIds: string[];
    metrics: Record<string, number>;
    regressionTests: string[];
  };

  // Approval workflow
  status: 'pending' | 'approved' | 'rejected' | 'implemented';
  requestedAt: Date;
  requestedBy: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
}
```

---

## Integration Points

### With Mesh Orchestrator

The Eval Runner submits evaluation tasks through the standard Mesh Orchestrator API:

```typescript
// Submit eval task
const taskId = await meshOrchestrator.submitTask({
  agentId: evalConfig.agents[0].id,
  prompt: scenario.inputs[0].content,
  tools: evalConfig.tools,
  policy: evalConfig.routingPolicy,
  metadata: { evalRunId, scenarioId },
});

// Monitor execution
const result = await meshOrchestrator.getTaskResult(taskId);
```

**Integration Location**: `services/eval-runner/src/integrations/mesh.ts`

### With Policy Engine

The Scoring Engine queries policy enforcement events:

```typescript
// Get policy events for a task
const policyEvents = await policyEngine.getEventsForTask(taskId);

// Calculate policy compliance score
const policyScore = scoringEngine.scorePolicyCompliance(policyEvents);
```

**Integration Location**: `services/scoring-engine/src/integrations/policy.ts`

### With Provenance Service

All evaluation runs are recorded in the provenance ledger:

```typescript
// Record eval run
await provenanceService.recordEvalRun({
  runId: evalRun.id,
  scenarios: evalRun.scenarios.map(s => s.scenarioId),
  scores: evalRun.scenarios.map(s => s.score),
  findings: evalRun.scenarios.flatMap(s => s.findings),
});
```

**Integration Location**: `services/eval-runner/src/integrations/provenance.ts`

### With Observability Stack

Metrics are exported to Prometheus and OpenTelemetry:

```typescript
// Emit scenario completion metric
metricsExporter.recordScenarioResult({
  scenarioId,
  scenarioType: scenario.type,
  status: result.status,
  score: result.score.overall,
  duration: result.executionTime,
  cost: result.cost,
});
```

**Integration Location**: `services/mesh-eval-metrics/src/exporters/`

---

## Evaluation Lifecycle

### Phase 1: Preparation

1. **Load Configuration**: Read `EvalConfig` from CLI args, file, or API
2. **Resolve Scenarios**: Fetch scenarios from Scenario Registry
3. **Initialize Services**: Connect to Mesh Orchestrator, Policy Engine, etc.
4. **Create Run Record**: Initialize `EvalRun` in database

### Phase 2: Execution

1. **For Each Scenario**:
   - Submit task to Mesh Orchestrator with scenario inputs
   - Monitor execution with timeout
   - Collect agent outputs and intermediate states
   - Capture policy events and provenance traces

2. **Parallel Execution**: Use worker pool for concurrent scenario runs (respecting `parallelism` config)

3. **Error Handling**: Gracefully handle timeouts, agent failures, service unavailability

### Phase 3: Scoring

1. **Select Scoring Strategy**: Based on scenario configuration
2. **Execute Scorers**:
   - Rule-based assertions
   - LLM judge calls (if configured)
   - Policy compliance analysis
3. **Aggregate Scores**: Combine multi-dimensional scores into overall score
4. **Generate Findings**: Extract actionable insights from failures

### Phase 4: Reporting

1. **Update Run Record**: Mark completion, write summary statistics
2. **Generate Artifacts**:
   - JSON results (machine-readable)
   - Markdown summary (human-readable)
   - HTML dashboard (rich visualization)
3. **Export Metrics**: Push to Prometheus, OpenTelemetry
4. **Store Artifacts**: Upload to S3 or configured storage

### Phase 5: Analysis

1. **Compare to Baseline**: Load relevant baseline and compute deltas
2. **Detect Regressions**: Flag scenarios that degraded beyond threshold
3. **Generate Proposals**: Identify optimization opportunities
4. **Trigger Alerts**: Notify teams of critical regressions or safety issues

---

## Self-Play & Curriculum

### Self-Play Modes

#### 1. Adversarial Self-Play

**Goal**: Stress-test policy enforcement and safety guardrails

**Setup**:
- **Red Team Agent**: Attempts to bypass policies, exfiltrate data, or generate harmful outputs
- **Defense Agent**: Standard agent with policy enforcement
- **Judge Agent**: Evaluates whether red team succeeded

**Metrics**:
- Attack success rate
- Policy detection rate
- False positive rate

#### 2. Collaborative Self-Play

**Goal**: Improve reasoning and tool usage through multi-agent interaction

**Setup**:
- **Planner Agent**: Proposes solution approach
- **Critic Agent**: Reviews and challenges plan
- **Verifier Agent**: Tests implementation
- **Judge Agent**: Scores overall quality

**Metrics**:
- Solution correctness
- Number of iterations to convergence
- Inter-agent agreement scores

#### 3. Exploratory Self-Play

**Goal**: Discover novel scenarios and edge cases

**Setup**:
- **Generator Agent**: Creates scenario variations
- **Solver Agent**: Attempts to solve generated scenarios
- **Difficulty Estimator**: Scores scenario difficulty based on solver performance

**Output**: New scenarios to add to registry

### Curriculum Learning

**Objective**: Focus evaluation effort on areas where the system struggles

**Process**:

1. **Performance Analysis**: Identify scenario types with lowest pass rates or scores
2. **Scenario Generation**: Create more scenarios in weak areas
3. **Difficulty Adjustment**: Generate easier or harder variants to explore performance boundaries
4. **Re-Evaluation**: Run expanded scenario set
5. **Feedback**: Propose policy/routing updates to address gaps

**Curriculum Strategies**:
- **Coverage-Based**: Ensure all scenario types are well-represented
- **Difficulty-Based**: Gradually increase complexity
- **Error-Driven**: Double down on failure modes

**Service**: `services/selfplay-coordinator/src/curriculum.ts`

---

## Feedback Loops

### Routing Optimization

**Input**: Evaluation results showing which models perform best on which scenario types

**Analysis**:
```typescript
// Identify optimal model per scenario type
const optimalRouting = analyzeModelPerformance({
  evalRuns: recentRuns,
  dimensions: ['correctness', 'cost', 'latency'],
  weights: { correctness: 0.6, cost: 0.2, latency: 0.2 },
});

// Generate routing update proposal
const proposal: RoutingUpdateProposal = {
  changes: {
    'code_transformation': 'claude-sonnet-4',  // High correctness
    'research_synthesis': 'gpt-4-turbo',       // Good balance
    'incident_investigation': 'claude-opus-3', // Complex reasoning
  },
  expectedImprovements: {
    overallScore: +0.08,
    totalCost: -0.15,
    avgLatency: -200,
  },
};
```

**Approval**: Human review required before applying to production routing

### Policy Refinement

**Input**: Policy violation patterns and false positive rates

**Analysis**:
```typescript
// Identify overly restrictive policies
const falsePositives = findFalsePositives({
  evalRuns: recentRuns,
  threshold: 0.1,  // >10% false positive rate
});

// Propose policy adjustments
const policyProposal: PolicyUpdateProposal = {
  policyId: 'data-exfiltration-detect',
  change: {
    type: 'threshold_adjustment',
    old: { sensitivity: 0.9 },
    new: { sensitivity: 0.7 },
  },
  rationale: 'High false positive rate (15%) on research tasks',
  expectedImpact: {
    falsePositiveRate: -0.10,
    truePositiveRate: -0.02,  // Acceptable trade-off
  },
};
```

### Agent Configuration

**Input**: Per-agent performance metrics

**Analysis**:
```typescript
// Recommend temperature/parameter adjustments
const agentTuning = optimizeAgentConfigs({
  evalRuns: recentRuns,
  agents: ['research-agent', 'code-agent'],
  parameters: ['temperature', 'max_tokens', 'top_p'],
});

// Example output
const agentProposal: AgentConfigProposal = {
  agentId: 'research-agent',
  changes: {
    temperature: 0.3,  // Reduced for consistency (was 0.7)
    max_tokens: 4096,  // Increased for completeness (was 2048)
  },
  supportingData: {
    coherenceImprovement: +0.12,
    completenessImprovement: +0.18,
  },
};
```

---

## Security & Compliance

### Secure Evaluation

1. **Scenario Isolation**: Each evaluation runs in isolated context
2. **Data Protection**: Sensitive data in scenarios is encrypted at rest
3. **Access Control**: RBAC for scenario management and eval triggering
4. **Audit Trail**: All evaluation activities logged to audit service

### Policy-Compliant Self-Play

Self-play activities must respect all production policies:

```typescript
// Red-team scenarios tagged as evaluation mode
const redTeamTask = {
  ...scenario.inputs,
  metadata: {
    evaluationMode: true,
    redTeamExercise: true,
  },
};

// Policy engine allows aggressive testing in eval mode
const policyContext = {
  mode: 'evaluation',
  allowRedTeam: true,
  logAllAttempts: true,
};
```

### Safe Feedback Application

**Human-in-the-Loop**: All proposals require approval:

```typescript
interface ApprovalWorkflow {
  proposalId: string;
  status: 'pending' | 'approved' | 'rejected';
  approvers: string[];           // Required approver roles
  approvedBy?: string;
  approvalNotes?: string;

  // Safety checks before application
  preDeploymentChecks: {
    smokeTestPassed: boolean;
    regressionTestPassed: boolean;
    securityReviewed: boolean;
  };
}
```

**Rollback Capability**: All configuration changes are versioned and reversible

---

## Deployment

### Service Deployment

Each component is a standalone service deployed via Kubernetes:

```yaml
# Example: services/scenario-registry/k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: scenario-registry
spec:
  replicas: 2
  selector:
    matchLabels:
      app: scenario-registry
  template:
    metadata:
      labels:
        app: scenario-registry
    spec:
      containers:
      - name: scenario-registry
        image: summit/scenario-registry:latest
        ports:
        - containerPort: 3000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: eval-db-credentials
              key: url
        - name: NODE_ENV
          value: production
```

### Database Schema

**PostgreSQL Tables**:

```sql
-- Scenarios
CREATE TABLE eval_scenarios (
  id VARCHAR(255) PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  type VARCHAR(100) NOT NULL,
  name VARCHAR(500) NOT NULL,
  description TEXT,
  tags TEXT[],
  inputs JSONB NOT NULL,
  constraints JSONB,
  expected_outputs JSONB,
  scoring_strategy JSONB NOT NULL,
  rubric JSONB,
  difficulty VARCHAR(50),
  estimated_cost DECIMAL(10,4),
  estimated_duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Eval runs
CREATE TABLE eval_runs (
  id VARCHAR(255) PRIMARY KEY,
  config_id VARCHAR(255),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL,
  git_commit VARCHAR(255),
  branch VARCHAR(255),
  environment VARCHAR(50),
  triggered_by VARCHAR(255),
  metadata JSONB,
  summary JSONB
);

-- Scenario results
CREATE TABLE scenario_results (
  id SERIAL PRIMARY KEY,
  run_id VARCHAR(255) REFERENCES eval_runs(id),
  scenario_id VARCHAR(255) REFERENCES eval_scenarios(id),
  status VARCHAR(50) NOT NULL,
  score JSONB NOT NULL,
  execution_time INTEGER,
  cost DECIMAL(10,4),
  agent_outputs JSONB,
  policy_events JSONB,
  provenance_trace VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Findings
CREATE TABLE eval_findings (
  id VARCHAR(255) PRIMARY KEY,
  scenario_id VARCHAR(255) REFERENCES eval_scenarios(id),
  run_id VARCHAR(255) REFERENCES eval_runs(id),
  type VARCHAR(100) NOT NULL,
  severity VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  location JSONB,
  recommendation TEXT,
  related_findings TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Baselines
CREATE TABLE baselines (
  id VARCHAR(255) PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  track VARCHAR(50) NOT NULL,
  metrics JSONB NOT NULL,
  scenario_baselines JSONB NOT NULL,
  git_commit VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  notes TEXT
);

-- Update proposals
CREATE TABLE update_proposals (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  summary TEXT NOT NULL,
  diff JSONB NOT NULL,
  rationale TEXT,
  supporting_data JSONB,
  status VARCHAR(50) NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  requested_by VARCHAR(255),
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT
);
```

**Indexes**:
```sql
CREATE INDEX idx_scenarios_type ON eval_scenarios(type);
CREATE INDEX idx_scenarios_tags ON eval_scenarios USING GIN(tags);
CREATE INDEX idx_runs_status ON eval_runs(status);
CREATE INDEX idx_runs_branch ON eval_runs(branch);
CREATE INDEX idx_results_run_id ON scenario_results(run_id);
CREATE INDEX idx_findings_severity ON eval_findings(severity);
```

---

## Observability

### Key Metrics

**Scenario Execution**:
```
mesh_eval_scenario_executions_total{scenario_type, status}
mesh_eval_scenario_duration_seconds{scenario_type, p50, p95, p99}
mesh_eval_scenario_cost_usd{scenario_type}
```

**Scoring**:
```
mesh_eval_score_overall{scenario_type}
mesh_eval_score_correctness{scenario_type}
mesh_eval_score_safety{scenario_type}
```

**Pass Rates**:
```
mesh_eval_pass_rate{scenario_type, suite}
mesh_eval_regression_detected{baseline_version}
```

**Safety**:
```
mesh_eval_safety_violations_total{violation_type}
mesh_eval_policy_denies_total{policy_id}
```

**Self-Play**:
```
mesh_eval_selfplay_rounds_total{mode}
mesh_eval_selfplay_attack_success_rate{red_team_agent}
mesh_eval_curriculum_scenarios_generated{difficulty}
```

### Dashboards

**Recommended Grafana Dashboards**:

1. **Eval Health Overview**:
   - Pass rates over time by suite
   - Score trends (overall, per dimension)
   - Execution time and cost trends
   - Recent regressions

2. **Safety & Policy Stress**:
   - Policy violation counts
   - Red-team success rates
   - High-severity findings
   - False positive trends

3. **Cost vs Quality Trade-off**:
   - Score vs. cost scatter plot
   - Model performance comparison
   - Routing efficiency metrics

4. **Self-Play Analytics**:
   - Curriculum coverage heatmap
   - Difficulty distribution
   - Scenario generation rate
   - Inter-agent agreement scores

**Dashboard Location**: `observability/grafana/dashboards/mesh-eval/`

### Alerting

**Critical Alerts**:

```yaml
# Regression detected
- alert: EvalRegressionCritical
  expr: mesh_eval_pass_rate < 0.85
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Critical eval regression detected"

# Safety violation spike
- alert: SafetyViolationSpike
  expr: rate(mesh_eval_safety_violations_total[5m]) > 0.1
  for: 2m
  labels:
    severity: high
  annotations:
    summary: "Unusual spike in safety violations"

# High cost anomaly
- alert: EvalCostAnomaly
  expr: mesh_eval_scenario_cost_usd > 10
  for: 1m
  labels:
    severity: warning
  annotations:
    summary: "Single scenario cost exceeded $10"
```

---

## Development Roadmap

### Phase 1: Foundation (Current)
- ✅ Architecture documentation
- 🔄 Core TypeScript types
- 🔄 Scenario registry
- 🔄 Scoring engine
- 🔄 Basic eval runner

### Phase 2: Integration
- ⏳ CI/CD integration
- ⏳ Baseline storage and comparison
- ⏳ Observability integration
- ⏳ Initial scenario corpus

### Phase 3: Intelligence
- ⏳ Self-play coordinator
- ⏳ Curriculum engine
- ⏳ Feedback optimizer
- ⏳ Automated proposal generation

### Phase 4: Production Hardening
- ⏳ High availability setup
- ⏳ Performance optimization
- ⏳ Comprehensive test coverage
- ⏳ Runbooks and documentation

---

## References

- [Agentic Mesh Core Architecture](./10-agentic-mesh-architecture.md)
- [Self-Play & Curriculum Details](./25-selfplay-curriculum.md)
- [Eval Getting Started Guide](./29-eval-getting-started.md)
- [Eval Dashboards](./28-eval-dashboards.md)

---

**Document Status**: Living document, updated as architecture evolves
**Feedback**: Platform team or via GitHub issues
