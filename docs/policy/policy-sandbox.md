# Policy Simulation Sandbox

The policy simulation sandbox provides a hermetic environment for iterating on data governance rules without touching production deployments. It ships as part of the `policy` package and bundles synthetic traffic tooling, diff visualisation, automated compliance heuristics, and benchmarking utilities.

## Components

### Sandbox Runtime (`PolicySandbox`)
- Spins up isolated `PolicyEngine` instances on demand to ensure evaluations never mutate the baseline rules.
- Generates repeatable what-if scenarios with configurable event volumes, edge-case probability, and scenario metadata.
- Produces evaluation summaries, policy diffs, optional compliance audits, and performance metrics in a single call.

### Synthetic Event Generator (`SyntheticEventGenerator`)
- Uses a deterministic linear congruential RNG so test runs can be reproduced exactly by passing the same seed.
- Emits realistic combinations of actions, resources, roles, and attributes derived from governance workloads.
- Injects stress cases (empty role sets, missing regions, retention overflow, consent violations) to pressure-test rules.
- Generates more than 10k events per second on commodity hardware; helper metrics track achieved throughput.

### Policy Diff Engine (`PolicyDiffEngine`)
- Compares before/after evaluation traces to highlight decision flips, obligation changes, and regression counts.
- Integrates with the sandbox runtime and can be called directly when bespoke evaluation data is available.

### Compliance Checker (`ComplianceChecker`)
- Runs lightweight heuristics aligned with GDPR, CCPA, and SOC2 expectations (regional controls, consent, audit logging, retention enforcement).
- Returns per-framework issue lists plus an aggregate compliance flag that fails on any blocking error.

### Performance Analysis (`PolicyPerformanceAnalyzer` / `PolicyBenchmarkSuite`)
- Benchmarks policy sets across large synthetic workloads, reporting throughput, latency percentiles, and allow/deny distributions.
- Includes a scenario orchestrator (`PolicyBenchmarkSuite`) for comparing multiple candidate policy revisions in batch.

## Usage Example

```ts
import {
  PolicySandbox,
  PolicyBenchmarkSuite,
  SyntheticEventGenerator
} from "policy";

const baselinePolicies = [...];
const sandbox = new PolicySandbox(baselinePolicies, { name: "governance-lab" });
const generator = new SyntheticEventGenerator({ seed: 2024 });
const events = generator.generateEvents(5000);

const scenario = sandbox.runScenario({
  name: "new-regional-controls",
  proposedPolicies: candidatePolicies,
  events,
  includeCompliance: true,
  includeBenchmark: true,
  benchmarkIterations: 3
});

console.log(scenario.diff?.decisionChanges, scenario.performance?.eventsPerSecond);

const suite = new PolicyBenchmarkSuite(sandbox);
const summaries = suite.runScenarios([
  { name: "baseline", eventCount: 1000 },
  { name: "candidate", proposedPolicies: candidatePolicies, includeBenchmark: true }
]);
```

## Testing

Run the policy package test suite to execute vitest coverage for the sandbox modules:

```bash
cd ga-graphai/packages/policy
npm test
```

The `PolicyPerformanceAnalyzer` test guards the 10k events-per-second target to ensure future policy changes do not regress throughput.

## Notes

- All helpers return clones of input policy rules so callers can re-use configuration objects safely.
- Compliance heuristics are conservative by design; teams should extend them with organisation-specific checks as needed.
- Benchmark results include warm-up controls to stabilise measurements on shared CI agents.
