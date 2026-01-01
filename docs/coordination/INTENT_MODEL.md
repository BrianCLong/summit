# Cross-Domain Intent Model

## 1. Intent Declaration

Each optimization loop must declare its intent using the standard schema.

### Fields

*   **id**: Unique identifier for the intent.
*   **domain**: The optimization domain (e.g., 'cost', 'performance').
*   **priority**: The priority class ('critical', 'high', 'normal', 'background').
*   **objective**: A human-readable description of the objective.
*   **protectedMetrics**: A list of metrics that this intent aims to protect.
*   **allowedTradeoffs**: A list of metrics that can be sacrificed.

## 2. Standardized Schema

```typescript
export interface Intent {
  id: string;
  domain: OptimizationDomain;
  priority: PriorityClass;
  objective: string;
  protectedMetrics: {
    metricName: string;
    threshold: number;
    operator: '<' | '>' | '<=' | '>=' | '=';
  }[];
  allowedTradeoffs: string[];
  timestamp: number;
}
```

## 3. Versioning

The intent schema is versioned. Current version: v1.0.
