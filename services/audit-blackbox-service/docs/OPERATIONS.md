# Audit Black Box Service - Operations Guide

## Overview

This guide provides operational procedures for the Audit Black Box Service, including deployment, monitoring, incident response, and disaster recovery.

## Table of Contents

1. [Deployment](#deployment)
2. [Monitoring](#monitoring)
3. [Incident Response](#incident-response)
4. [Disaster Recovery](#disaster-recovery)
5. [Maintenance](#maintenance)
6. [Compliance](#compliance)

---

## Deployment

### Prerequisites

- Kubernetes 1.28+
- PostgreSQL 15+ with logical replication
- Redis 7+ cluster
- TLS certificates
- HSM access (production)

### Deployment Steps

```bash
# 1. Create namespace
kubectl create namespace audit-system

# 2. Apply secrets (use sealed-secrets or external-secrets in production)
kubectl apply -f k8s/secrets.yaml

# 3. Apply configuration
kubectl apply -f k8s/deployment.yaml

# 4. Apply ingress
kubectl apply -f k8s/ingress.yaml

# 5. Verify deployment
kubectl rollout status deployment/audit-blackbox-service -n audit-system
```

### Health Checks

```bash
# Liveness probe
curl https://audit.intelgraph.io/health/live

# Readiness probe
curl https://audit.intelgraph.io/health/ready

# Detailed health
curl https://audit.intelgraph.io/health | jq
```

---

## Monitoring

### Key Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `audit_events_ingested_total` | Total events ingested | N/A (counter) |
| `audit_event_ingest_latency_ms` | Ingestion latency | P95 > 100ms |
| `audit_chain_length` | Current chain length | N/A (gauge) |
| `audit_verifications_total` | Verification operations | Failures > 0 |
| `audit_backpressure_level` | Buffer pressure | > 0.7 |
| `audit_errors_total` | Error count | Rate > 0.05 |

### Grafana Dashboards

Import the dashboard from `observability/grafana-dashboard.json`:

1. Open Grafana → Dashboards → Import
2. Upload JSON file
3. Select Prometheus data source

### Alert Channels

Configure alert routing in `observability/alerting-rules.yaml`:

- **Critical**: PagerDuty → Security team
- **Warning**: Slack → #audit-alerts
- **Info**: Email → audit-ops@company.com

---

## Incident Response

### Chain Integrity Failure

**Severity**: CRITICAL

**Symptoms**:
- Alert: `AuditChainIntegrityFailure`
- Verification failures in logs
- Hash mismatch errors

**Response**:

1. **Immediate** (0-5 minutes):
   ```bash
   # Check current status
   curl https://audit.intelgraph.io/audit/integrity

   # Get detailed verification report
   curl https://audit.intelgraph.io/audit/integrity/detailed | jq
   ```

2. **Investigation** (5-30 minutes):
   ```bash
   # Find the break point
   curl -X POST https://audit.intelgraph.io/audit/integrity/locate-break

   # Export affected range for forensic analysis
   curl -X POST https://audit.intelgraph.io/audit/export \
     -H "Content-Type: application/json" \
     -d '{"startSequence": 12345, "endSequence": 12400}'
   ```

3. **Escalation**:
   - Notify Security team immediately
   - Preserve all logs and evidence
   - Document timeline of events

4. **Recovery**:
   - Do NOT attempt to modify chain data
   - Engage forensic team
   - Prepare for potential data restoration from backup

### Service Unavailable

**Severity**: HIGH

**Response**:

1. Check pod status:
   ```bash
   kubectl get pods -n audit-system
   kubectl describe pod <pod-name> -n audit-system
   ```

2. Check logs:
   ```bash
   kubectl logs -n audit-system deployment/audit-blackbox-service --tail=100
   ```

3. Check dependencies:
   ```bash
   # PostgreSQL
   kubectl exec -n audit-system <pod> -- pg_isready -h $DB_HOST

   # Redis
   kubectl exec -n audit-system <pod> -- redis-cli -h $REDIS_HOST ping
   ```

4. Restart if necessary:
   ```bash
   kubectl rollout restart deployment/audit-blackbox-service -n audit-system
   ```

### High Latency

**Response**:

1. Check resource utilization:
   ```bash
   kubectl top pods -n audit-system
   ```

2. Check database performance:
   ```sql
   SELECT * FROM pg_stat_activity WHERE state = 'active';
   SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
   ```

3. Scale if needed:
   ```bash
   kubectl scale deployment/audit-blackbox-service --replicas=5 -n audit-system
   ```

---

## Disaster Recovery

### Backup Schedule

| Type | Frequency | Retention | Target |
|------|-----------|-----------|--------|
| Continuous | Real-time | 7 days | S3 (primary) |
| Hourly checkpoint | 1 hour | 30 days | S3 + GCS |
| Daily full | 24 hours | 1 year | S3 + GCS + Azure |
| Weekly archive | 7 days | 7 years | Glacier |

### Recovery Procedures

#### Point-in-Time Recovery

```bash
# List available recovery points
curl https://audit.intelgraph.io/recovery/points | jq

# Initiate recovery
curl -X POST https://audit.intelgraph.io/recovery/restore \
  -H "Content-Type: application/json" \
  -d '{"pointId": "rp-xxxxx", "targetSequence": 12345}'
```

#### Full Disaster Recovery

1. **Verify backup availability**:
   ```bash
   aws s3 ls s3://audit-backups/production/
   ```

2. **Deploy to DR site**:
   ```bash
   kubectl config use-context dr-cluster
   kubectl apply -f k8s/
   ```

3. **Restore from backup**:
   ```bash
   curl -X POST https://audit-dr.intelgraph.io/recovery/full-restore \
     -H "Authorization: Bearer $DR_TOKEN" \
     -d '{"backupId": "backup-xxxxx"}'
   ```

4. **Verify chain integrity**:
   ```bash
   curl https://audit-dr.intelgraph.io/audit/integrity
   ```

5. **Update DNS**:
   ```bash
   # Point audit.intelgraph.io to DR cluster
   ```

### RTO/RPO Targets

| Scenario | RPO | RTO |
|----------|-----|-----|
| Pod failure | 0 | 30 seconds |
| Node failure | 0 | 2 minutes |
| Zone failure | 0 | 5 minutes |
| Region failure | 5 minutes | 1 hour |

---

## Maintenance

### Routine Tasks

#### Daily
- Review alerts and dashboards
- Check replication lag
- Verify backup completion

#### Weekly
- Review anomaly detection reports
- Check storage utilization
- Update threat signatures

#### Monthly
- Test recovery procedures
- Review access logs
- Audit API key usage

#### Quarterly
- Full disaster recovery test
- Security assessment
- Capacity planning review

### Database Maintenance

```sql
-- Vacuum and analyze
VACUUM ANALYZE audit_events;

-- Check table size
SELECT pg_size_pretty(pg_total_relation_size('audit_events'));

-- Check index usage
SELECT * FROM pg_stat_user_indexes WHERE relname = 'audit_events';
```

### Certificate Rotation

```bash
# 1. Generate new certificate
openssl req -new -key server.key -out server.csr

# 2. Update secret
kubectl create secret tls audit-blackbox-tls \
  --cert=server.crt --key=server.key \
  -n audit-system --dry-run=client -o yaml | kubectl apply -f -

# 3. Restart pods to pick up new cert
kubectl rollout restart deployment/audit-blackbox-service -n audit-system
```

---

## Compliance

### Audit Log Retention

- **Minimum retention**: 7 years (2,555 days)
- **Legal hold**: Indefinite until released
- **GDPR requests**: Process within 30 days

### Access Controls

| Role | Permissions |
|------|-------------|
| audit-reader | Read events, search |
| audit-admin | Read, export, verify |
| audit-security | Full access, anomaly config |
| audit-compliance | Export, legal holds, redaction |

### Compliance Reports

```bash
# Generate SOC2 compliance report
curl -X POST https://audit.intelgraph.io/compliance/report \
  -H "Content-Type: application/json" \
  -d '{"type": "soc2", "period": "2024-Q4"}'

# Generate chain integrity attestation
curl https://audit.intelgraph.io/compliance/attestation
```

### Legal Exports

```bash
# Create legal export
curl -X POST https://audit.intelgraph.io/export/legal \
  -H "Content-Type: application/json" \
  -d '{
    "purpose": "legal_discovery",
    "caseNumber": "2024-CV-12345",
    "dateRange": {
      "start": "2024-01-01",
      "end": "2024-06-30"
    },
    "format": "sealed-archive"
  }'
```

---

## Contacts

| Role | Contact |
|------|---------|
| On-Call Engineer | pagerduty.com/audit-oncall |
| Security Team | security@company.com |
| Compliance Team | compliance@company.com |
| Legal | legal@company.com |

---

## Runbook References

- [Chain Integrity Failure](../RUNBOOKS/audit/chain-integrity-failure.md)
- [Service Recovery](../RUNBOOKS/audit/service-recovery.md)
- [Legal Export Process](../RUNBOOKS/audit/legal-export.md)
- [Disaster Recovery](../RUNBOOKS/audit/disaster-recovery.md)
