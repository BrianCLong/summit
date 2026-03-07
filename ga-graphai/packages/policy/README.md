# Policy Package

## GovernanceVerdict Mesh

The package now ships a universal governance mesh that standardises how every
microservice, workflow, and UI thread attaches a `GovernanceVerdict` to its
outputs. Use the `GovernanceOrchestrator` to evaluate user actions,
recommendations, and workflow results against dynamic policy rules. The
orchestrator accepts temporary rule overrides for simulations, emits
latency-aware verdict metadata, and exposes an adversarial probe harness to
continuously test for bypass attempts.

```ts
import { GovernanceOrchestrator, PolicyEngine } from "policy";

const orchestrator = new GovernanceOrchestrator(new PolicyEngine(myRules), {
  evaluatedBy: "governance-mesh",
  engineFactory: (rules) => new PolicyEngine(rules),
});

const envelope = orchestrator.evaluateUserAction(
  {
    action: "dataset:delete",
    resource: "dataset",
    context: { tenantId: "t-1", userId: "u-1", roles: ["analyst"] },
  },
  { dynamicRules: myOverrideRules }
);

// envelope.governance contains the immutable GovernanceVerdict
```

Run `npm test` in this package to execute the Vitest suite, including the
adversarial probes that assert no policy evaluation path can skip the
GovernanceVerdict.

## Backtesting Framework

The policy package now includes a comprehensive backtesting framework for validating
governance policies against historical activity. The `PolicyBacktestEngine` provides:

- Temporal snapshot queries (`getSnapshotAt`, `querySnapshots`) to inspect policy
  state at any point in time.
- Version comparison (`compareVersions`) that highlights added, removed, and changed
  rules between releases.
- Retroactive compliance checking (`retroactiveComplianceCheck`) to replay historical
  requests against their contemporaneous policy versions and flag violations.
- Impact analysis reporting, including effect counts, rule hit frequency, obligation
  utilisation, and per-version breakdowns for audit preparation.
- Rollback simulation (`simulateRollback`) to model the consequences of reverting to
  an earlier version before promoting changes.
- Audit trail generation (`getAuditTrail`) with filtering by policy, time range, and
  simulation type to preserve evidence for governance reviews.

### Getting Started

```ts
import { PolicyBacktestEngine, type PolicyHistory, type HistoricalPolicyEvent } from "policy";

const history: PolicyHistory[] = [
  {
    policyId: "governance",
    snapshots: [
      {
        policyId: "governance",
        version: "1.0.0",
        capturedAt: "2024-01-01T00:00:00Z",
        rules: [],
      },
      {
        policyId: "governance",
        version: "1.1.0",
        capturedAt: "2024-02-01T00:00:00Z",
        rules: [],
      },
    ],
  },
];

const events: HistoricalPolicyEvent[] = [
  {
    id: "evt-1",
    occurredAt: "2024-02-10T12:00:00Z",
    request: {
      /* policy evaluation input */
    },
  },
];

const engine = new PolicyBacktestEngine(history);
const compliance = engine.retroactiveComplianceCheck("governance", events);
const rollback = engine.simulateRollback("governance", "1.0.0", events);
const audit = engine.getAuditTrail({ policyId: "governance" });
```

Configure the engine with `{ missingSnapshotStrategy: 'skip' }` to skip events that
occur outside recorded history instead of throwing.

Run `npm test` from the package root to execute the Vitest suite and ensure the
backtesting features remain production-ready.

## Authority Schema

The `config/authority-schema.yaml` file documents a canonical policy schema for
authority definitions that combine inheritance, reusable role templates, and
attribute-based access control (ABAC) conditions. The schema includes:

- A principal, resource, and context attribute catalog to keep ABAC inputs
  explicit.
- Reusable role templates (`viewer`, `editor`, `maintainer`) with parameters,
  obligations, and CEL expressions for consistent guardrails.
- Authority definitions (e.g., `org-default`, `engineering`) that show how
  inheritance, template bindings, and ABAC controls compose to deliver
  environment-aware access decisions.

Use this schema as a reference when authoring new authorities or validating
existing policy documents.
