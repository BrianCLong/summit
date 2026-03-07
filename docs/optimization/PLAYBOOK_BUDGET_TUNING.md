# Optimization Playbook: Budget Tuning

**Target Metrics:** `cost_hourly`, `cost_storage_eff`
**Risk Profile:** High (OOM, Throttling)

## 1. When to Apply

- Service CPU/Memory utilization is consistently low (< 30%).
- Hourly cost is exceeding budget.
- Over-provisioned replicas.

## 2. Implementation Steps

1.  **Analyze Utilization**: Check `container_cpu_usage_seconds_total` and `container_memory_working_set_bytes`.
2.  **Right-Size Requests/Limits**:
    - Set `requests` to P50 usage.
    - Set `limits` to P99 usage + buffer (e.g., 20%).
3.  **HPA Tuning**: Adjust `minReplicas` and target utilization (e.g., increase target from 50% to 70%).

## 3. Guardrails (MUST PASS)

- [ ] **Headroom**: Ensure at least 30% memory buffer for spikes.
- [ ] **Startup Time**: Reducing CPU must not make startup time > `readinessProbe` timeout.
- [ ] **Availability**: `minReplicas` must never be < 2 for HA services.

## 4. Rollback

- Reapply previous Kubernetes manifest with higher limits.
