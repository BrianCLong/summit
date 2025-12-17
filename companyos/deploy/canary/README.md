# CompanyOS Canary Deployment Guide

> **Implements**: B3 - Canaryable CompanyOS Deployments
> **Last Updated**: 2024-12-08

## Overview

CompanyOS uses progressive delivery with canary deployments to safely roll out changes. This guide covers how to trigger, monitor, and manage canary releases.

## How Canary Works

1. **Initial Deploy**: New version deployed to ~10% of traffic
2. **Analysis**: Automated metrics analysis runs
3. **Progressive Rollout**: Traffic gradually increased (25% → 50% → 100%)
4. **Auto-Rollback**: Automatic rollback if metrics degrade

## Metrics Monitored

| Metric | Threshold | Description |
|--------|-----------|-------------|
| Error Rate | < 5% | HTTP 5xx responses |
| P95 Latency | < 300ms | 95th percentile response time |
| Latency Delta | < 1.2x | Canary vs stable latency ratio |
| Error Delta | < 1.5x | Canary vs stable error ratio |
| OPA Success | > 99% | Policy decision success rate |

## Triggering a Canary

### Via GitHub Actions

```yaml
# In your PR or release workflow
- name: Deploy Canary
  run: |
    kubectl argo rollouts set image companyos-api \
      companyos-api=companyos-api:${{ github.sha }}
```

### Via CLI

```bash
# Update the rollout with new image
kubectl argo rollouts set image companyos-api \
  companyos-api=companyos-api:v1.2.3

# Watch the rollout progress
kubectl argo rollouts get rollout companyos-api --watch
```

## Monitoring a Canary

### Dashboard

View the canary status in Argo Rollouts dashboard:
```
https://argorollouts.example.com/rollouts/companyos/companyos-api
```

### CLI

```bash
# Get current status
kubectl argo rollouts status companyos-api

# Get detailed info
kubectl argo rollouts get rollout companyos-api

# View analysis results
kubectl argo rollouts get analysisrun -l rollouts-pod-template-hash
```

### Metrics

Key Prometheus queries:

```promql
# Canary error rate
sum(rate(companyos_http_requests_total{status=~"5..",canary="true"}[5m]))
/
sum(rate(companyos_http_requests_total{canary="true"}[5m]))

# Canary latency
histogram_quantile(0.95,
  sum(rate(companyos_http_request_duration_seconds_bucket{canary="true"}[5m])) by (le)
)
```

## Manual Intervention

### Promote Canary Immediately

```bash
kubectl argo rollouts promote companyos-api
```

### Abort/Rollback

```bash
kubectl argo rollouts abort companyos-api
```

### Retry Failed Analysis

```bash
kubectl argo rollouts retry rollout companyos-api
```

## Rollout Phases

```
┌─────────────────────────────────────────────────────────────┐
│                    Canary Deployment Phases                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Phase 1 (10%)    Phase 2 (25%)    Phase 3 (50%)   Phase 4  │
│  ┌─────────┐      ┌─────────┐      ┌─────────┐    ┌──────┐ │
│  │ Canary  │ ──▶  │ Canary  │ ──▶  │ Canary  │ ──▶│ Full │ │
│  │  10%    │      │  25%    │      │  50%    │    │ 100% │ │
│  │         │      │         │      │         │    │      │ │
│  │Analysis │      │Analysis │      │Analysis │    │ Done │ │
│  └─────────┘      └─────────┘      └─────────┘    └──────┘ │
│                                                              │
│  Duration: 2min    Duration: 2min   Duration: 3min          │
│                                                              │
│  ❌ Failure at any point → Automatic Rollback               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Emergency Procedures

### Immediate Rollback

```bash
# Abort current rollout and rollback
kubectl argo rollouts abort companyos-api

# Or force rollback to previous revision
kubectl argo rollouts undo companyos-api
```

### Bypass Canary (Emergency Only)

```bash
# Skip all analysis and promote immediately
kubectl argo rollouts promote companyos-api --full
```

⚠️ **Warning**: Only use `--full` in emergencies. This bypasses all safety checks.

## Troubleshooting

### Canary Stuck

1. Check analysis results:
   ```bash
   kubectl get analysisrun -l rollouts-pod-template-hash
   ```

2. Check pod logs:
   ```bash
   kubectl logs -l app=companyos-api,rollouts-pod-template-hash=<hash>
   ```

3. Check metrics in Prometheus

### Analysis Failing

1. Check Prometheus connectivity
2. Verify metrics are being scraped
3. Check thresholds in `analysis-template.yaml`

### Rollback Not Working

1. Check previous ReplicaSet exists
2. Verify stable service is healthy
3. Check rollout history:
   ```bash
   kubectl argo rollouts history companyos-api
   ```

## Files

- `analysis-template.yaml` - Canary analysis metrics and thresholds
- `README.md` - This documentation

## See Also

- [Argo Rollouts Documentation](https://argoproj.github.io/argo-rollouts/)
- [CompanyOS SLO Dashboard](../observability/dashboards/companyos-slo.json)
- [Incident Response Runbook](../../RUNBOOKS/companyos-incident-response.md)
