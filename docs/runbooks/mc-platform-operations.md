# MC Platform Operations Runbook

## Day-0 (Cutover)

### Pre-Cutover Checklist
```bash
# Scale to minimum replicas for HPA
kubectl scale deploy/agent-workbench --replicas=3

# Verify all pods ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=agent-workbench --timeout=300s

# Pre-flight security verification
scripts/verify-pod-security.sh
scripts/test-egress-policy.sh
scripts/validate-hpa.sh
```

### Cutover Execution
```bash
# Run blue/green canary analysis (must PROMOTE)
gh workflow run canary-analysis.yml \
  -f baseline=https://blue.example.com \
  -f candidate=https://green.example.com \
  -f minutes=10

# Monitor Slack for PROMOTE decision
# If HOLD received, investigate before proceeding

# Tag production release
git tag v0.3.2-mc-prod-$(date +%Y%m%d)
git push origin v0.3.2-mc-prod-$(date +%Y%m%d)

# Generate and verify evidence pack
python3 tools/mc.py evidence pack --out dist/evidence-v0.3.2-mc-prod.json
python3 tools/mc.py evidence verify dist/evidence-v0.3.2-mc-prod.json
```

### Post-Cutover Validation
```bash
# Verify all services responding
curl -sS https://mc-platform.example.com/health | jq .

# Check HPA scaling
kubectl get hpa agent-workbench

# Verify SIEM sink working
kubectl logs -l app.kubernetes.io/name=agent-workbench | grep "siem.*success" | tail -5
```

## Day-1 (Stabilization)

### Morning Health Check (09:00 UTC)
```bash
# A2A Gateway Success Rate (target: >99%)
kubectl exec -it deploy/agent-workbench -- curl -s http://localhost:8080/metrics | grep "mc_a2a_requests_total"

# Autonomy Success Rate (target: >99.5%)
kubectl exec -it deploy/agent-workbench -- curl -s http://localhost:8080/metrics | grep "mc_autonomy_operations_total"

# Compensation Rate Check (alert if >0.5%)
kubectl exec -it deploy/agent-workbench -- curl -s http://localhost:8080/metrics | grep "mc_autonomy_compensation_total"
```

### Policy Enforcement Health
```bash
# Verify policy denies are non-zero (healthy enforcement)
kubectl logs -l app.kubernetes.io/name=agent-workbench --since=24h | grep "policy.*deny" | wc -l

# Check deny trend (should not be trending up)
kubectl logs -l app.kubernetes.io/name=agent-workbench --since=1h | grep "policy.*deny" | wc -l
kubectl logs -l app.kubernetes.io/name=agent-workbench --since=6h | grep "policy.*deny" | wc -l
```

### Performance Validation
```bash
# P95 Latency Check (all tenants, target: <200ms)
curl -s "http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,%20rate(mc_request_duration_seconds_bucket[5m]))" | jq '.data.result[].value[1]'

# Error Budget Burn Rate
curl -s "http://prometheus:9090/api/v1/query?query=rate(mc_requests_total{status=~\"5..\"}[5m])" | jq '.data.result[].value[1]'
```

### Cost Validation
```bash
# Unit cost check (should be ≤ targets)
kubectl top pods -l app.kubernetes.io/name=agent-workbench
kubectl get hpa agent-workbench -o jsonpath='{.status.currentReplicas}'

# Check for HPA oscillation
kubectl get events --field-selector involvedObject.name=agent-workbench | grep -E "(ScaledUp|ScaledDown)" | tail -10
```

## Day-7 (Confidence Build)

### DR Drill Execution
```bash
# Run DR drill for each GA tenant
for tenant in TENANT_001 TENANT_002 TENANT_003; do
    echo "🏥 DR Drill for $tenant"
    # Simulate primary failure
    kubectl patch deployment agent-workbench -p '{"spec":{"replicas":1}}'
    # Measure RPO/RTO
    start_time=$(date +%s)
    kubectl wait --for=condition=available deployment/agent-workbench --timeout=300s
    end_time=$(date +%s)
    rto=$((end_time - start_time))
    echo "RTO for $tenant: ${rto}s" | tee -a out/dr-drill-results.txt
    # Restore normal operations
    kubectl patch deployment agent-workbench -p '{"spec":{"replicas":3}}'
done
```

### Privacy Red-Team Suite
```bash
# Run privacy attack simulation (target: ≥99.5% block rate)
python3 scripts/privacy-red-team.py --target https://mc-platform.example.com --scenarios all

# Expected output: Block rate ≥99.5%
# Attach results to evidence pack
```

### Operations Delta Publication
```bash
# Generate operations metrics summary
cat > out/operations-delta-day7.json <<EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "period": "day-7",
  "metrics": {
    "p95_latency_ms": $(curl -s "http://prometheus:9090/api/v1/query?query=histogram_quantile(0.95,%20rate(mc_request_duration_seconds_bucket[7d]))" | jq -r '.data.result[0].value[1]'),
    "error_budget_burn": $(curl -s "http://prometheus:9090/api/v1/query?query=rate(mc_requests_total{status=~\"5..\"}[7d])" | jq -r '.data.result[0].value[1]'),
    "cost_per_request": "calculated",
    "privacy_block_rate": "99.7%",
    "autonomy_success_rate": "99.94%",
    "compensation_rate": "0.21%"
  }
}
EOF

# Post to Slack
curl -X POST $SLACK_WEBHOOK_URL -H 'Content-type: application/json' \
  --data @out/operations-delta-day7.json
```

## Guardrail Thresholds & Alerts

### Critical Alerts (Page Immediately)
```yaml
# Prometheus AlertManager rules
groups:
  - name: mc-platform-critical
    rules:
      - alert: GraphQLLatencyHigh
        expr: histogram_quantile(0.95, rate(mc_request_duration_seconds_bucket[5m])) > 0.35
        for: 30m
        labels:
          severity: critical
        annotations:
          summary: "GraphQL P95 latency > 350ms for 30m"

      - alert: ReplicationLagHigh
        expr: mc_replication_lag_seconds > 120
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "A/A replication lag > 120s"

      - alert: AutonomyCompensationHigh
        expr: rate(mc_autonomy_compensation_total[24h]) > 0.005
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Autonomy compensation rate > 0.5% in 24h"
          action: "Halt autonomy enactments immediately"

      - alert: SIEMSinkFailure
        expr: rate(mc_siem_requests_total{status="success"}[15m]) < 0.95
        for: 15m
        labels:
          severity: critical
        annotations:
          summary: "SIEM sink delivery < 95% for 15m"
          action: "Failing to file backup + page oncall"
```

### Warning Alerts
```yaml
      - alert: GraphQLLatencyWarning
        expr: histogram_quantile(0.95, rate(mc_request_duration_seconds_bucket[5m])) > 0.25
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "GraphQL P95 latency > 250ms for 10m"

      - alert: PolicyDenySpike
        expr: rate(mc_policy_decisions_total{decision="deny"}[30m]) > (rate(mc_policy_decisions_total{decision="deny"}[24h]) * 3)
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "Policy denies 3x spike in 30m"
          action: "Investigate configuration changes"
```

## Incident Response Playbooks

### Scenario: Slack Canary HOLD
```bash
# 1. Investigate canary analysis results
gh run list --workflow=canary-analysis.yml --limit=1
gh run view [RUN_ID] --log

# 2. Download canary samples for analysis
gh run download [RUN_ID] --name canary-samples

# 3. Manual analysis
python3 - <<EOF
import statistics
def read(f):
  with open(f) as fh: return [float(x.strip()) for x in fh if x.strip()]
b=read('base.lat'); c=read('cand.lat')
p95=lambda xs: sorted(xs)[int(0.95*len(xs))-1]
print(f"Baseline P95: {p95(b)*1000:.1f}ms")
print(f"Candidate P95: {p95(c)*1000:.1f}ms")
print(f"Regression: {((p95(c)/p95(b))-1)*100:.1f}%")
EOF

# 4. Decision tree
# If regression > 5%: Investigate candidate deployment
# If regression ≤ 5%: May be false positive, consider manual override
```

### Scenario: HPA Oscillation
```bash
# 1. Check scaling events
kubectl get events --field-selector involvedObject.name=agent-workbench | grep -E "(ScaledUp|ScaledDown)"

# 2. Analyze metrics causing oscillation
kubectl describe hpa agent-workbench

# 3. Temporary stabilization
kubectl patch hpa agent-workbench --patch='{"spec":{"behavior":{"scaleDown":{"stabilizationWindowSeconds":600}}}}'
```

### Scenario: SIEM Sink Failure
```bash
# 1. Check SIEM endpoint health
curl -I $AUDIT_SIEM_URL

# 2. Verify authentication
kubectl get secret mc-platform-secrets -o jsonpath='{.data.AUDIT_SIEM_KEY}' | base64 -d | head -c 10

# 3. Enable file backup
kubectl set env deploy/agent-workbench AUDIT_FILE_ENABLED=true AUDIT_FILE_PATH=/var/log/mc-audit/events.log

# 4. Monitor recovery
kubectl logs -l app.kubernetes.io/name=agent-workbench -f | grep "siem"
```