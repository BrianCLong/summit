# Deploy Profiles

## Staging
```bash
helm upgrade --install agent-workbench charts/agent-workbench -f charts/agent-workbench/values.yaml \
  --set image.tag=$(git rev-parse --short HEAD)
```

## Production
```bash
helm upgrade --install agent-workbench charts/agent-workbench -f charts/agent-workbench/values-prod.yaml \
  --set image.tag=$(git describe --tags --abbrev=0)
```

## Advanced Ops Pack (Production + Custom Metrics + SIEM)
```bash
# Full advanced ops deployment
./scripts/enable-advanced-ops.sh https://siem.example.com/ingest $SIEM_TOKEN

# Or step-by-step:
# 1. Prometheus Adapter for custom metrics
helm upgrade --install prom-adapter prometheus-community/prometheus-adapter \
  -f deploy/custom-metrics/prom-adapter-values.yaml

# 2. Deploy with advanced HPA + NetworkPolicy + ServiceMonitor
helm upgrade --install agent-workbench charts/agent-workbench \
  -f charts/agent-workbench/values-prod.yaml \
  --set autoscaling.enabled=true \
  --set serviceMonitor.enabled=true \
  --set networkPolicy.enabled=true

# 3. Wire SIEM sink for audit
kubectl set env deploy/agent-workbench \
  AUDIT_SIEM_URL=https://siem.example.com/ingest \
  AUDIT_SIEM_KEY=$SIEM_TOKEN \
  AUDIT_SIEM_ENABLED=true

# 4. Run canary analysis
gh workflow run canary-analysis.yml \
  -f baseline=https://blue.example.com \
  -f candidate=https://green.example.com \
  -f minutes=10
```

## Governance Transition
```bash
# Swap from mock to governed endpoint
./scripts/swap-a2a.sh https://agent.example.com
make all

# Verify governed service integration
curl -X POST https://agent.example.com/a2a/perform \
  -H 'Content-Type: application/json' \
  -d '{"tenantId":"TENANT_001","purpose":"investigation","residency":"US","pqid":"pq.getPersonById","agent":"code-refactor","task":{"repo":"svc-api","goal":"add pagination"}}' | jq .
```

## Monitoring & Validation
```bash
# Monitor HPA scaling
kubectl get hpa agent-workbench -w

# Check custom metrics
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/default/pods/*/mc_platform_requests_per_second"

# Verify SIEM integration
kubectl logs deploy/agent-workbench | grep "siem"

# NetworkPolicy validation
kubectl describe networkpolicy agent-workbench
```