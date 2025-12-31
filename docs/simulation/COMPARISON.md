# Scenario Comparison & Decision Views

## 1. Comparing Scenarios

Users can run multiple scenarios with varying parameters (e.g., Load 1.5x vs 2.0x, Budget -10% vs -20%) and compare the results side-by-side.

### Comparison Metrics

*   **Risk Profile**: Which scenario has the highest likelihood of failure?
*   **Cost Efficiency**: Which scenario minimizes spend while maintaining uptime?
*   **Resilience**: Which scenario degrades gracefully under load?

### Visualization (Conceptual)

```
| Metric             | Baseline | Scenario A (1.5x Load) | Scenario B (2.0x Load) |
|--------------------|----------|------------------------|------------------------|
| Peak Utilization   | 65%      | 97%                    | 130% (Throttled)       |
| Est. Spend         | $500     | $750                   | $1000                  |
| Throttled Requests | 0        | 0                      | 450                    |
```

## 2. Decision Notes

When a strategic decision is made based on simulation data, it must be recorded.

*   **Rationale**: Why was this path chosen?
*   **Evidence**: Link to the specific `simulationId` that supported the decision.
*   **Assumptions**: What parameters were considered "truth" (e.g., "We assume traffic won't exceed 1.5x").

This creates a persistent audit trail linking *simulation* to *action*.
