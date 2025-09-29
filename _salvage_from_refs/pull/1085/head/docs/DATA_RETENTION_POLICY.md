# Data Retention Policy - Conductor Omniversal System

**Version**: 1.0  
**Owner**: Platform Engineering + SRE  
**Effective Date**: 2025-08-31  
**Review Cycle**: Quarterly  

## Executive Summary

This document defines data retention patterns, storage tiers, and lifecycle policies for the Conductor Omniversal System to ensure optimal performance, cost efficiency, and regulatory compliance.

## Storage Architecture Overview

### Primary Data Stores

| Store | Purpose | Hot Retention | Warm Retention | Cold/Archive |
|-------|---------|---------------|----------------|--------------|
| **PostgreSQL** | OLTP transactions, decisions, audit | 30 days | 90 days | 13 months |
| **Redis** | Queues, cache, sessions | Real-time | 24 hours | N/A |
| **Object Store** | Artifacts, evidence, backups | 90 days | 1 year | 7 years |
| **Neo4j** | Graph relationships, entities | 90 days | 1 year | 2 years |

## Data Categories & Retention Schedules

### 1. Routing & Decision Data (PostgreSQL)

**Hot Tier (30 days)**
- `RouteDecision` - Active routing decisions and metadata
- `RewardEvent` - Online learning signals and rewards  
- `EvalRun` - Recent evaluation runs and results
- `PolicyDecision` - OPA authorization decisions

**Warm Tier (31-90 days)**
- Compressed routing history for trend analysis
- Aggregated reward metrics by tenant/expert
- Historical evaluation baselines
- Policy decision summaries

**Cold Tier (91 days - 13 months)**
- Annual compliance reporting data
- Archived decision logs (WORM storage)
- Historical baselines for ML model training
- Audit trail for SOC2/GDPR requirements

**Purge Policy**: After 13 months, PII is anonymized; aggregated metrics retained for 7 years

### 2. Queue & Cache Data (Redis)

**Real-time (Active)**
- `QueueItem` - Active job queues and worker assignments
- `BanditState` - Current model parameters and exploration state  
- `PolicyCache` - Cached OPA decisions (TTL 60s)
- `SessionData` - Active user sessions and contexts

**Transient (24 hours)**
- Completed job results and error logs
- Expired policy decisions 
- Historical bandit states for rollback
- Debug telemetry and trace data

**Eviction Policy**: LRU eviction when memory > 80%; explicit TTL for sensitive data

### 3. Artifacts & Evidence (Object Store)

**Hot Tier (90 days)**
- `ComplianceEvidence` - Recent control test results and attestations
- `RunbookArtifacts` - Execution logs, screenshots, audit trails
- `EvaluationArtifacts` - Golden task results, model outputs
- `EdgeSyncArtifacts` - CRDT operation logs and conflict resolution

**Warm Tier (91 days - 1 year)**  
- Historical compliance reports (SOC2, GDPR, NIST)
- Archived runbook executions and approval workflows
- ML model snapshots and evaluation datasets
- Incident response artifacts and post-mortems

**Cold/Archive Tier (1+ years)**
- Legal hold and litigation support data
- Annual audit packages and attestation letters
- Long-term trend data for capacity planning
- Disaster recovery and business continuity records

**Lifecycle Policies**:
- **Legal Hold**: Data under legal hold exempt from automated deletion
- **GDPR**: Right to erasure honored within 30 days; anonymization preferred
- **SOC2**: Evidence retained for 3 years post-audit
- **Business**: Long-term analytics data anonymized after 2 years

### 4. Graph & Relationship Data (Neo4j)

**Hot Tier (90 days)**
- Active entity relationships and provenance chains
- Recent analysis results and intelligence products
- Current investigation data and case files
- Active federation and sharing agreements

**Warm Tier (91 days - 1 year)**
- Completed investigations and archived cases
- Historical relationship patterns and trend analysis
- Sunset partnership data and sharing logs
- Legacy data model versions during migrations

**Cold Tier (1-2 years)**
- Anonymized pattern datasets for research
- Historical baseline data for anomaly detection  
- Archived threat intelligence and indicator data
- Export packages for data migration/portability

## Implementation Details

### Automated Lifecycle Management

```sql
-- PostgreSQL partition management (monthly partitions)
CREATE OR REPLACE FUNCTION manage_routing_partitions()
RETURNS void AS $$
BEGIN
    -- Create next month partition
    PERFORM create_monthly_partition('route_decisions', CURRENT_DATE + INTERVAL '1 month');
    
    -- Archive partitions older than 30 days to warm storage
    PERFORM archive_partition('route_decisions', CURRENT_DATE - INTERVAL '30 days');
    
    -- Drop partitions older than 13 months (after cold archival)
    PERFORM drop_partition('route_decisions', CURRENT_DATE - INTERVAL '13 months');
END;
$$ LANGUAGE plpgsql;

-- Schedule daily execution
SELECT cron.schedule('partition_management', '0 2 * * *', 'SELECT manage_routing_partitions()');
```

### Redis Memory Management

```python
# Redis configuration for conductor instances
redis_config = {
    'maxmemory': '2gb',
    'maxmemory-policy': 'allkeys-lru',
    'save': '900 1 300 10 60 10000',  # Persistence checkpoints
    'appendonly': 'yes',               # AOF for durability
    'appendfsync': 'everysec'         # Balanced durability/performance
}

# TTL settings by data type
ttl_policies = {
    'queue_items': 86400,       # 24 hours
    'policy_cache': 60,         # 1 minute  
    'bandit_state': 604800,     # 7 days
    'session_data': 3600        # 1 hour
}
```

### Object Store Lifecycle Policy

```json
{
  "Rules": [
    {
      "ID": "ConductorHotToWarm",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "STANDARD_IA"
        }
      ],
      "Filter": {
        "Prefix": "conductor/evidence/"
      }
    },
    {
      "ID": "ConductorWarmToCold", 
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 365,
          "StorageClass": "GLACIER_IR"
        },
        {
          "Days": 2555,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ]
    },
    {
      "ID": "ConductorExpiration",
      "Status": "Enabled", 
      "Expiration": {
        "Days": 2555
      },
      "Filter": {
        "Tag": {
          "Key": "DataClass",
          "Value": "NonCritical"
        }
      }
    }
  ]
}
```

## Monitoring & Alerting

### Data Volume Metrics

- **PostgreSQL**: Table sizes, partition counts, query performance
- **Redis**: Memory usage, eviction rates, persistence lag
- **Object Store**: Storage costs, retrieval frequencies, lifecycle transitions  
- **Neo4j**: Node/relationship counts, index performance, backup sizes

### Retention Compliance Alerts

- **PolicyViolation**: Data retained beyond policy limits
- **LegalHoldBreach**: Automated deletion of protected data
- **ComplianceGap**: Missing evidence or audit trails
- **StorageQuotaExceeded**: Approaching storage limits or budget thresholds

## Security & Compliance Considerations

### Data Classification

| Classification | Encryption | Access Controls | Retention Override |
|----------------|------------|-----------------|-------------------|
| **Public** | Transit only | Standard RBAC | None |
| **Internal** | Transit + Rest | Tenant isolation | Business need |
| **Confidential** | Transit + Rest + Field | Need-to-know | Legal hold |
| **Restricted** | Transit + Rest + Field + HSM | Multi-factor + approval | Court order only |

### Regulatory Alignment

- **SOC2**: Audit trail retention (3+ years), access logging, change management
- **GDPR**: Right to erasure, data minimization, lawful basis documentation  
- **NIST**: Configuration baselines, incident response artifacts, control evidence
- **Industry**: Sector-specific requirements (finance, healthcare, defense)

## Cost Optimization

### Storage Cost Targets

- **Hot Storage**: $0.10/GB/month (PostgreSQL + Redis)
- **Warm Storage**: $0.05/GB/month (Object Store IA)  
- **Cold Storage**: $0.01/GB/month (Glacier/Deep Archive)
- **Data Transfer**: Minimize cross-region replication

### Right-Sizing Recommendations

1. **Partition Strategy**: Monthly partitions for time-series data
2. **Compression**: Use pg_dump with compression for PostgreSQL archives
3. **Deduplication**: Object-level deduplication for artifacts
4. **Tiered Compute**: Use spot instances for batch archival jobs

## Operational Procedures  

### Daily Operations
- Monitor storage utilization and growth rates
- Verify automated lifecycle transitions
- Check backup completion and integrity
- Review retention policy compliance

### Weekly Operations  
- Analyze data access patterns and optimization opportunities
- Review and update retention policies based on business needs
- Validate disaster recovery and restore procedures
- Audit legal hold and compliance requirements

### Monthly Operations
- Generate data retention compliance reports
- Review storage costs and optimization opportunities  
- Update data classification and access controls
- Test retention policy changes in staging environment

### Quarterly Operations
- Conduct comprehensive data retention policy review
- Update regulatory compliance mappings
- Validate business continuity and disaster recovery plans
- Review and update this policy document

## Exception Handling

### Legal Hold Process
1. **Notification**: Legal/GRC team initiates hold via service desk
2. **Implementation**: Automated hold tags applied within 4 hours  
3. **Validation**: Hold effectiveness verified within 24 hours
4. **Monitoring**: Monthly compliance reports until hold lifted

### Emergency Data Recovery
1. **Classification**: Determine recovery urgency (P0/P1/P2/P3)
2. **Approval**: Security/Legal approval for cold storage retrieval
3. **Execution**: Restore to isolated environment for review
4. **Validation**: Data integrity and completeness verification

## Appendix A: Configuration Templates

### PostgreSQL Archive Configuration
```sql
-- Enable archiving
archive_mode = on
archive_command = '/usr/local/bin/archive_wal.sh %p %f'
wal_level = replica
max_wal_senders = 3
```

### Redis Persistence Configuration  
```conf
# Hybrid persistence for durability + performance
save 900 1
save 300 10  
save 60 10000
appendonly yes
appendfsync everysec
no-appendfsync-on-rewrite no
```

## Appendix B: Compliance Checklists

### SOC2 Data Retention Requirements
- [ ] Data retention policies documented and approved
- [ ] Automated retention controls implemented and tested
- [ ] Data disposal procedures secure and auditable  
- [ ] Access to retained data logged and monitored
- [ ] Annual policy review completed with executive approval

### GDPR Data Protection Requirements
- [ ] Lawful basis documented for data retention
- [ ] Data minimization principles applied
- [ ] Right to erasure procedures implemented
- [ ] Cross-border transfer safeguards in place
- [ ] Data breach notification procedures tested

---

**Document Control**
- **Next Review**: 2025-11-30
- **Distribution**: Platform Engineering, SRE, Security, GRC, Legal  
- **Approval**: [Platform VP], [CISO], [DPO]
- **Version History**: See git log for detailed changes