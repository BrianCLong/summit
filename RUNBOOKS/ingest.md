# Ingest Pipeline Runbook

> **Service**: Ingest/ETL Pipeline
> **Team**: Platform/Ingest
> **SLOs**: p95 lag ≤60s, DLQ rate <0.5%, Replay within RTO
> **Dashboard**: [Ingest Overview](/d/ingest-overview)

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Common Operations](#common-operations)
4. [Incident Response](#incident-response)
5. [Troubleshooting](#troubleshooting)
6. [Maintenance](#maintenance)

---

## Overview

The ingest pipeline processes data from multiple sources (S3, Kafka, webhooks, SFTP) with:
- **Backpressure control**: Token bucket rate limiting, concurrency semaphores
- **Idempotency**: SHA-256 dedupe keys for exactly-once semantics
- **Retry with backoff**: Exponential backoff with jitter, bounded retries
- **Circuit breakers**: Protect downstream sinks from cascade failures
- **DLQ routing**: Dead-letter queue with reason codes for triage

### Key Metrics

| Metric | Description | SLO |
|--------|-------------|-----|
| `ingest_lag_seconds` | Time from source to sink commit | p95 ≤ 60s |
| `ingest_dlq_total` | Records sent to DLQ | <0.5% of total |
| `ingest_records_total` | Total records processed | N/A |
| `ingest_backpressure_state` | Current backpressure state | Normal |

---

## Architecture

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Sources   │────▶│  Ingest Worker  │────▶│    Sinks    │
│ S3/Kafka/   │     │  - Backpressure │     │ Postgres/   │
│ Webhook     │     │  - Retry        │     │ Neo4j/      │
└─────────────┘     │  - Idempotency  │     │ Typesense   │
                    └────────┬────────┘     └─────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │      DLQ        │
                    │  - Reason codes │
                    │  - Redrive      │
                    └─────────────────┘
```

### Components

- **Ingest Adapters**: Source-specific connectors (S3, Kafka, Webhook, SFTP)
- **Ingest Worker**: Core processing with backpressure and retry
- **Sink Adapters**: Target-specific upsert with revision guards
- **Checkpoint Store**: Redis-backed offset/position tracking
- **DLQ Store**: Failed record storage with triage tooling

---

## Common Operations

### Check Pipeline Status

```bash
# View overall health
curl -s http://ingest-service:8080/health/detailed | jq

# Check specific adapter
curl -s http://ingest-service:8080/health/detailed | jq '.adapters["s3-main"]'

# View backpressure state
curl -s http://ingest-service:8080/health/detailed | jq '.backpressure'
```

### Enable Drain Mode

When you need to stop accepting new records but finish in-flight work:

```bash
# Enable drain mode
curl -X POST http://ingest-service:8080/admin/drain

# Monitor drain progress
watch -n 1 'curl -s http://ingest-service:8080/health/detailed | jq ".backpressure"'

# Resume normal operation
curl -X POST http://ingest-service:8080/admin/resume
```

### Enable Brownout

When you need to reduce load by dropping non-critical records:

```bash
# Enable brownout with 10% sample rate (drop 90% of low-priority records)
curl -X POST "http://ingest-service:8080/admin/brownout?rate=0.1"

# Disable brownout
curl -X POST http://ingest-service:8080/admin/resume
```

### Replay Operations

```bash
# Create a replay plan
replayctl plan \
  --tenant acme-corp \
  --from 2025-01-01T00:00:00Z \
  --to 2025-01-02T00:00:00Z \
  --sources s3,kafka \
  --throttle 100

# Approve the plan (requires RFA for large replays)
replayctl approve <plan-id> --rfa RFA-1234

# Execute the replay
replayctl run --plan <plan-id>

# Check status
replayctl status <plan-id>

# List all replays
replayctl list --tenant acme-corp
```

### DLQ Triage

```bash
# View DLQ summary
dlqtriage summary --tenant acme-corp

# Sample records for investigation
dlqtriage sample --reason SCHEMA_DRIFT --limit 5

# Analyze patterns
dlqtriage analyze --tenant acme-corp

# Redrive records after fix
dlqtriage redrive --tenant acme-corp --reason CONNECTION_ERROR

# Purge old records
dlqtriage purge --older-than 7 --reason OLDER_REVISION
```

---

## Incident Response

### <a name="lag-high"></a>Lag High (Warning)

**Alert**: `IngestLagHigh` - p95 lag exceeds 60s

**Impact**: Data freshness degraded, downstream consumers see stale data

**Steps**:
1. Check dashboard for affected tenants/sources
2. Identify if lag is global or tenant-specific
3. Check sink health (Postgres, Neo4j, Typesense)
4. Check for backpressure state changes
5. If sink is slow, consider enabling brownout temporarily

```bash
# Check which sources are lagging
curl -s http://ingest-service:8080/health/detailed | \
  jq '.adapters | to_entries | .[] | select(.value.lag_seconds > 60)'

# Check sink latency
curl -s http://postgres-exporter:9187/metrics | grep pg_stat_activity
```

### <a name="lag-critical"></a>Lag Critical

**Alert**: `IngestLagCritical` - p95 lag exceeds 5 minutes

**Impact**: Severe data staleness, potential SLO breach

**Steps**:
1. **Page on-call if not already paged**
2. Enable brownout to reduce load: `curl -X POST http://ingest-service:8080/admin/brownout`
3. Identify root cause:
   - Sink failure? Check circuit breaker state
   - Source burst? Check input volume spike
   - Worker issues? Check worker metrics
4. Scale workers if needed
5. Once stable, disable brownout and monitor recovery

### <a name="dlq-rate-high"></a>DLQ Rate High

**Alert**: `IngestDLQRateHigh` - DLQ rate exceeds 0.5%

**Impact**: Data loss risk, potential data quality issues

**Steps**:
1. Identify dominant DLQ reason: `dlqtriage summary --tenant <tenant>`
2. For SCHEMA_DRIFT:
   - Check recent schema changes in source systems
   - Review input data samples: `dlqtriage sample --reason SCHEMA_DRIFT`
   - Update schema transformers if needed
3. For VALIDATION_FAIL:
   - Review validation rules
   - Check input data quality
4. For SINK_TIMEOUT:
   - Check sink health
   - Consider temporary brownout
5. After fixing, redrive eligible records

### <a name="dlq-spike"></a>DLQ Spike

**Alert**: `IngestDLQSpike` - >100 DLQ records in 10 minutes

**Steps**:
1. Identify the reason code from alert
2. If SCHEMA_DRIFT or VALIDATION_FAIL: likely source data issue
3. If CONNECTION_ERROR or SINK_TIMEOUT: check downstream health
4. Investigate root cause before attempting redrive

### <a name="backpressure-stuck"></a>Backpressure Stuck

**Alert**: `IngestBackpressureStuck` - brownout for >30 minutes

**Steps**:
1. Check why backpressure triggered (queue depth, concurrency)
2. Check sink health and latency
3. If sink is healthy, may need to scale workers
4. If sink is overloaded, coordinate with downstream team
5. Manual intervention may be needed to exit brownout

### <a name="circuit-breaker"></a>Circuit Breaker Open

**Alert**: `IngestCircuitBreakerOpen`

**Impact**: Records to affected sink are failing immediately

**Steps**:
1. Identify which sink's circuit is open
2. Check sink health and connectivity
3. Check for recent sink deployments/changes
4. Wait for circuit half-open timeout (30s default)
5. If sink is healthy, circuit should close automatically
6. If persistent, may need to restart workers after sink is stable

---

## Troubleshooting

### No Records Processing

```bash
# Check adapter status
curl -s http://ingest-service:8080/health/detailed | jq '.adapters'

# Check Kafka consumer lag (if using Kafka adapter)
kafka-consumer-groups.sh --bootstrap-server $KAFKA_BROKERS \
  --describe --group ingest-adapter-main

# Check S3 for new files (if using S3 adapter)
aws s3 ls s3://ingest-bucket/prefix/ --recursive | tail -20
```

### High Retry Rate

```bash
# Check retry metrics by reason
curl -s http://ingest-service:8080/metrics | grep ingest_retry_total

# Identify pattern
dlqtriage analyze --tenant <tenant>

# If CONNECTION_ERROR: check network/DNS
# If SINK_TIMEOUT: check sink performance
# If RATE_LIMITED: check rate limits and quotas
```

### Schema Drift Issues

```bash
# Sample drifted records
dlqtriage sample --reason SCHEMA_DRIFT --full

# Compare with expected schema
cat ingest/schema/input.schema.json | jq

# If source schema changed, update transformers
# If validation too strict, review schema evolution policy
```

### Replay Not Progressing

```bash
# Check replay status
replayctl status <plan-id>

# Check for legal holds blocking replay
curl -s http://legal-hold-service:8080/holds?tenant=<tenant>

# Check checkpoint store
redis-cli GET "checkpoint:<tenant>:<source>"

# If stuck, may need to manually adjust checkpoint
```

---

## Maintenance

### Scaling Workers

Workers auto-scale based on queue depth. For manual scaling:

```bash
# Scale up workers
kubectl scale deployment ingest-worker --replicas=10

# Verify scaling
kubectl get pods -l app=ingest-worker
```

### Checkpoint Management

```bash
# View checkpoint
redis-cli GET "checkpoint:<tenant>:<source>"

# Reset checkpoint (DANGER: will cause reprocessing)
redis-cli DEL "checkpoint:<tenant>:<source>"
```

### Idempotency Key Cleanup

Idempotency keys have 7-day TTL by default. For manual cleanup:

```bash
# View idempotency stats
redis-cli INFO keyspace | grep ingest_idempotency

# Keys expire automatically via TTL
```

### Schema Updates

1. Update `ingest/schema/input.schema.json`
2. If breaking change, add transformer in `ingest/transformers/`
3. Update CI to test backwards compatibility
4. Deploy with feature flag if risky
5. Monitor DLQ for SCHEMA_DRIFT after deployment

---

## Contacts

- **On-call**: #ingest-oncall in Slack
- **Escalation**: Platform Engineering Lead
- **Downstream Issues**: Contact respective sink team
- **Security Concerns**: security@company.com

---

## Appendix

### DLQ Reason Codes

| Code | Description | Retryable |
|------|-------------|-----------|
| `SCHEMA_DRIFT` | Input doesn't match expected schema | No |
| `VALIDATION_FAIL` | Data validation failed | No |
| `OLDER_REVISION` | Record has older revision than existing | No |
| `SINK_TIMEOUT` | Sink operation timed out | Yes |
| `CONSTRAINT_VIOLATION` | Database constraint violation | No |
| `CONNECTION_ERROR` | Network/connection failure | Yes |
| `RATE_LIMITED` | Rate limit exceeded | Yes |
| `CIRCUIT_OPEN` | Circuit breaker is open | Yes |

### Backpressure States

| State | Description | Action |
|-------|-------------|--------|
| `normal` | Operating normally | None |
| `throttled` | Rate limiting active | Monitor |
| `brownout` | Dropping low-priority records | Investigate |
| `drain` | Finishing in-flight, rejecting new | Wait for drain |
| `paused` | All processing paused | Manual resume needed |
