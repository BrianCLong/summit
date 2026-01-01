# Sample Recommendation Engine Integration

**Type**: Cost Optimization ML Model

## Manifest
```json
{
  "partnerId": "optim-ai",
  "tier": 2,
  "capabilities": ["recommendation.cost"],
  "claims": {
    "never": ["execute"]
  }
}
```

## Recommendation Format
```json
{
  "target": "cluster-1",
  "action": "resize",
  "params": { "size": "large" },
  "confidence": 0.92,
  "assumptions": ["cpu_load < 50%"],
  "counterfactual": "cost increases by 10% next month",
  "alternatives": [
    { "action": "shutdown", "confidence": 0.4 }
  ]
}
```
