# IntelGraph Platform SRE Runbook

## Purpose

This runbook guides on-call engineers through diagnosing and resolving SLO, cost, and telemetry regressions surfaced by the platform SRE pipeline, Grafana dashboards, and Prometheus burn alerts.

## Quick Decision Tree

1. **Pager triggers?**
   - PagerDuty `sre-primary` or Slack `#oncall-bridge` alerts indicate automated rollback already executed.
   - Confirm latest pipeline run in GitHub Actions (`platform-sre-pipeline`).
2. **SLO impacted?**
   - API availability <99.9% → follow [API Availability](#api-availability-incident).
   - Ingest success <99.5% → follow [Ingest Recovery](#ingest-recovery).
   - Cost spend ≥80% budget → follow [FinOps Guardrail](#finops-guardrail).
3. **Telemetry gaps?**
   - If dashboards stale, validate OpenTelemetry collector status ([Telemetry Collector](#telemetry-collector)).

---

## API Availability Incident

**Symptoms**: `APIErrorBudgetFastBurn` or `APIErrorBudgetSlowBurn` alerts, Grafana API panel <99.9%, CI rollback triggered.

**Immediate Actions**:

1. Freeze deploys: place `/canary-hold` comment on the triggering PR.
2. Validate rollback: `kubectl argo rollouts get rollout intelgraph -n platform-canary` should show previous stable version promoted.
3. Inspect error distribution:
   ```bash
   kubectl logs deploy/api -n platform-prod --since=15m | rg "5\\d{2}" | head
   ```
4. Trace sample failure with Tempo:
   ```bash
   tctl trace --service intelgraph-api --status error --limit 5
   ```

**Mitigation Options**:

- **Configuration regressions**: compare ConfigMap diff `kubectl get cm api-config -n platform-prod -o yaml`.
- **Upstream dependency** (DB): see [Database Latency](#database-latency).
- **Traffic spike**: throttle via feature flag `ops/rollout --service api --flag adaptive-concurrency --percent 50`.

**Exit Criteria**: API availability ≥99.92% for 30 minutes and error budget burn <1× on 1h window. Document postmortem in the incident tracker.

## Ingest Recovery

**Symptoms**: `IngestErrorBudgetFastBurn`/`SlowBurn`, backlog metrics trending up, API unaffected.

**Immediate Actions**:

1. Inspect queue depth:
   ```bash
   kubectl exec deploy/ingest-worker -n platform-prod -- bin/check-queue-depth
   ```
2. Validate Kafka brokers healthy:
   ```bash
   kafka-topics --bootstrap-server kafka.platform:9092 --describe --topic intelgraph.ingest
   ```
3. Compare processing rate vs arrival:
   ```bash
   promql "sum(rate(ingest_success_total[5m]))" "sum(rate(ingest_attempts_total[5m]))"
   ```

**Mitigation Options**:

- Scale workers: `kubectl scale deploy/ingest-worker -n platform-prod --replicas=12`.
- Reroute canary data: enable `ops/rollout --service ingest --flag drop-noncritical --percent 100` for low-priority tenants.
- Rewind last offset if poison pill message detected using runbook `ops/runbooks/rollback.md`.

**Exit Criteria**: Ingest success ratio ≥99.6% over 1h, backlog <5k messages for 30 minutes.

## Database Latency

**Symptoms**: Grafana database panel >200ms p95, API latency warnings.

**Actions**:

1. Query Aurora performance insights for heavy SQL:
   ```bash
   aws pi describe-dimension-keys --service-type RDS --identifier ${AURORA_DB_ARN} \
     --start-time $(date -u -d '-15 min' +%s) --end-time $(date -u +%s) \
     --metric query/execTime --group-by Dimension=statement
   ```
2. Check connection saturation: `kubectl top pod -n platform-prod | rg api-db-proxy`.
3. Fallback: route read traffic to replicas via feature flag `read-replica-drain`.

**Exit Criteria**: Aurora p95 <150ms for 30 minutes, Redis p95 <10ms.

## Telemetry Collector

**Symptoms**: Grafana panels stale, OTLP exporters failing, `otel-collector` pods restarting.

**Diagnosis**:

1. Validate health endpoint:
   ```bash
   kubectl port-forward svc/otel-collector -n monitoring 13133:13133
   curl -s localhost:13133/healthz
   ```
2. Check pipeline configuration: ensure `DEPLOYMENT_ENVIRONMENT` env var set on collector Deployment.
3. Confirm exporters reachable: `nc -z tempo.monitoring 4317` and `nc -z elasticsearch.monitoring 9200`.

**Mitigation**:

- Restart collector after config changes: `kubectl rollout restart deploy/otel-collector -n monitoring`.
- If Prometheus scrape failing, run `kubectl logs deploy/otel-collector -n monitoring | rg scrape_configs` for errors.

**Exit Criteria**: Collector ready, metrics exporting to Prometheus and ELK within 5 minutes.

## FinOps Guardrail

**Symptoms**: `PlatformCostGuardrailWarning/Critical`, monthly spend >80% budget, pipeline blocked at cost gate.

**Actions**:

1. Confirm cost dataset freshness:
   ```bash
   python ops/observability-ci/scripts/check_cloud_costs.py \
     --budget-config ops/observability/cost-budget.yaml --threshold 0.8 --environment production
   ```
2. Identify cost drivers:
   ```bash
   aws ce get-cost-and-usage --time-period Start=$(date -d '-2 days' +%F),End=$(date +%F) \
     --granularity DAILY --metrics UnblendedCost \
     --group-by Type=TAG,Key=workload
   ```
3. Coordinate with feature owners to disable high-cost flags (see `ops/rollout`).
4. If anomaly, sync with Finance via `#finops-war-room` and annotate runbook.

**Exit Criteria**: Spend ratio <0.75 sustained for 24h or Finance approves temporary overage documented in Jira.

---

## Post-Incident Checklist

- [ ] Update Grafana dashboard annotations with incident window.
- [ ] Attach Prometheus queries and remediation steps to incident ticket.
- [ ] Submit timeline to weekly SRE review.
- [ ] File follow-up issues for automation gaps identified.
