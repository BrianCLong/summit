# Coordination Evidence Schema

Evidence ID: `EVD-HBR-AI-COORD-001`

This schema defines the minimum event contract required to represent cross-team coordination outcomes in Summit.

## CoordinationEvent

```ts
interface CoordinationEvent {
  id: string;
  actors: string[];
  dependencyIds: string[];
  decisionLatencyMs: number;
  resolved: boolean;
  createdAt: string; // ISO8601
  updatedAt?: string; // ISO8601
  severity?: "low" | "medium" | "high" | "critical";
  evidenceId: "EVD-HBR-AI-COORD-001" | "EVD-HBR-AI-COORD-002" | "EVD-HBR-AI-COORD-003";
  metadata?: Record<string, unknown>;
}
```

## Validation Requirements

- Events MUST include actor attribution (`actors.length >= 1`).
- `decisionLatencyMs` MUST be non-negative and evaluated against an SLA threshold.
- Unresolved events MUST enforce `maxUnresolvedDependencies` SLA.
- Evidence IDs MUST map to a registered evidence bundle under `evidence/`.

## KPI Bindings

- `decisionLatencyMs` → Decision latency delta.
- `dependencyIds.length` → Dependency churn rate.
- `actors.length` → Handoff count reduction.
- Distinct actor pair links → Cross-team graph density.
