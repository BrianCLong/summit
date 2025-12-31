# Advisory Hooks (Non-Binding)

The simulation engine can optionally provide *advisory* recommendations. These are strictly informational.

## 1. Principles

*   **No Automation**: Advisors never execute changes.
*   **Explainable**: Recommendations must explain *why* (e.g., "Utilization < 20%").
*   **Conservative**: Bias towards stability over optimization.

## 2. Examples

### Capacity Advisor
*   *Trigger*: Peak utilization in `CAPACITY_LOAD` scenario (1.5x) is still < 40%.
*   *Recommendation*: "Consider reducing quota for Tenant X to reclaim capacity."

### Budget Advisor
*   *Trigger*: `COST_BUDGET` scenario fails only due to a single spike.
*   *Recommendation*: "Consider smoothing burst limits instead of increasing total budget."

## 3. Implementation

Advisors are implemented as post-processing steps on `StrategicSimulationResult`.

```typescript
function analyzeResult(result: StrategicSimulationResult): Recommendation[] {
  if (result.metrics.peakUtilization < 0.2) {
    return [{ type: 'EFFICIENCY', message: 'Resources significantly underutilized.' }];
  }
  return [];
}
```
