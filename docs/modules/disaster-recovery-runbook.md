# Maestro Conductor Disaster Recovery Runbook

## Overview

This runbook provides step-by-step procedures for handling disaster scenarios in the Maestro Conductor production environment. It covers detection, escalation, recovery procedures, and post-incident activities.

## 🚨 Emergency Contacts

### Primary On-Call

- **Production Team Lead**: +1-XXX-XXX-XXXX
- **SRE Lead**: +1-XXX-XXX-XXXX
- **Engineering Manager**: +1-XXX-XXX-XXXX

### Secondary Contacts

- **Database Admin**: +1-XXX-XXX-XXXX
- **Security Team**: +1-XXX-XXX-XXXX
- **Infrastructure Team**: +1-XXX-XXX-XXXX

### Escalation Matrix

1. **Severity 1** (Complete outage): Page all primary contacts immediately
2. **Severity 2** (Major degradation): Page primary on-call, escalate after 15 minutes
3. **Severity 3** (Minor issues): Create incident, notify during business hours

## 🏗️ System Architecture Quick Reference

### Production Environment

- **Kubernetes Cluster**: `intelgraph-prod`
- **Namespace**: `intelgraph-prod`
- **Load Balancer**: `https://maestro.intelgraph.ai`
- **Monitoring**: `https://grafana.intelgraph.ai`
- **Alerting**: Prometheus AlertManager

### Key Components

- **Control Plane**: `maestro-control-plane` deployment
- **Database**: PostgreSQL cluster + Neo4j + Redis
- **Storage**: Persistent volumes for data persistence
- **Ingress**: Nginx ingress controller
- **Monitoring**: Prometheus + Grafana + AlertManager

## 📊 Monitoring and Detection

### Health Check Endpoints

```bash
# Primary health check
curl -f https://maestro.intelgraph.ai/health

# Resilience status
curl -f https://maestro.intelgraph.ai/api/resilience/health

# Database health
curl -f https://maestro.intelgraph.ai/api/monitoring/databases
```

### Key Metrics to Monitor

- **Availability**: Target 99.9% uptime
- **Response Time**: 95th percentile < 500ms
- **Error Rate**: < 1% of requests
- **Database Connections**: < 80% of pool capacity
- **Circuit Breaker States**: All should be CLOSED

### Alert Conditions

- Service unavailable for > 1 minute
- Error rate > 5% for > 2 minutes
- Response time > 1s for > 3 minutes
- Database connection failures
- Circuit breakers tripping

## 🔄 Recovery Procedures

### Scenario 1: Complete Service Outage

#### Detection

- Health checks failing across all endpoints
- Users reporting complete inability to access system
- All monitoring dashboards showing red status

#### Immediate Actions (0-5 minutes)

1. **Acknowledge the incident**

   ```bash
   # Check overall system status
   kubectl get pods -n intelgraph-prod
   kubectl get services -n intelgraph-prod
   kubectl get ingress -n intelgraph-prod
   ```

2. **Check infrastructure status**

   ```bash
   # Check node health
   kubectl get nodes

   # Check cluster events
   kubectl get events -n intelgraph-prod --sort-by='.lastTimestamp'
   ```

3. **Verify database connectivity**
   ```bash
   # Check database pods
   kubectl get pods -l app=postgresql
   kubectl get pods -l app=neo4j
   kubectl get pods -l app=redis
   ```

#### Recovery Actions (5-15 minutes)

1. **Restart control plane if needed**

   ```bash
   kubectl rollout restart deployment/maestro-control-plane -n intelgraph-prod
   kubectl rollout status deployment/maestro-control-plane -n intelgraph-prod
   ```

2. **Check and restart databases if needed**

   ```bash
   # PostgreSQL
   kubectl rollout restart statefulset/postgresql -n intelgraph-prod

   # Neo4j
   kubectl rollout restart statefulset/neo4j -n intelgraph-prod

   # Redis
   kubectl rollout restart deployment/redis -n intelgraph-prod
   ```

3. **Verify ingress controller**
   ```bash
   kubectl get pods -n ingress-nginx
   kubectl rollout restart deployment/ingress-nginx-controller -n ingress-nginx
   ```

#### Verification (15-20 minutes)

```bash
# Run production readiness check
./scripts/ops/production-readiness-check.sh

# Check circuit breakers
curl https://maestro.intelgraph.ai/api/resilience/circuit-breakers

# Verify core functionality
curl -X POST https://maestro.intelgraph.ai/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ healthCheck }"}'
```

### Scenario 2: Database Connection Issues

#### Detection

- High database connection errors in logs
- Circuit breakers tripping for database operations
- Slow response times
- PostgreSQL/Neo4j/Redis connection failures

#### Immediate Actions

1. **Check database status**

   ```bash
   # PostgreSQL
   kubectl logs -l app=postgresql -n intelgraph-prod --tail=100

   # Neo4j
   kubectl logs -l app=neo4j -n intelgraph-prod --tail=100

   # Redis
   kubectl logs -l app=redis -n intelgraph-prod --tail=100
   ```

2. **Check connection pool status**

   ```bash
   # Via resilience endpoint
   curl https://maestro.intelgraph.ai/api/resilience/metrics | jq '.resilience'
   ```

3. **Reset circuit breakers if appropriate**

   ```bash
   # Reset PostgreSQL circuit breaker
   curl -X POST https://maestro.intelgraph.ai/api/resilience/circuit-breakers/postgres/reset

   # Reset Neo4j circuit breaker
   curl -X POST https://maestro.intelgraph.ai/api/resilience/circuit-breakers/neo4j/reset
   ```

#### Recovery Actions

1. **Scale database resources if needed**

   ```bash
   # Increase PostgreSQL resources
   kubectl patch statefulset postgresql -n intelgraph-prod -p '{"spec":{"template":{"spec":{"containers":[{"name":"postgresql","resources":{"requests":{"memory":"2Gi","cpu":"1000m"},"limits":{"memory":"4Gi","cpu":"2000m"}}}]}}}}'
   ```

2. **Clear connection backlogs**

   ```bash
   # Restart application pods to reset connections
   kubectl rollout restart deployment/maestro-control-plane -n intelgraph-prod
   ```

3. **Check for long-running queries**
   ```bash
   # Connect to PostgreSQL and check active queries
   kubectl exec -it postgresql-0 -n intelgraph-prod -- psql -U postgres -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';"
   ```

### Scenario 3: High Traffic / DDoS Attack

#### Detection

- Massive spike in request volume
- High CPU/memory usage
- Rate limiting being heavily triggered
- Slow response times despite healthy backends

#### Immediate Actions

1. **Check traffic patterns**

   ```bash
   # Check ingress logs
   kubectl logs -l app.kubernetes.io/name=ingress-nginx -n ingress-nginx | grep -E "(429|404|403)" | tail -100
   ```

2. **Review rate limiting**

   ```bash
   # Check rate limit metrics
   curl https://maestro.intelgraph.ai/api/resilience/metrics | jq '.resilience' | grep rate_limit
   ```

3. **Scale application horizontally**

   ```bash
   # Increase replica count
   kubectl scale deployment maestro-control-plane --replicas=10 -n intelgraph-prod

   # Check HPA status
   kubectl get hpa -n intelgraph-prod
   ```

#### Recovery Actions

1. **Implement additional rate limiting**

   ```bash
   # Apply stricter rate limiting configuration
   kubectl apply -f infra/k8s/security/rate-limiting.yaml
   ```

2. **Block malicious IPs if identified**
   ```bash
   # Create network policy to block specific IPs
   kubectl apply -f - <<EOF
   apiVersion: networking.k8s.io/v1
   kind: NetworkPolicy
   metadata:
     name: block-malicious-ips
     namespace: intelgraph-prod
   spec:
     podSelector:
       matchLabels:
         app.kubernetes.io/name: maestro
     ingress:
     - from:
       - ipBlock:
           cidr: 0.0.0.0/0
           except:
           - 10.0.0.0/8
           - MALICIOUS_IP/32
   EOF
   ```

### Scenario 4: Data Corruption / Data Loss

#### Detection

- Database consistency check failures
- Users reporting missing or corrupted data
- Backup verification failures
- Integrity check alerts

#### Immediate Actions (CRITICAL - Data Loss Prevention)

1. **Stop all writes immediately**

   ```bash
   # Scale down application to prevent further corruption
   kubectl scale deployment maestro-control-plane --replicas=0 -n intelgraph-prod

   # Put system in maintenance mode
   kubectl apply -f infra/k8s/maintenance/maintenance-mode.yaml
   ```

2. **Assess damage scope**

   ```bash
   # Run database integrity checks
   ./scripts/dr/database-integrity-check.sh

   # Check backup timestamps
   ./scripts/dr/verify-backups.sh
   ```

3. **Identify last known good state**

   ```bash
   # List available backups
   ./scripts/dr/list-backups.sh

   # Check backup integrity
   ./scripts/dr/verify-backup-integrity.sh --backup-id BACKUP_ID
   ```

#### Recovery Actions

1. **Restore from backup (if needed)**

   ```bash
   # Restore PostgreSQL from backup
   ./scripts/dr/restore-postgresql.sh --backup-id BACKUP_ID --target-time "2024-01-15 10:00:00"

   # Restore Neo4j from backup
   ./scripts/dr/restore-neo4j.sh --backup-id BACKUP_ID

   # Restore Redis from backup
   ./scripts/dr/restore-redis.sh --backup-id BACKUP_ID
   ```

2. **Verify data integrity post-restore**

   ```bash
   # Run comprehensive data validation
   ./scripts/dr/validate-restored-data.sh

   # Check referential integrity
   ./scripts/dr/check-data-consistency.sh
   ```

3. **Gradual service restoration**

   ```bash
   # Start with single replica
   kubectl scale deployment maestro-control-plane --replicas=1 -n intelgraph-prod

   # Verify functionality
   ./scripts/ops/production-readiness-check.sh

   # Scale up gradually
   kubectl scale deployment maestro-control-plane --replicas=3 -n intelgraph-prod
   ```

## 🔍 Post-Incident Procedures

### Immediate Post-Recovery (0-2 hours)

1. **Verify full functionality**
   - Run comprehensive health checks
   - Test critical user journeys
   - Verify data consistency
   - Check monitoring and alerting

2. **Update stakeholders**
   - Notify users of service restoration
   - Update status page
   - Inform management of resolution

3. **Document timeline**
   - Record incident start/end times
   - Document all actions taken
   - Note any temporary workarounds

### Follow-up Actions (2-24 hours)

1. **Root cause analysis**
   - Review logs and metrics
   - Identify contributing factors
   - Document lessons learned

2. **Fix underlying issues**
   - Implement permanent fixes
   - Update monitoring/alerting
   - Improve runbooks based on experience

3. **Communication**
   - Send post-incident report
   - Schedule post-mortem meeting
   - Update documentation

### Long-term Improvements (1-4 weeks)

1. **System hardening**
   - Implement preventive measures
   - Improve redundancy
   - Enhance monitoring

2. **Process improvements**
   - Update runbooks
   - Improve alert thresholds
   - Enhance training materials

## 📋 Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO)

### Service Level Targets

- **RTO (Recovery Time Objective)**: 15 minutes for critical services
- **RPO (Recovery Point Objective)**: 5 minutes maximum data loss
- **MTTR (Mean Time To Recovery)**: < 30 minutes
- **MTBF (Mean Time Between Failures)**: > 720 hours (30 days)

### Backup Schedule

- **Database backups**: Every 15 minutes (continuous WAL archiving)
- **Volume snapshots**: Every hour
- **Full system backup**: Daily at 2:00 AM UTC
- **Cross-region replication**: Real-time for critical data

## 🧪 Testing and Validation

### Disaster Recovery Drills

- **Monthly**: Database failover testing
- **Quarterly**: Full disaster recovery simulation
- **Semi-annually**: Cross-region failover testing
- **Annually**: Complete infrastructure rebuild

### Test Commands

```bash
# Test backup restore (non-production)
./scripts/dr/test-backup-restore.sh

# Simulate database failure
./scripts/dr/simulate-database-failure.sh

# Test circuit breaker functionality
./scripts/dr/test-circuit-breakers.sh

# Validate monitoring and alerting
./scripts/dr/test-monitoring-alerts.sh
```

## 📞 Communication Templates

### Incident Declaration

```
🚨 INCIDENT DECLARED - Maestro Conductor Production Issue

Severity: [CRITICAL/HIGH/MEDIUM]
Start Time: [TIMESTAMP]
Status: Investigating
Impact: [DESCRIPTION]

Actions Taken:
- [ACTION 1]
- [ACTION 2]

Next Update: [TIME]
Incident Commander: [NAME]
```

### Resolution Notification

```
✅ INCIDENT RESOLVED - Maestro Conductor Production

Incident Duration: [DURATION]
Root Cause: [BRIEF DESCRIPTION]
Resolution: [ACTIONS TAKEN]

Follow-up Actions:
- Post-incident review scheduled for [DATE]
- Preventive measures being implemented

Thank you for your patience during this incident.
```

---

## Quick Reference Commands

### Essential Commands

```bash
# Service status
kubectl get pods -n intelgraph-prod

# Health check
curl https://maestro.intelgraph.ai/health

# Circuit breaker status
curl https://maestro.intelgraph.ai/api/resilience/circuit-breakers

# Scale service
kubectl scale deployment maestro-control-plane --replicas=N -n intelgraph-prod

# View logs
kubectl logs -f deployment/maestro-control-plane -n intelgraph-prod

# Database status
kubectl get statefulsets -n intelgraph-prod

# Ingress status
kubectl get ingress -n intelgraph-prod
```

### Emergency Contacts Quick Dial

- **Production Team**: Extension 1001
- **SRE Team**: Extension 1002
- **Engineering Manager**: Extension 1003
- **Database Team**: Extension 1004

---

**Document Version**: 1.0
**Last Updated**: 2024-01-15
**Next Review**: 2024-04-15
**Owner**: SRE Team
**Approver**: Engineering Manager
