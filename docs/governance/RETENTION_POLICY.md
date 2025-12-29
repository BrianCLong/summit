# Data Retention Policy

## Overview
This document outlines the data retention rules for the platform, specifically focusing on receipts, provenance data, and operational logs.

## Retention Rules

| Data Type | Retention Period | Description |
|-----------|------------------|-------------|
| **Receipts/Provenance** | 3 Years | Immutable records of data lineage and transactions. |
| **Operational Logs** | 30 Days | General application logs for debugging and monitoring. |
| **Audit Trails** | 7 Years | Security and compliance audit logs (immutable). |
| **Telemetry** | 90 Days | Metrics and traces for performance analysis. |
| **Backups** | 35 Days | Database snapshots for disaster recovery. |

## Purge Procedures

Data purging is performed via the `purge-data` script. This process is:
1.  **Automated**: Scheduled jobs run daily to identify expired records.
2.  **Dry-Run Default**: The script defaults to a dry-run mode to prevent accidental deletion.
3.  **Audited**: All purge operations are logged to the Audit Trail.

### Manual Purge
To manually purge data (e.g., for "Right to be Forgotten" requests), use the `scripts/purge-data.ts` utility.

```bash
# Dry run (default) - lists what would be deleted
npx ts-node scripts/purge-data.ts --older-than 365

# Execute deletion
npx ts-node scripts/purge-data.ts --older-than 365 --execute
```

## Exceptions
- **Legal Holds**: Data subject to a legal hold must not be purged until the hold is lifted.
- **Anomalies**: Data flagged for security investigation may be retained indefinitely.
