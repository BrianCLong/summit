# Log Retention and Archival Policy

## Overview

This document defines the log retention and archival policies for the IntelGraph platform to ensure compliance, optimize storage costs, and maintain operational efficiency.

## Retention Periods

### Production Environment

| Log Type | Retention Period | Archival Period | Total Retention |
|----------|------------------|-----------------|-----------------|
| **Application Logs** | 30 days (hot) | 365 days (cold) | 395 days |
| **Security & Audit Logs** | 90 days (hot) | 7 years (cold) | 7 years + 90 days |
| **Error Logs** | 90 days (hot) | 2 years (cold) | 2 years + 90 days |
| **Debug Logs** | 7 days (hot) | Not archived | 7 days |
| **Performance Metrics** | 30 days (hot) | 1 year (cold) | 1 year + 30 days |
| **Access Logs** | 30 days (hot) | 1 year (cold) | 1 year + 30 days |
| **Database Logs** | 30 days (hot) | 90 days (cold) | 120 days |
| **System Logs** | 30 days (hot) | 90 days (cold) | 120 days |

### Development/Staging Environment

| Log Type | Retention Period | Archival Period | Total Retention |
|----------|------------------|-----------------|-----------------|
| **All Logs** | 7 days (hot) | Not archived | 7 days |

## Storage Tiers

### Hot Storage (Loki/Elasticsearch)

- **Purpose**: Active querying and real-time analysis
- **Access Pattern**: Frequent, low-latency queries
- **Technology**: Loki with SSD storage
- **Cost**: Higher (optimized for performance)

### Cold Storage (S3/Object Storage)

- **Purpose**: Long-term retention and compliance
- **Access Pattern**: Infrequent access, batch processing
- **Technology**: S3-compatible object storage (MinIO/AWS S3)
- **Format**: Compressed JSON or Parquet
- **Cost**: Lower (optimized for capacity)

## Archival Process

### Automated Archival

Logs are automatically archived using a scheduled cron job:

```bash
# Daily at 2 AM UTC
0 2 * * * /opt/intelgraph/scripts/archive-logs.sh
```

### Archival Steps

1. **Identification**: Identify logs older than hot retention period
2. **Compression**: Compress logs using gzip (9:1 ratio typical)
3. **Transfer**: Upload to S3-compatible storage
4. **Verification**: Verify integrity using checksums
5. **Deletion**: Remove from hot storage after verification
6. **Metadata**: Update archival metadata database

### Archival Format

```
s3://intelgraph-logs-archive/
  ├── production/
  │   ├── 2024/
  │   │   ├── 11/
  │   │   │   ├── 20/
  │   │   │   │   ├── application/
  │   │   │   │   │   ├── service-name-2024-11-20.json.gz
  │   │   │   │   │   ├── service-name-2024-11-20.json.gz.sha256
  │   │   │   │   ├── audit/
  │   │   │   │   ├── security/
  │   │   │   │   └── errors/
```

## Retention Configuration

### Loki Configuration

The Loki configuration (`monitoring/loki/local-config.yaml`) includes:

```yaml
compactor:
  retention_enabled: true
  retention_delete_delay: 2h
  retention_delete_worker_count: 150

table_manager:
  retention_deletes_enabled: true
  retention_period: 720h  # 30 days

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h  # 7 days
```

### Log Rotation (File-based)

Daily rotation with compression:

```javascript
// From @intelgraph/logger
{
  filename: `${logDir}/${serviceName}-%DATE%.log`,
  datePattern: 'YYYY-MM-DD',
  maxSize: '100m',
  maxFiles: '30d',
  zippedArchive: true
}
```

## Compliance Requirements

### Data Protection Regulations

- **GDPR**: Personal data in logs must be anonymized or pseudonymized
- **CCPA**: Logs containing California resident data must support deletion requests
- **HIPAA**: Healthcare-related logs require encrypted storage and access controls

### Audit Requirements

- **SOC 2**: Audit logs retained for 7 years
- **PCI DSS**: Payment-related logs retained for 1 year minimum
- **FISMA**: Federal system logs retained per agency requirements

## Data Lifecycle

```
┌─────────────┐
│   Ingestion │  Real-time logs from services
└──────┬──────┘
       │
       v
┌─────────────┐
│ Hot Storage │  Loki (0-30 days)
│   (Loki)    │  - Fast queries
└──────┬──────┘  - Full-text search
       │
       │ Daily archival job
       v
┌─────────────┐
│    Cold     │  S3 (30 days - retention limit)
│   Storage   │  - Compressed
│    (S3)     │  - Indexed
└──────┬──────┘  - Batch access
       │
       │ After retention period
       v
┌─────────────┐
│  Deletion   │  Permanent removal
│  (Scheduled)│  - Compliance verification
└─────────────┘  - Audit trail
```

## Access Controls

### Hot Storage Access

- **Developers**: Read-only access to dev/staging logs
- **SREs**: Read-write access to all logs
- **Security Team**: Full access to security/audit logs
- **Compliance**: Read-only access to audit logs

### Cold Storage Access

- **Compliance Team**: Full access via archival tools
- **Legal**: Access via formal request process
- **Auditors**: Read-only access with logging

## Archival Scripts

### Archive Logs Script

Location: `scripts/logging/archive-logs.sh`

```bash
#!/bin/bash
# Archive logs older than retention period

RETENTION_DAYS=30
ARCHIVE_BUCKET="s3://intelgraph-logs-archive"
LOG_DIR="/var/log/intelgraph"

# Archive application logs
find "$LOG_DIR" -name "*.log" -mtime +$RETENTION_DAYS -exec \
  aws s3 cp {} "$ARCHIVE_BUCKET/$(date +%Y/%m/%d)/" \
  --storage-class GLACIER \;

# Archive Loki data
loki-archiver \
  --loki-url http://localhost:3100 \
  --since ${RETENTION_DAYS}d \
  --output "$ARCHIVE_BUCKET" \
  --compression gzip
```

### Restore Logs Script

Location: `scripts/logging/restore-logs.sh`

```bash
#!/bin/bash
# Restore logs from archive for analysis

ARCHIVE_BUCKET="s3://intelgraph-logs-archive"
RESTORE_DIR="/tmp/restored-logs"
DATE_RANGE="2024/11/20"

# Download from S3
aws s3 sync \
  "$ARCHIVE_BUCKET/$DATE_RANGE" \
  "$RESTORE_DIR" \
  --exclude "*" \
  --include "*.json.gz"

# Decompress
find "$RESTORE_DIR" -name "*.json.gz" -exec gunzip {} \;

# Import into temporary Loki instance for querying
loki-importer \
  --source "$RESTORE_DIR" \
  --loki-url http://localhost:3100
```

## Monitoring and Alerts

### Storage Monitoring

- Alert when hot storage exceeds 80% capacity
- Alert when archival job fails
- Alert when log ingestion rate is abnormal

### Compliance Monitoring

- Weekly reports on archival job status
- Monthly audit of retention compliance
- Quarterly review of access logs

## Cost Optimization

### Strategies

1. **Compression**: 9:1 ratio reduces storage costs significantly
2. **Tiering**: Use S3 Glacier for cold storage (70% cost reduction)
3. **Sampling**: Sample debug logs at 10% in production
4. **TTL**: Automatically delete debug logs after 7 days

### Estimated Costs (Production)

| Component | Daily Volume | Monthly Cost | Annual Cost |
|-----------|-------------|--------------|-------------|
| Hot Storage (Loki) | 100 GB | $300 | $3,600 |
| Cold Storage (S3 Standard) | 50 GB/day | $500 | $6,000 |
| Cold Storage (S3 Glacier) | 1.5 TB total | $100 | $1,200 |
| **Total** | | **$900** | **$10,800** |

## Disaster Recovery

### Backup Strategy

- **Hot Storage**: Daily snapshots to S3
- **Cold Storage**: Cross-region replication
- **RPO**: 24 hours
- **RTO**: 4 hours for hot storage, 48 hours for cold storage

### Recovery Procedures

1. Restore Loki from snapshot
2. Import critical logs from archive
3. Verify data integrity
4. Resume log ingestion

## Review and Updates

This policy should be reviewed:

- **Quarterly**: Adjust retention periods based on storage costs and usage
- **Annually**: Update for new compliance requirements
- **Ad-hoc**: When significant infrastructure changes occur

## References

- [Loki Documentation](https://grafana.com/docs/loki/)
- [GDPR Compliance Guide](https://gdpr.eu/)
- [AWS S3 Lifecycle Policies](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html)
- [Log Management Best Practices](https://www.sans.org/reading-room/whitepapers/logging/)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-20
**Owner**: Platform Engineering Team
**Approved By**: Security & Compliance Team
