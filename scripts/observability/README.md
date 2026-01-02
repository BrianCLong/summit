# Observability Scripts

This directory contains scripts for establishing and maintaining observability baselines for GA readiness.

## Scripts

### `measure-baseline.sh`

Collects baseline metrics for all services over a specified duration.

**Usage**:
```bash
./measure-baseline.sh --environment staging --duration 7d
```

**Options**:
- `--environment ENV` - Environment to measure (default: staging)
- `--duration DURATION` - Measurement duration (default: 7d)
- `--output-dir DIR` - Output directory (default: baselines)
- `--prometheus-url URL` - Prometheus URL (default: auto-detect)

**Output**:
- JSON file with baseline metrics in `baselines/` directory
- SLO compliance report

**Example**:
```bash
# Measure 7-day baseline in staging
./measure-baseline.sh --environment staging --duration 7d

# Measure 30-day baseline in production
./measure-baseline.sh --environment production --duration 30d
```

---

### Placeholder Scripts

The following scripts are referenced in documentation but need to be implemented:

#### `generate-alerts.sh`

Generate Prometheus alert rules from baseline measurements.

**TODO**: Implement alert generation logic

#### `generate-dashboards.sh`

Generate Grafana dashboards from baseline measurements.

**TODO**: Implement dashboard generation logic

#### `import-dashboards.sh`

Import Grafana dashboards via API.

**TODO**: Implement dashboard import logic

#### `test-alert.sh`

Simulate alert conditions for testing.

**TODO**: Implement alert testing logic

#### `compare-baselines.sh`

Compare multiple baseline measurements over time.

**TODO**: Implement baseline comparison logic

---

## Baseline Measurement Workflow

1. **Deploy Monitoring Stack** (if not already deployed)
   ```bash
   make deploy-monitoring ENVIRONMENT=staging
   ```

2. **Collect Baseline** (wait 7 days minimum)
   ```bash
   ./measure-baseline.sh --environment staging --duration 7d
   ```

3. **Review Results**
   ```bash
   cat baselines/staging-baseline-*.json | jq .
   ```

4. **Generate Alerts** (TODO - manual for now)
   - Edit `monitoring/prometheus/rules/slo-alerts.yml`
   - Set thresholds based on baseline measurements
   - Apply: `kubectl apply -f monitoring/prometheus/rules/slo-alerts.yml`

5. **Create Dashboards** (TODO - manual for now)
   - Import templates from `monitoring/grafana-dashboards/`
   - Customize with baseline values
   - Import to Grafana via UI or API

6. **Monitor & Iterate**
   - Review SLI/SLO performance weekly
   - Adjust thresholds quarterly
   - Re-establish baselines every 6 months

---

## Requirements

**System**:
- bash 4.0+
- curl
- jq
- bc (for calculations)

**Infrastructure**:
- Prometheus running and accessible
- Metrics exporters deployed (node-exporter, postgres-exporter, redis-exporter)
- Services instrumented with Prometheus metrics

**Environment Variables** (optional):
```bash
export PROMETHEUS_URL="http://prometheus.staging.summit.internal:9090"
export GRAFANA_URL="https://grafana.staging.summit.internal"
export GRAFANA_API_KEY="your-api-key"
```

---

## Metrics Collected

### API Server
- Error rate (%)
- Latency P50, P95, P99 (ms)
- Throughput (requests/second)

### Database (PostgreSQL)
- Query latency P95 (ms)
- Connection pool utilization (%)
- Replication lag (seconds)

### Redis Cache
- Cache hit ratio (%)
- Memory usage (%)

### Future Additions
- Neo4j graph database metrics
- Authentication service metrics
- Business metrics (active users, API usage)

---

## Troubleshooting

### "Cannot reach Prometheus"

**Problem**: Script cannot connect to Prometheus

**Solution**:
```bash
# Check Prometheus is running
kubectl get pods -n monitoring -l app=prometheus

# Check Prometheus is healthy
kubectl port-forward -n monitoring svc/prometheus 9090:9090
curl http://localhost:9090/-/healthy

# Set correct URL
./measure-baseline.sh --prometheus-url http://localhost:9090
```

### "No data available" for metrics

**Problem**: Prometheus has no data for the query

**Solution**:
```bash
# Check if services are instrumented
curl http://your-service:9090/metrics

# Check Prometheus targets
kubectl port-forward -n monitoring svc/prometheus 9090:9090
open http://localhost:9090/targets

# Ensure exporters are configured
kubectl get cm -n monitoring prometheus-config -o yaml
```

### Permission denied when running script

**Problem**: Script is not executable

**Solution**:
```bash
chmod +x measure-baseline.sh
```

---

## Future Enhancements

- [ ] Implement `generate-alerts.sh` from baseline measurements
- [ ] Implement `generate-dashboards.sh` with Grafana templates
- [ ] Implement `compare-baselines.sh` for trend analysis
- [ ] Add support for custom metrics
- [ ] Add support for multiple Prometheus instances
- [ ] Integrate with CI/CD for automated baseline tracking
- [ ] Add anomaly detection using historical baselines
- [ ] Create visualization of baseline trends over time

---

**Last Updated**: 2026-01-02
**Owner**: Platform Engineering + SRE Team
