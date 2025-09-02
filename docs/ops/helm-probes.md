# Helm Probes for Maestro MCP

Add these probes to your Deployment:

```yaml
livenessProbe:
  httpGet:
    path: /api/health
    port: 4000
  initialDelaySeconds: 20
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /api/ready
    port: 4000
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 2
  failureThreshold: 6
```

Notes
- `/api/health` returns 200 once the process is up.
- `/api/ready` returns 200 only after Postgres/Redis are reachable; returns 503 otherwise.
- Adjust timings for your environment; these defaults work for most clusters.

