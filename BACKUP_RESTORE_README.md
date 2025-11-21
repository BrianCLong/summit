# Summit Backup, Restore & DR Framework

## Quick Start

### Test the Framework

```bash
./scripts/test-backup-restore.sh
```

### Create a Backup

```bash
# Minimal backup (fast, for testing)
./scripts/backup-enhanced.sh --set=minimal

# Full backup (complete system)
./scripts/backup-enhanced.sh --set=full

# Per-tenant backup
TENANT_ID=customer-123 ./scripts/backup-enhanced.sh --set=tenant

# DR snapshot with S3 upload
S3_BUCKET=summit-backups ./scripts/backup-enhanced.sh --set=disaster_recovery
```

### Restore from Backup

```bash
# Find available backups
ls -lht backups/

# Verify a backup
BACKUP_ID=summit-backup-full-20250120T020000Z
./scripts/restore-enhanced.sh "$BACKUP_ID" --mode=verify-only

# Restore to dev environment (with data sanitization)
./scripts/restore-enhanced.sh "$BACKUP_ID" --env=dev

# Restore to production (no sanitization)
./scripts/restore-enhanced.sh "$BACKUP_ID" --env=production

# Dry run (no actual changes)
./scripts/restore-enhanced.sh "$BACKUP_ID" --env=test --dry-run
```

## Recovery Objectives

- **RTO (Recovery Time Objective)**: 4 hours
- **RPO (Recovery Point Objective)**: 15 minutes

## Backup Sets

| Set | Description | Frequency | Use Case |
|-----|-------------|-----------|----------|
| `full` | Complete system backup | Daily | Disaster recovery, compliance |
| `minimal` | Core databases only | Hourly | Quick testing, development |
| `tenant` | Per-tenant data | Hourly | Tenant isolation, GDPR |
| `project` | Per-project/investigation | On-demand | Archival, data portability |
| `config_only` | Configuration & policies | Every 4h | Config management |
| `disaster_recovery` | Multi-region DR snapshot | Every 6h | Production failover |

## Key Features

✅ **Multiple Backup Sets**: Full, minimal, per-tenant, per-project
✅ **Data Sanitization**: Auto-sanitize PII for dev/test environments
✅ **Multi-Region**: Cross-region S3 replication
✅ **Automated Validation**: Daily CI/CD pipeline
✅ **DR Drills**: 6 comprehensive drill scenarios
✅ **Encryption**: AES-256 for secrets
✅ **Integrity**: SHA-256 checksums

## Documentation

- **Complete Guide**: [docs/BACKUP_RESTORE_DR_GUIDE.md](docs/BACKUP_RESTORE_DR_GUIDE.md)
- **Backup Sets Config**: [config/backup-sets.yaml](config/backup-sets.yaml)
- **DR Drill Scenarios**: [RUNBOOKS/dr-drill-scenarios.yaml](RUNBOOKS/dr-drill-scenarios.yaml)
- **CI/CD Workflow**: [.github/workflows/backup-restore-validation.yml](.github/workflows/backup-restore-validation.yml)

## DR Drill Scenarios

Execute disaster recovery drills to validate recovery procedures:

1. **Total Data Loss Recovery** - Complete disaster recovery validation
2. **Database Corruption Recovery** - Selective restore testing
3. **Multi-Region Failover** - Cross-region failover testing
4. **Automated Backup Validation** - Weekly integrity checks (automated)
5. **Per-Tenant Data Recovery** - Tenant isolation testing
6. **Chaos Engineering + DR** - Combined chaos and recovery

## Automated Validation

The framework includes automated daily validation via GitHub Actions:

- **Schedule**: Daily at 3 AM UTC
- **What it tests**: Backup creation, integrity verification, restore procedures
- **Environments**: Test and dev restore with sanitization
- **Reports**: Validation reports with RTO/RPO compliance

## Architecture

```
Summit Backup & Restore Framework
│
├── Backup Sets (config/backup-sets.yaml)
│   ├── Full, Minimal, Tenant, Project
│   ├── Config Only, Disaster Recovery
│   └── Component definitions
│
├── Backup Scripts
│   ├── backup-enhanced.sh (enhanced with per-tenant/project)
│   ├── backup.sh (existing, full featured)
│   └── Supports: Local, S3, encryption, verification
│
├── Restore Scripts
│   ├── restore-enhanced.sh (with sanitization)
│   ├── restore.sh (existing, full featured)
│   └── Environments: production, staging, dr_rehearsal, dev, test
│
├── Data Sanitization
│   ├── PII masking (emails, phones, addresses)
│   ├── Credential replacement (keys, secrets, passwords)
│   ├── Sensitive data redaction (classified info)
│   └── Data reduction (10-20% for dev/test)
│
├── DR Drill Scenarios
│   ├── 6 comprehensive scenarios
│   ├── Integrated with ChaosEngine
│   └── Automated and manual execution
│
├── CI/CD Automation
│   ├── Daily backup validation
│   ├── Restore testing with sanitization
│   └── RTO/RPO compliance reporting
│
└── Monitoring & Alerting
    ├── Prometheus metrics
    ├── Grafana dashboards
    └── Alert rules
```

## Data Stores Backed Up

- **Neo4j**: Graph database (entities, relationships, knowledge graphs)
- **PostgreSQL**: Relational database (transactional data, pgvector embeddings)
- **TimescaleDB**: Time-series data (events, analytics, temporal patterns)
- **Redis**: Cache and session store
- **Configuration**: OPA policies, app configs, K8s manifests
- **Secrets**: Encrypted credentials and API keys
- **Provenance**: Data lineage and attestations
- **Policy Store**: Policy definitions and compliance data
- **Catalog**: Data catalog and metadata registry

## Storage Requirements

- **Full Backup**: ~40 GB
- **Minimal Backup**: ~3 GB
- **Tenant Backup**: ~500 MB per tenant
- **Project Backup**: ~200 MB per project
- **Monthly Total**: ~5 TB (with retention and multi-region)

## Security

- **Encryption**: AES-256 for secrets, GPG/OpenSSL support
- **Integrity**: SHA-256 checksums for all backup files
- **Sanitization**: Automatic PII masking for non-production environments
- **Access Control**: S3 bucket policies, IAM roles
- **Audit**: Complete audit trail for all backup/restore operations

## Troubleshooting

See the complete troubleshooting guide in [docs/BACKUP_RESTORE_DR_GUIDE.md](docs/BACKUP_RESTORE_DR_GUIDE.md#troubleshooting).

Common issues:
- Disk space errors → Clean up old backups
- Permission denied → Check file permissions
- S3 upload fails → Verify AWS credentials
- Data sanitization not applied → Use `--sanitize=true`

## Next Steps

1. ✅ Framework is installed and validated
2. Configure environment variables in `.env`
3. Set up S3 buckets for cloud storage (optional)
4. Configure automated backup schedule (cron or K8s CronJobs)
5. Run first production backup: `./scripts/backup-enhanced.sh --set=full`
6. Test restore procedure: `./scripts/restore-enhanced.sh <backup-id> --env=test --dry-run`
7. Schedule monthly DR drill
8. Review complete documentation

## Support

- **Documentation**: [docs/BACKUP_RESTORE_DR_GUIDE.md](docs/BACKUP_RESTORE_DR_GUIDE.md)
- **Issues**: Create an issue in the repository
- **Emergency**: Contact on-call engineer via PagerDuty

---

**Version**: 1.0
**Last Updated**: 2025-01-20
