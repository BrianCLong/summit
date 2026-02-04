# DAAO Standards

## Difficulty Signal

The difficulty signal is a standardized JSON object emitted by the Difficulty Estimator.

```json
{
  "score": 0.0-1.0,
  "band": "easy" | "medium" | "hard",
  "domain": "coding" | "math" | "writing" | "general",
  "recommendedDepth": 1-3,
  "reasons": ["..."]
}
```

## Routing Decision

The routing decision is deterministic given the same inputs and catalog.

```json
{
  "modelId": "provider/model-name",
  "estimatedCost": 0.001,
  "reason": "Budget constrained"
}
```

## Validation Protocol

For tasks with `band: medium` or `band: hard`, a critique-refine loop is triggered unless the initial response score is very high (>0.95).
The critique must be structured JSON.
