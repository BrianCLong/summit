# Canary Deployment Strategy

**Tooling:** Argo Rollouts (or Flagger)

## Configuration

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: intelgraph-server
spec:
  strategy:
    canary:
      steps:
        - setWeight: 5
        - pause: { duration: 10m }
        - analysis:
            templates:
              - templateName: success-rate
              - templateName: latency-check
        - setWeight: 20
        - pause: { duration: 30m }
        - setWeight: 50
        - pause: { duration: 1h }
        - setWeight: 100
```

## Rollback Triggers

- Error Rate > 1%
- P95 Latency > 500ms
- Health Check failures
