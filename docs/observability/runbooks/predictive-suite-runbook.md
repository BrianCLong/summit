# Predictive Threat Suite - Monitoring Runbook

This runbook provides operational guidance for monitoring, troubleshooting, and maintaining the Predictive Threat Suite.

## Table of Contents

1. [Service Overview](#service-overview)
2. [Monitoring](#monitoring)
3. [Common Alerts](#common-alerts)
4. [Troubleshooting](#troubleshooting)
5. [Performance Tuning](#performance-tuning)
6. [Maintenance](#maintenance)

---

## Service Overview

### Architecture

```
┌─────────────────────────┐
│  Predictive Suite API   │  Port 8091
│  (FastAPI + Uvicorn)    │
├─────────────────────────┤
│  - Forecasting Service  │
│  - Simulation Service   │
│  - Metrics Aggregator   │
└────────┬────────────────┘
         │
         v
┌─────────────────────────┐      ┌──────────────┐
│      Prometheus         │─────→│   Grafana    │
│      Port 9090          │      │  Port 3001   │
└─────────────────────────┘      └──────────────┘
```

### Key Endpoints

- **Health**: `GET /health`
- **Metrics**: `GET /metrics`
- **Forecast**: `POST /api/forecast`
- **Simulate**: `POST /api/simulate`
- **API Docs**: `GET /docs`

### Dependencies

- Python 3.11+
- NumPy, SciPy (computational)
- FastAPI, Uvicorn (API)
- prometheus-client (metrics)
- Prometheus (scraping)
- Grafana (visualization)

---

## Monitoring

### Key Metrics to Watch

#### 1. Service Availability

```promql
# Service up/down
up{job="predictive-suite"}

# Success rate (should be > 99%)
1 - (
  rate(predictive_http_requests_total{status=~"5.."}[5m])
  /
  rate(predictive_http_requests_total[5m])
)
```

**Target SLO**: > 99.0% success rate

#### 2. Latency

```promql
# P95 latency (should be < 500ms)
histogram_quantile(0.95,
  rate(predictive_http_request_duration_seconds_bucket[5m])
) * 1000

# Forecast generation latency
histogram_quantile(0.95,
  rate(predictive_forecast_generation_duration_seconds_bucket[5m])
)
```

**Target SLO**: P95 < 500ms

#### 3. Throughput

```promql
# Requests per second
rate(predictive_http_requests_total[5m])

# Forecasts per second
rate(predictive_forecast_generation_total{status="success"}[5m])
```

**Normal Range**: 10-100 req/s

#### 4. Error Rate

```promql
# Overall error rate
rate(predictive_http_requests_total{status=~"5.."}[5m])
/
rate(predictive_http_requests_total[5m])

# Forecast errors
rate(predictive_forecast_generation_total{status="error"}[5m])
```

**Target**: < 1% error rate

#### 5. Forecast Accuracy

```promql
# MAPE (should be < 20%)
predictive_forecast_accuracy_mape

# Average accuracy by signal type
avg(predictive_forecast_accuracy_mape) by (signal_type)
```

**Target**: MAPE < 20%

#### 6. Resource Usage

```promql
# Memory usage
process_resident_memory_bytes{job="predictive-suite"}

# CPU usage
rate(process_cpu_seconds_total{job="predictive-suite"}[5m])
```

**Limits**: Memory < 1GB, CPU < 80%

---

## Common Alerts

### Alert: PredictiveSuiteDown

**Severity**: Critical

**Trigger**: Service is unreachable for > 2 minutes

**Investigation Steps**:

1. Check service status:
   ```bash
   # Docker Compose
   docker-compose ps predictive-forecasting

   # Kubernetes
   kubectl get pods -n predictive-suite -l app=predictive-forecasting
   ```

2. Check logs:
   ```bash
   # Docker Compose
   docker-compose logs --tail=100 predictive-forecasting

   # Kubernetes
   kubectl logs -n predictive-suite deployment/predictive-forecasting --tail=100
   ```

3. Check resource usage:
   ```bash
   # Docker
   docker stats predictive-forecasting

   # Kubernetes
   kubectl top pod -n predictive-suite -l app=predictive-forecasting
   ```

**Resolution**:

- If crashed: Restart the service
  ```bash
  docker-compose restart predictive-forecasting
  # or
  kubectl rollout restart deployment/predictive-forecasting -n predictive-suite
  ```

- If OOM: Increase memory limits
- If port conflict: Check for port conflicts on 8091

**Escalation**: If service doesn't recover after restart, escalate to on-call engineer

---

### Alert: PredictiveSuiteDegraded

**Severity**: Warning

**Trigger**: Error rate > 5% for 5 minutes

**Investigation Steps**:

1. Check error types in logs:
   ```bash
   docker-compose logs predictive-forecasting | grep ERROR | tail -50
   ```

2. Check recent forecast failures:
   ```promql
   rate(predictive_forecast_generation_total{status="error"}[5m]) by (signal_type, model_type)
   ```

3. Check for resource constraints:
   ```promql
   process_resident_memory_bytes{job="predictive-suite"}
   rate(process_cpu_seconds_total{job="predictive-suite"}[5m])
   ```

**Common Causes**:

- **Invalid input data**: Check for malformed requests
- **Model failures**: Specific model_type may be failing
- **Resource exhaustion**: Memory or CPU limits reached
- **Downstream dependencies**: Check Prometheus/Grafana connectivity

**Resolution**:

- Review and fix invalid input data
- Disable problematic model temporarily if needed
- Scale up resources if constrained
- Check network connectivity to dependencies

---

### Alert: PredictiveSuiteHighLatency

**Severity**: Warning

**Trigger**: P95 latency > 1s for 10 minutes

**Investigation Steps**:

1. Identify slow endpoints:
   ```promql
   histogram_quantile(0.95,
     rate(predictive_http_request_duration_seconds_bucket[5m])
   ) by (endpoint)
   ```

2. Check forecast generation times:
   ```promql
   histogram_quantile(0.95,
     rate(predictive_forecast_generation_duration_seconds_bucket[5m])
   ) by (model_type, signal_type)
   ```

3. Check for large data sizes:
   - Review recent requests in logs
   - Look for unusually large historical_data arrays

**Common Causes**:

- **Large input datasets**: historical_data arrays > 1000 points
- **Complex models**: ARIMA with high p, d, q values
- **Resource contention**: High CPU usage
- **Cold start**: First requests after deployment

**Resolution**:

- Implement request size limits (already in config.yaml)
- Enable caching for repeated requests
- Scale horizontally (add more replicas)
- Optimize model parameters

---

### Alert: ForecastAccuracyDegraded

**Severity**: Warning

**Trigger**: MAPE > 20% for 1 hour

**Investigation Steps**:

1. Check which entities/signals are degraded:
   ```promql
   predictive_forecast_accuracy_mape > 20
   ```

2. Review recent forecasts for the affected entity:
   ```promql
   predictive_forecast_value{entity_id="<affected_entity>"}
   ```

3. Check for data quality issues:
   - Missing data points
   - Outliers in historical data
   - Sudden distribution shifts

**Common Causes**:

- **Data quality issues**: Missing values, outliers
- **Distribution shift**: Pattern changed (e.g., traffic spike)
- **Model staleness**: Model hasn't been retrained
- **Wrong model selection**: ARIMA vs Exponential Smoothing

**Resolution**:

- Investigate data quality for affected entity
- Consider switching forecast model
- If persistent, retrain model with recent data
- Temporarily disable forecasting for affected entity if critical

---

### Alert: HighBaselineRiskDetected

**Severity**: High

**Trigger**: Baseline risk score > 0.8 for 5 minutes

**Investigation Steps**:

1. Identify high-risk entities:
   ```promql
   predictive_simulation_risk_score{scenario_type="baseline"} > 0.8
   ```

2. Check recommended interventions:
   ```promql
   predictive_simulation_recommendation_priority{entity_id="<entity>"}
   ```

3. Review current state metrics:
   - Error rate
   - Latency p95
   - Resource utilization

**Action Required**:

1. Review simulation recommendation in Grafana dashboard
2. Assess feasibility of recommended intervention
3. Execute intervention if appropriate:
   - deploy_patch
   - rate_limit
   - circuit_breaker
   - rollback
4. Monitor impact post-intervention

**Escalation**: If risk remains high after intervention, escalate to security team

---

## Troubleshooting

### Issue: Service Won't Start

**Symptoms**:
- Container exits immediately
- "Address already in use" errors
- Import errors in logs

**Diagnosis**:

```bash
# Check logs
docker-compose logs predictive-forecasting

# Check port availability
netstat -an | grep 8091

# Check Python environment
docker-compose exec predictive-forecasting python --version
docker-compose exec predictive-forecasting pip list
```

**Solutions**:

1. **Port conflict**:
   ```bash
   # Kill process using port 8091
   lsof -ti:8091 | xargs kill -9

   # Or change port in docker-compose.yml
   ports:
     - "8092:8091"
   ```

2. **Missing dependencies**:
   ```bash
   # Rebuild image
   docker-compose build --no-cache predictive-forecasting
   docker-compose up -d predictive-forecasting
   ```

3. **Configuration error**:
   - Check config.yaml syntax
   - Validate environment variables

---

### Issue: High Memory Usage

**Symptoms**:
- Memory > 1GB
- OOMKilled in Kubernetes
- Slow responses

**Diagnosis**:

```promql
# Check memory trend
process_resident_memory_bytes{job="predictive-suite"}

# Check request rate
rate(predictive_http_requests_total[5m])
```

**Solutions**:

1. **Increase memory limit**:
   ```yaml
   # docker-compose.yml
   services:
     predictive-forecasting:
       mem_limit: 2g

   # Kubernetes
   resources:
     limits:
       memory: 2Gi
   ```

2. **Enable caching** (in config.yaml):
   ```yaml
   forecasting:
     cache_enabled: true
     cache_ttl_seconds: 900
   ```

3. **Reduce data retention**:
   ```yaml
   metrics:
     retention:
       forecast_values_count: 50  # Reduce from 100
   ```

4. **Scale horizontally**:
   ```bash
   # Docker Compose
   docker-compose up -d --scale predictive-forecasting=3

   # Kubernetes
   kubectl scale deployment predictive-forecasting --replicas=3 -n predictive-suite
   ```

---

### Issue: Prometheus Not Scraping Metrics

**Symptoms**:
- No data in Grafana dashboards
- Targets show as "down" in Prometheus

**Diagnosis**:

1. Check Prometheus targets:
   - Open http://localhost:9090/targets
   - Look for "predictive-suite" job

2. Test metrics endpoint directly:
   ```bash
   curl http://localhost:8091/metrics
   ```

3. Check network connectivity:
   ```bash
   # From Prometheus container
   docker-compose exec prometheus wget -O- http://predictive-forecasting:8091/metrics
   ```

**Solutions**:

1. **Update Prometheus config**:
   ```yaml
   # prometheus.yml
   scrape_configs:
     - job_name: 'predictive-suite'
       static_configs:
         - targets: ['predictive-forecasting:8091']
       metrics_path: '/metrics'
   ```

2. **Reload Prometheus**:
   ```bash
   docker-compose restart prometheus
   # or send SIGHUP
   docker-compose kill -s SIGHUP prometheus
   ```

3. **Check firewall/network policies**:
   - Ensure containers are on the same network
   - Check Kubernetes NetworkPolicies

---

### Issue: Forecasts Are Inaccurate

**Symptoms**:
- MAPE > 30%
- Predictions don't match actual values
- Large confidence intervals

**Diagnosis**:

1. Check data quality:
   ```bash
   # Review recent requests
   docker-compose logs predictive-forecasting | grep "historical_data"
   ```

2. Check model performance by type:
   ```promql
   avg(predictive_forecast_accuracy_mape) by (model_type, signal_type)
   ```

3. Review forecast vs actual in Grafana

**Solutions**:

1. **Ensure sufficient historical data**:
   - Minimum 30 data points recommended
   - More data points = better accuracy

2. **Try different model**:
   - Switch from ARIMA to Exponential Smoothing
   - Or vice versa

3. **Check for outliers**:
   - Remove or smooth extreme values
   - Use data preprocessing

4. **Adjust model parameters** (in code):
   ```python
   # For ARIMA
   ARIMAForecaster(p=3, d=1, q=3)  # Increase orders

   # For Exponential Smoothing
   ExponentialSmoothingForecaster(alpha=0.5, beta=0.2)  # Tune parameters
   ```

---

## Performance Tuning

### Horizontal Scaling

**Docker Compose**:
```bash
docker-compose up -d --scale predictive-forecasting=3
```

**Kubernetes**:
```bash
kubectl scale deployment predictive-forecasting --replicas=3 -n predictive-suite
```

**Load Balancer**: Ensure requests are distributed evenly

### Caching Strategy

Enable caching in `config.yaml`:

```yaml
forecasting:
  cache_enabled: true
  cache_ttl_seconds: 900  # 15 minutes

simulation:
  cache_enabled: true
  cache_ttl_seconds: 600  # 10 minutes
```

### Worker Configuration

Adjust Uvicorn workers in `docker-compose.yml`:

```yaml
command: uvicorn api_service:app --host 0.0.0.0 --port 8091 --workers 8
```

**Guideline**: workers = (2 × CPU cores) + 1

### Database Connection Pooling

For future integration with persistent storage:

```yaml
performance:
  connection_pool:
    max_size: 100
    min_size: 10
    timeout_seconds: 30
```

---

## Maintenance

### Regular Tasks

#### Daily
- Check error logs for anomalies
- Review dashboard for unusual patterns
- Verify all alerts are working

#### Weekly
- Review forecast accuracy trends
- Check resource usage trends
- Clean up old logs
- Update alert thresholds if needed

#### Monthly
- Review and optimize model parameters
- Analyze performance bottlenecks
- Update dependencies (security patches)
- Test disaster recovery procedures

### Backup and Recovery

**Configuration Backup**:
```bash
# Backup config files
tar -czf predictive-suite-config-$(date +%Y%m%d).tar.gz \
  docker-compose.yml \
  config.yaml \
  prometheus.yml \
  grafana-provisioning/
```

**Restore**:
```bash
# Stop services
docker-compose down

# Restore config
tar -xzf predictive-suite-config-20251120.tar.gz

# Restart services
docker-compose up -d
```

### Upgrade Procedure

1. **Pre-upgrade**:
   ```bash
   # Backup current config
   tar -czf backup-$(date +%Y%m%d).tar.gz .

   # Check current version
   curl http://localhost:8091/ | jq .version
   ```

2. **Upgrade**:
   ```bash
   # Pull latest code
   git pull origin main

   # Rebuild image
   docker-compose build --no-cache

   # Rolling restart
   docker-compose up -d
   ```

3. **Post-upgrade**:
   ```bash
   # Verify health
   curl http://localhost:8091/health

   # Check logs
   docker-compose logs --tail=50 predictive-forecasting

   # Test endpoints
   curl -X POST http://localhost:8091/api/forecast \
     -H "Content-Type: application/json" \
     -d '{"signal_type": "event_count", ...}'
   ```

4. **Rollback** (if needed):
   ```bash
   # Restore backup
   tar -xzf backup-20251120.tar.gz

   # Rebuild and restart
   docker-compose build
   docker-compose up -d
   ```

### Log Rotation

Configure log rotation in `config.yaml`:

```yaml
logging:
  file:
    max_size_mb: 100
    max_files: 10
    rotation: "daily"
```

Or use logrotate:

```bash
# /etc/logrotate.d/predictive-suite
/var/log/predictive-suite/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
```

---

## Contact and Escalation

### On-Call Rotation

- **Primary**: Observability Team
- **Secondary**: Data Science Team
- **Escalation**: Platform Engineering

### Communication Channels

- **Slack**: #predictive-suite-alerts
- **Email**: predictive-suite@summit.internal
- **PagerDuty**: predictive-suite-oncall

### Documentation

- **API Docs**: http://localhost:8091/docs
- **Architecture**: /home/user/summit/predictive_threat_suite/ARCHITECTURE.md
- **Deployment**: /home/user/summit/predictive_threat_suite/DEPLOYMENT.md
- **README**: /home/user/summit/predictive_threat_suite/README.md

---

## Appendix: Useful Commands

### Quick Health Check
```bash
# All-in-one health check
curl -s http://localhost:8091/health | jq .
docker-compose ps
curl -s http://localhost:9090/-/healthy
curl -s http://localhost:3001/api/health
```

### Quick Performance Check
```bash
# Request latency
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8091/health

# Where curl-format.txt contains:
#     time_namelookup:  %{time_namelookup}\n
#        time_connect:  %{time_connect}\n
#     time_starttransfer:  %{time_starttransfer}\n
#                        ----------\n
#            time_total:  %{time_total}\n
```

### Quick Metrics Check
```bash
# Get key metrics
curl -s http://localhost:8091/metrics | grep -E "^(predictive_http_requests_total|predictive_forecast_generation_total|predictive_simulation_total)"
```

### Restart Everything
```bash
docker-compose down && docker-compose up -d && docker-compose logs -f
```

---

**Last Updated**: 2025-11-20
**Version**: 1.0.0-alpha
**Maintained By**: Observability Team
