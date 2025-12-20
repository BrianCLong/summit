# Data Pipeline Operations Runbook

> **Quick Reference Guide for ETL/Data Pipeline Operations**

## Quick Links

- **Health Check**: `curl http://localhost:4020/health`
- **Metrics**: `curl http://localhost:4020/metrics`
- **API Docs**: [DATA_PIPELINE_GUIDE.md](./DATA_PIPELINE_GUIDE.md#api-reference)

---

## Daily Operations

### Morning Checklist

```bash
# 1. Check service health
curl http://localhost:4020/health | jq

# 2. Review overnight pipeline runs
curl http://localhost:4020/metrics | jq

# 3. Check for failed runs
psql -d summit -c "
  SELECT pipeline_id, COUNT(*) as failures
  FROM pipeline_runs
  WHERE status = 'failed'
    AND created_at > NOW() - INTERVAL '24 hours'
  GROUP BY pipeline_id;
"

# 4. Review data quality reports
curl http://localhost:4020/quality/reports/latest | jq '.issues[]'

# 5. Check CDC lag
psql -d summit -c "
  SELECT
    source_table,
    last_processed_time,
    NOW() - last_processed_time as lag
  FROM etl_cdc_watermarks
  WHERE last_processed_time < NOW() - INTERVAL '1 hour';
"
```

---

## Common Operations

### Start a Pipeline

```bash
# Trigger pipeline execution
curl -X POST http://localhost:4020/pipelines/{pipeline-id}/execute

# Monitor progress (check every 30s)
watch -n 30 'curl -s http://localhost:4020/pipelines/{pipeline-id}/runs | jq ".[0]"'
```

### Enable CDC for a Table

```bash
# Start CDC
curl -X POST http://localhost:4020/pipelines/{pipeline-id}/cdc/start

# Verify CDC is running
curl http://localhost:4020/metrics | jq '.activeCDCEngines'
```

### Reset Watermark (Full Reload)

```sql
-- Backup current watermark
CREATE TABLE etl_watermarks_backup AS
SELECT * FROM etl_watermarks WHERE source_table = 'your_table';

-- Reset watermark
DELETE FROM etl_watermarks WHERE source_table = 'your_table';

-- Trigger full reload
curl -X POST http://localhost:4020/pipelines/{pipeline-id}/execute
```

### Pause a Pipeline

```sql
-- Disable pipeline schedule
UPDATE pipelines
SET enabled = false
WHERE pipeline_id = 'your-pipeline';
```

### Resume a Pipeline

```sql
-- Enable pipeline schedule
UPDATE pipelines
SET enabled = true
WHERE pipeline_id = 'your-pipeline';
```

---

## Incident Response

### Pipeline Failure

**Severity**: High
**Response Time**: 15 minutes

#### Steps

1. **Identify failed pipeline**
   ```bash
   curl http://localhost:4020/pipelines/{pipeline-id}/runs | jq '.[0]'
   ```

2. **Review error logs**
   ```bash
   # Check pipeline errors
   curl http://localhost:4020/pipelines/{pipeline-id}/runs/{run-id} | jq '.errors[]'

   # Check service logs
   tail -100 logs/etl-service.log | jq 'select(.pipelineId == "{pipeline-id}")'
   ```

3. **Determine root cause**
   - Connection failure → Check database connectivity
   - Validation error → Review data quality issues
   - Timeout → Check query performance

4. **Apply fix and retry**
   ```bash
   # Retry failed pipeline
   curl -X POST http://localhost:4020/pipelines/{pipeline-id}/execute
   ```

5. **Document incident**
   - Update incident log
   - Create post-mortem if critical

### CDC Lag Alert

**Severity**: Medium
**Response Time**: 30 minutes

#### Steps

1. **Check current lag**
   ```sql
   SELECT
     source_table,
     NOW() - last_processed_time as lag,
     last_processed_value
   FROM etl_cdc_watermarks
   ORDER BY lag DESC;
   ```

2. **Identify bottleneck**
   - High source load → Scale CDC workers
   - Network issues → Check connectivity
   - Large batch → Reduce batch size

3. **Mitigate**
   ```bash
   # Temporarily increase poll frequency
   # Update pipeline config and restart CDC
   curl -X POST http://localhost:4020/pipelines/{pipeline-id}/cdc/stop
   # Update config...
   curl -X POST http://localhost:4020/pipelines/{pipeline-id}/cdc/start
   ```

### Data Quality Degradation

**Severity**: Medium-High
**Response Time**: 1 hour

#### Steps

1. **Get quality report**
   ```bash
   curl http://localhost:4020/quality/reports/{run-id} | jq
   ```

2. **Identify affected dimensions**
   ```bash
   curl http://localhost:4020/quality/reports/{run-id} | jq '.dimensions'
   ```

3. **Review issues**
   ```bash
   curl http://localhost:4020/quality/reports/{run-id} | jq '.issues[] | select(.severity == "critical")'
   ```

4. **Investigate root cause**
   - Check source data quality
   - Review recent schema changes
   - Verify validation rules

5. **Remediate**
   - Fix source data if possible
   - Update validation rules
   - Quarantine bad records

---

## Maintenance Tasks

### Weekly Maintenance

```bash
# 1. Clean old pipeline runs (keep 30 days)
psql -d summit -c "
  DELETE FROM pipeline_runs
  WHERE created_at < NOW() - INTERVAL '30 days';
"

# 2. Vacuum watermark tables
psql -d summit -c "
  VACUUM ANALYZE etl_watermarks;
  VACUUM ANALYZE etl_cdc_watermarks;
"

# 3. Review quality trends
psql -d summit -c "
  SELECT
    DATE(timestamp) as date,
    AVG(overall_score) as avg_quality_score
  FROM data_quality_reports
  WHERE timestamp > NOW() - INTERVAL '7 days'
  GROUP BY DATE(timestamp)
  ORDER BY date;
"
```

### Monthly Maintenance

```bash
# 1. Archive old CDC change tables
psql -d summit -c "
  CREATE TABLE your_table_changes_archive AS
  SELECT * FROM your_table_changes
  WHERE changed_at < NOW() - INTERVAL '90 days';

  DELETE FROM your_table_changes
  WHERE changed_at < NOW() - INTERVAL '90 days';
"

# 2. Review and optimize slow pipelines
# 3. Update documentation
# 4. Security audit (credential rotation)
```

---

## Monitoring Alerts

### Critical Alerts (PagerDuty)

- Pipeline failure rate > 10%
- CDC lag > 2 hours
- Service health check failing
- Data quality score < 70%

### Warning Alerts (Slack)

- Pipeline execution time > SLA
- Quality score dropped > 10 points
- CDC lag > 30 minutes
- Watermark not advancing

### Info Alerts (Email)

- New pipeline created
- Pipeline configuration changed
- Quality report available

---

## Emergency Procedures

### Service Restart

```bash
# Graceful restart
systemctl restart etl-service

# Force restart
systemctl kill -s SIGKILL etl-service
systemctl start etl-service
```

### Database Failover

```bash
# 1. Stop all pipelines
curl -X POST http://localhost:4020/admin/stop-all

# 2. Update connection string
export DATABASE_URL="postgresql://new-host:5432/summit"

# 3. Restart service
systemctl restart etl-service

# 4. Verify connectivity
curl http://localhost:4020/health

# 5. Resume pipelines
curl -X POST http://localhost:4020/admin/resume-all
```

### Rollback Deployment

```bash
# 1. Stop current service
systemctl stop etl-service

# 2. Switch to previous version
cd /opt/etl-service
git checkout <previous-commit>
pnpm install
pnpm build

# 3. Start service
systemctl start etl-service

# 4. Verify
curl http://localhost:4020/health
```

---

## Performance Optimization

### Slow Pipeline Investigation

```bash
# 1. Get pipeline metrics
curl http://localhost:4020/pipelines/{pipeline-id}/runs/{run-id} | jq '.metrics'

# 2. Identify bottleneck
# - extractionDurationMs → Source query optimization
# - transformationDurationMs → Simplify transformations
# - loadingDurationMs → Optimize target writes

# 3. Enable query logging
export LOG_LEVEL=debug

# 4. Profile specific stage
# Review logs for timing information
```

### Database Query Optimization

```sql
-- Add index on incremental column
CREATE INDEX CONCURRENTLY idx_your_table_updated_at
ON your_table(updated_at);

-- Analyze table statistics
ANALYZE your_table;

-- Check query plan
EXPLAIN ANALYZE
SELECT * FROM your_table WHERE updated_at > '2025-01-01';
```

---

## Contact Information

### On-Call Rotation

- **Primary**: Data Platform Team
- **Escalation**: Platform Engineering
- **Slack**: #summit-data-platform
- **PagerDuty**: Data Pipeline On-Call

### Key Personnel

- **Data Platform Lead**: [Name]
- **Database Administrator**: [Name]
- **DevOps Engineer**: [Name]

---

## Additional Resources

- [Data Pipeline Guide](./DATA_PIPELINE_GUIDE.md)
- [Architecture Documentation](../ARCHITECTURE.md)
- [API Reference](./DATA_PIPELINE_GUIDE.md#api-reference)
- [Troubleshooting Guide](./DATA_PIPELINE_GUIDE.md#troubleshooting)
