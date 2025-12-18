
# Autonomic Layer

The Autonomic Layer turns Maestro Conductor into a "Self-Driving Platform". It continuously observes system signals, evaluates them against policy/SLOs, and applies control loops to optimize for reliability, cost, and performance.

## Core Components

### 1. Signals Service
Ingests telemetry (`Signal`) from tasks, agents, CI, and infra. Normalizes them into `HealthSnapshot`s for decision making.

### 2. Policy & SLOs
Evaluates health against `SLAContract`s. Manages `ErrorBudget`s. Emits `SLOAlert`s (WARNING, BREACH, EXHAUSTED) which trigger control loops.

### 3. Control Loops (MAPE-K)
- **Monitor**: Reads Health & Alerts.
- **Analyze**: Detects need for change (e.g. Budget exhausted? Latency spiking?).
- **Plan**: Proposes `AdaptationPlan` (e.g. "Throttle queue", "Switch model").
- **Execute**: Applies changes via Orchestrator APIs.

Implemented Loops:
- `ReliabilityLoop`: Protects stability (throttling, shedding load).
- `CostOptimizationLoop`: Managing spend (downgrading models).

### 4. Self-Healing
Reactive `HealingExecutor` runs `SelfHealingPlaybook`s based on immediate signal triggers (e.g., specific error codes -> fast retry).

### 5. Adaptive Routing
`AdaptiveRoutingService` learns `PerformanceProfile`s for agents/models. Uses Epsilon-Greedy to explore new options and exploit best performers based on success, latency, and cost.

### 6. Governance
`GovernanceEngine` sits between Planning and Execution. It reviews every `AdaptationPlan` against `RedLine`s (forbidden actions) and OPA policies. It can Approve, Deny, or Require Approval.

## Usage

### API

```http
GET /autonomic/health
GET /autonomic/slo
POST /autonomic/simulate
```

### SDK

```typescript
import { AutonomicLayer } from 'server/src/maestro/autonomic';

const autonomic = new AutonomicLayer();
autonomic.start(); // Starts background loops
```

## Extension

To add a new Control Loop:
1. Implement `ControlLoop` interface.
2. Register in `AutonomicLayer` constructor.

To add a new Playbook:
1. Define JSON/Object matching `SelfHealingPlaybook`.
2. Register with `healingExecutor.registerPlaybook()`.
