# Docling Service Deploy Runbook

## Preconditions

- Argo Rollouts plugin installed locally (`kubectl argo rollouts`).
- Helm values updated with desired image tag and resource overrides.
- Canary dataset test suite (`npm run test -- docling`) green in CI.

## Steps

1. Render chart to verify manifests:
   ```bash
   helm template docling-svc services/docling-svc/helm/docling-svc -f values/platform.yaml
   ```
2. Deploy to staging:
   ```bash
   helm upgrade --install docling-svc services/docling-svc/helm/docling-svc \
     -n platform-ml-stg -f values/staging.yaml
   ```
3. Monitor rollout:
   ```bash
   kubectl argo rollouts get rollout docling-svc -n platform-ml-stg --watch
   ```
4. Validate health:
   ```bash
   kubectl port-forward svc/docling-svc -n platform-ml-stg 17100:7100 &
   curl -s localhost:17100/healthz
   curl -s localhost:17100/metrics | grep docling_inference
   ```
5. Execute smoke workflow:
   ```bash
   npm run test -- docling:smoke
   ```
6. Promote to production when staging SLOs pass:
   ```bash
   helm upgrade --install docling-svc services/docling-svc/helm/docling-svc \
     -n platform-ml -f values/production.yaml
   kubectl argo rollouts promote docling-svc -n platform-ml
   ```

## Post-Deploy

- Confirm Grafana dashboard `Docling Overview` shows p95 latency < thresholds.
- Verify provenance ledger entries via `SELECT * FROM provenance_ledger_v2 WHERE action_type='docling_summarize_build_failure' ORDER BY timestamp DESC LIMIT 5;`.
- Notify #release-docs channel with deployment summary.
