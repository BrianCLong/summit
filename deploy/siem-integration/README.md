# SIEM Integration for MC Platform

## HTTP Sink Configuration

Configure SIEM HTTP sink for interop gateway audit events:

```bash
# Set SIEM environment variables
kubectl set env deploy/agent-workbench \
  AUDIT_SIEM_URL=https://siem.example.com/ingest \
  AUDIT_SIEM_KEY=$SIEM_TOKEN \
  AUDIT_SIEM_ENABLED=true

# Optional: Configure batch settings
kubectl set env deploy/agent-workbench \
  AUDIT_SIEM_BATCH_SIZE=100 \
  AUDIT_SIEM_FLUSH_INTERVAL=30s \
  AUDIT_SIEM_RETRY_MAX=3
```

## Supported SIEM Formats

The MC platform supports multiple SIEM output formats:

### 1. Splunk HEC (HTTP Event Collector)
```bash
AUDIT_SIEM_URL=https://splunk.example.com:8088/services/collector/event
AUDIT_SIEM_KEY=your-hec-token
AUDIT_SIEM_FORMAT=splunk
```

### 2. Elastic Security / SIEM
```bash
AUDIT_SIEM_URL=https://elastic.example.com:9200/mc-audit/_doc
AUDIT_SIEM_KEY=your-api-key
AUDIT_SIEM_FORMAT=elastic
```

### 3. Microsoft Sentinel
```bash
AUDIT_SIEM_URL=https://your-workspace.ods.opinsights.azure.com/api/logs
AUDIT_SIEM_KEY=your-workspace-key
AUDIT_SIEM_FORMAT=sentinel
AUDIT_SIEM_WORKSPACE_ID=your-workspace-id
```

### 4. Generic JSON HTTP
```bash
AUDIT_SIEM_URL=https://siem.example.com/api/events
AUDIT_SIEM_KEY=your-auth-token
AUDIT_SIEM_FORMAT=json
AUDIT_SIEM_HEADERS='{"X-Custom-Header":"value"}'
```

## Event Schema

All audit events follow this schema:

```json
{
  "timestamp": "2025-09-25T18:30:45.123Z",
  "event_type": "a2a_request",
  "tenant_id": "TENANT_001",
  "user_id": "user@example.com",
  "source_ip": "192.168.1.100",
  "request": {
    "agent": "code-refactor",
    "task": {"repo": "svc-api", "goal": "add pagination"},
    "purpose": "investigation",
    "residency": "US"
  },
  "policy": {
    "allow": true,
    "reasons": ["PERSISTED_QUERY_MATCH", "RESIDENCY_COMPLIANT"],
    "risk_score": 0.12
  },
  "response": {
    "success": true,
    "duration_ms": 2847,
    "task_id": "a2a_task_1758846245"
  },
  "provenance": {
    "hash": "d7f17a6705ac425c",
    "audit_event_id": "audit_1758846245"
  }
}
```

## Fallback Configuration

File sink remains available as fallback:

```bash
# Enable both HTTP and file sinks
kubectl set env deploy/agent-workbench \
  AUDIT_SIEM_ENABLED=true \
  AUDIT_FILE_ENABLED=true \
  AUDIT_FILE_PATH=/var/log/mc-audit/events.log
```

## Monitoring

Monitor SIEM integration health:

```promql
# SIEM HTTP sink success rate
rate(mc_siem_requests_total{status="success"}[5m]) / rate(mc_siem_requests_total[5m])

# SIEM sink latency
histogram_quantile(0.95, rate(mc_siem_request_duration_seconds_bucket[5m]))

# SIEM queue depth
mc_siem_queue_size
```