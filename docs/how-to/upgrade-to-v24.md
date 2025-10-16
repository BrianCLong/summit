---
title: Upgrade to v24
summary: Safe, tested steps to move to v24.
version: v24
owner: ops
---

## Prerequisites

### Backup Strategies

- Full database backup using `pg_dump` or your preferred backup solution
- Configuration files backup (especially `config.yml`, `secrets.env`)
- Docker volumes backup for persistent data
- Certificate and key material backup

### Staging Validation Checklist

- [ ] Test deployment in staging environment
- [ ] Verify all integrations work with new API schema
- [ ] Confirm authentication flows function correctly
- [ ] Validate data migration scripts on staging data
- [ ] Check performance benchmarks meet requirements

### System Requirements

- Minimum 16GB RAM (32GB recommended for production)
- PostgreSQL 14+ with updated extensions
- Redis 7.0+ for caching layer
- Docker 24.0+ with Docker Compose v2

## Steps

1. **Pre-upgrade Preparation**

   ```bash
   # Stop all services
   docker-compose down

   # Backup current configuration
   cp config.yml config.yml.backup
   cp -r /data/volumes /data/volumes.backup
   ```

2. **Database Migration**

   ```bash
   # Run migration scripts
   ./scripts/migrate-v24.sh --backup --verify

   # Verify migration success
   psql -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;"
   ```

3. **Configuration Updates**

   ```bash
   # Update configuration schema
   ./scripts/config-migrate.py config.yml.backup config.yml

   # Verify configuration
   ./scripts/validate-config.sh config.yml
   ```

4. **Service Deployment**

   ```bash
   # Pull new images
   docker-compose pull

   # Deploy with rolling restart
   docker-compose up -d --no-deps --build
   ```

5. **Post-deployment Verification**

   ```bash
   # Run health checks
   ./scripts/health-check.sh --timeout=300

   # Verify API endpoints
   curl -f http://localhost:8080/health
   ```

## Migration Scripts

The following scripts are provided for automated migration:

- `scripts/migrate-v24.sh` - Main migration orchestrator
- `scripts/schema-migrate.sql` - Database schema changes
- `scripts/config-migrate.py` - Configuration format updates
- `scripts/data-migrate.js` - Data transformation scripts

## Rollback

### Automatic Rollback

If upgrade fails, automatic rollback will:

1. Stop all v24 services
2. Restore previous Docker images
3. Restore database from backup
4. Restore configuration files

### Manual Rollback

```bash
# Stop v24 services
docker-compose down

# Restore database backup
psql < backup/pre-v24-dump.sql

# Restore configuration
cp config.yml.backup config.yml

# Start previous version
docker-compose -f docker-compose.v23.yml up -d
```

## Validation

### Post-upgrade Checks

- [ ] All services report healthy status
- [ ] Authentication system functional
- [ ] API endpoints respond correctly
- [ ] Search indexing operational
- [ ] Real-time features working
- [ ] ZIP export functionality available
- [ ] Certificate verification active

### Performance Validation

```bash
# Run performance benchmarks
./scripts/benchmark.sh --compare-baseline

# Monitor resource usage
docker stats --no-stream

# Check query performance
./scripts/query-performance-test.sh
```

### Integration Testing

```bash
# Test external integrations
./scripts/integration-tests.sh

# Verify OSINT feeds
./scripts/test-osint-ingestion.sh

# Check authentication providers
./scripts/test-auth-providers.sh
```

## Troubleshooting

### Common Issues

- **Memory pressure**: Increase container memory limits
- **Database locks**: Ensure all connections closed before migration
- **Certificate validation**: Update certificate store if needed
- **Search indexing**: May take 30+ minutes for large datasets

### Support Resources

- [Release Notes](../releases/v24.md)
- [Troubleshooting Guide](../support/troubleshooting.md)
- [Migration FAQ](../support/migration-faq.md)

## See also

- [v24 Release Notes](../releases/v24.md)
- [Deprecations & Removals](../reference/deprecations.md)
- [ZIP Export Setup](zip-export.md)
