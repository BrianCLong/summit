# Securiteyes Detection Engine

The detection engine operates on three layers:

1.  **Rule-Based Detectors**: Deterministic logic (e.g., "5 failed logins in 1 minute"). Defined in `DetectionEngine.ts`.
2.  **Statistical Detectors**: Anomaly detection based on baselines (e.g., Z-score of API usage).
3.  **Graph-Based Detectors**: Cypher queries identifying patterns in the graph (e.g., lateral movement, correlated indicators).

## Adding a New Rule

Register a new rule in `DetectionEngine.ts` via `registerRule`:

```typescript
detection.registerRule({
    id: 'NEW_RULE',
    description: 'Description',
    severity: 'medium',
    condition: (event, history) => { ... }
});
```

## Graph Detectors

Graph detectors are periodic jobs that run Cypher queries to find complex patterns.
