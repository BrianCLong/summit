# Runbook: Raise Conductor Canary

## Preconditions
- Dashboards green: SLO burn < 1 over 6h; Queue oldest age < target for 80% queues.
- Alerts quiet: no `RouterInstantRegretHigh` in last 2h.

## Steps
1. Set router traffic weights:
   - 5% → 25% → 50% → 100% (hold 30m between steps).
   - Command:
     ```bash
     kubectl -n intelgraph annotate deploy/router \
       canary.percent=<PERCENT> --overwrite
     ```

2. Watch guard metrics (PromQL quickies):
   - Deny rate (gold):  
     `sum(rate(admission_decision_total{decision="deny",tier="gold"}[5m]))`
   - Degrade ratio (gold):  
     `sum(rate(admission_decision_total{decision="degrade",tier="gold"}[5m]))`
   - Instant regret (gold):  
     `max_over_time(conductor_router_instant_regret{tier="gold"}[5m])`

3. Rollback triggers (immediate):
   - Deny rate (gold) > **0.2/s** for 15m
   - Burn rate > **4** on 30m window
   - Queue oldest age > **60s** for 10m

4. Rollback:
   ```bash
   kubectl -n intelgraph annotate deploy/router canary.percent=0 --overwrite
   kubectl -n intelgraph rollout undo deploy/router
   ```

Post-mortem note: capture admission_decision_total by reason, top tenants impacted, any active overrides.
