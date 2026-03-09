# Database Backup and Disaster Recovery Runbook

## Purpose
This document outlines the procedures for backing up the Summit platform database and recovering from various disaster scenarios.

## Scope
This runbook applies to all Summit platform database instances including:
- Primary PostgreSQL database
- Audit log database
- Maestro orchestrator database
- Neo4j graph database

## Roles and Responsibilities
- **Database Administrator (DBA)**: Execute backup and recovery procedures
- **Site Reliability Engineer (SRE)**: Monitor backup processes and initiate recovery
- **Security Officer**: Validate encryption and access controls

## Backup Procedures

### 1. Automated Daily Backups
**Frequency**: Daily at 2:00 AM UTC
**Retention**: 30 days for daily, 90 days for weekly, 1 year for monthly

#### PostgreSQL Database Backup
```bash
# Full backup using pg_dump
pg_dump --verbose --format=custom --compress=6 --file=/backup/postgres/$(date +%Y%m%d_%H%M%S)_full.backup postgresql://user:password@host:port/dbname

# Encrypt backup
gpg --symmetric --cipher-algo AES256 --compress-algo 1 --output /encrypted_backup/backup.gpg /backup/postgres/backup.backup

# Upload to secure storage (S3/MinIO with KMS encryption)
aws s3 cp /encrypted_backup/backup.gpg s3://summit-backups/postgres/ --sse aws:kms
```

#### Neo4j Database Backup
```bash
# Stop Neo4j service if consistent backup needed
sudo systemctl stop neo4j

# Use neo4j-admin for online backup
neo4j-admin backup --backup-dir=/backup/neo4j --name=neo4j-backup --from=neo4j://host:6362

# Restart service
sudo systemctl start neo4j
```

### 2. Transaction Log Shipping
**Frequency**: Every 5 minutes
**Retention**: 7 days

PostgreSQL WAL (Write Ahead Log) files are shipped to a warm standby server and S3 for point-in-time recovery capability.

### 3. Backup Verification
**Frequency**: Weekly automated restore tests
- Select random backup from previous week
- Restore to isolated environment
- Verify database integrity and application functionality
- Document verification results

## Disaster Recovery Scenarios

### Scenario 1: Database Server Failure
**Severity**: High
**RTO**: 15 minutes
**RPO**: 5 minutes

#### Recovery Steps:
1. **Assessment (2 min)**
   ```bash
   # Check service status
   systemctl status postgresql
   # Check system logs
   journalctl -u postgresql --since "10 minutes ago"
   ```

2. **Failover to Warm Standby (5 min)**
   - Promote standby server to primary
   - Update DNS records
   - Notify monitoring systems of new primary

3. **Application Verification (8 min)**
   - Test database connectivity
   - Run smoke tests for critical functionality
   - Monitor for data consistency issues

### Scenario 2: Logical Data Corruption
**Severity**: Critical
**RTO**: 2 hours
**RPO**: 10 minutes

#### Recovery Steps:
1. **Identify Corruption Timeframe (15 min)**
   - Check application logs
   - Review audit logs
   - Determine time of corruption

2. **Point-in-Time Recovery (60 min)**
   ```bash
   # Restore from latest backup
   pg_restore --clean --if-exists --dbname=restored_db /backup/latest.backup

   # Replay transactions up to just before corruption
   pg_rewind --source-server="host=primary dbname=restored_db" --target-pgdata=/var/lib/pgsql/data
   ```

3. **Data Validation (45 min)**
   - Verify restored data integrity
   - Compare with known good reference data
   - Test application functionality

### Scenario 3: Site-wide Outage
**Severity**: Critical
**RTO**: 4 hours
**RPO**: 15 minutes

#### Recovery Steps:
1. **Activate DR Site (60 min)**
   - Provision infrastructure in secondary region
   - Restore databases from latest backups
   - Configure networking and load balancers

2. **Data Restoration (90 min)**
   ```bash
   # Restore from encrypted backup stored in S3
   aws s3 cp s3://summit-backups/postgres/backup.gpg /tmp/
   gpg --decrypt --output /tmp/backup.backup /tmp/backup.gpg

   # Restore to fresh database instance
   pg_restore --verbose --clean --if-exists --dbname=dr_db /tmp/backup.backup
   ```

3. **Service Validation (90 min)**
   - End-to-end testing of critical workflows
   - User access validation
   - Performance testing

## Monitoring and Alerting

### Backup Monitoring
- **Backup Success/Failure**: Alert on backup job completion status
- **Storage Space**: Alert when backup storage exceeds 80%
- **Encryption Key Validity**: Alert on key expiration (90 days before)

### Recovery Testing
- **Monthly DR Exercise**: Full recovery procedure test
- **Quarterly Tabletop Exercise**: Coordination and communication procedures
- **Annual Deep Dive**: Complete disaster simulation

## Security Considerations
- All backups encrypted at rest using AES-256
- Backup encryption keys managed by AWS KMS or similar HSM
- Network transfers encrypted using TLS 1.3
- Access to backup systems restricted to authorized personnel only
- Regular access audits and rotation of backup system credentials

## Key Performance Indicators
- Backup success rate: >99.9%
- Recovery time actual vs target RTO
- Data loss actual vs target RPO
- Verification success rate: >99%

## Contact Information
- **Primary DBA**: dba-primary@summit-platform.io
- **Secondary DBA**: dba-secondary@summit-platform.io
- **SRE On-call**: sre-oncall@summit-platform.io
- **Security Incident**: security@summit-platform.io

## Appendices
### Appendix A: Emergency Commands
```bash
# Emergency backup
pg_dump --format=custom --compress=6 --file=/tmp/emergency_$(date +%Y%m%d_%H%M%S).backup

# Check replication status
SELECT * FROM pg_stat_replication;

# Cancel problematic queries
SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE state = 'active';
```

### Appendix B: Backup Storage Locations
- Primary: s3://summit-backups/
- Secondary: s3://summit-backups-secondary/
- Third Party: Azure Blob Container / GCS Bucket

### Appendix C: Encryption Keys Management
- Primary Backup Key ARN: arn:aws:kms:region:account:key/primary-backup-key
- DR Backup Key ARN: arn:aws:kms:region:account:key/dr-backup-key
- Key Rotation Frequency: Annually with 30-day overlap period