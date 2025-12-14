# Incident Response Runbooks

## Severity Levels
- **SEV-1 (Critical)**: System unusable, data loss risk, security breach. SLA: 15m response.
- **SEV-2 (High)**: Major feature broken, performance degraded severely. SLA: 1h response.
- **SEV-3 (Medium)**: Minor bug, non-critical path. SLA: 1 business day.

## Common Incidents

### 1. API High Latency / SLO Breach
**Trigger**: `api_search_latency` SLO burn rate > 10x.
**Diagnosis**:
1. Check `summit_http_request_duration_seconds` histogram in Grafana.
2. Check trace for slow spans (DB? LLM? External API?).
3. Check `cpu_usage` and `memory_usage`.
**Mitigation**:
- If DB: Check for blocking queries or connection pool exhaustion.
- If External API: Enable circuit breakers or degradation mode.
- Scale up pods if CPU saturated.

### 2. Maestro Run Failures
**Trigger**: `maestro_run_success` < 99.5%.
**Diagnosis**:
1. Filter logs for `service:maestro` and `level:error`.
2. Check `summit_maestro_runs_total{status="failed"}`.
3. Identify failing template keys.
**Mitigation**:
- Pause specific Maestro templates if causing crashes.
- Replay failed runs via Admin Console after fix.

### 3. Ingestion Backlog / DLQ Overflow
**Trigger**: `summit_ingestion_dlq_records_total` spike.
**Diagnosis**:
1. Check `summit_ingestion_pipeline_runs_total`.
2. Inspect DLQ messages for schema validation errors.
**Mitigation**:
- If schema error: Fix upstream data or relax validator.
- If system load: Increase consumer replicas.

### 4. Database Connection Failures (Neo4j/Postgres)
**Trigger**: `/readyz` returning 503.
**Diagnosis**:
1. Check logs for `ECONNREFUSED` or `CircuitBreaker Open`.
2. Verify DB pod status.
**Mitigation**:
- Restart DB connection pools.
- Verify network policies.
