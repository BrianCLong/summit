# Maestro UI Production Runbooks

## Overview

This document provides comprehensive operational procedures for managing the Maestro UI in production environments. These runbooks ensure consistent, reliable operations and rapid incident response.

## Table of Contents

1. [Deployment Procedures](#deployment-procedures)
2. [Incident Response](#incident-response)
3. [Performance Troubleshooting](#performance-troubleshooting)
4. [Security Incident Response](#security-incident-response)
5. [SLO Management](#slo-management)
6. [Disaster Recovery](#disaster-recovery)
7. [Routine Maintenance](#routine-maintenance)

## Deployment Procedures

### Standard Deployment Process

#### Pre-Deployment Checklist

```bash
# 1. Verify all tests pass
npm run test
npm run test:a11y
npm run test:perf

# 2. Security scan
npm audit --audit-level moderate
./scripts/security-scan.sh

# 3. Performance validation
npm run bundle:check
lighthouse-ci

# 4. Dependency verification
npm run supply-chain:verify
```

#### Production Deployment Steps

```bash
# 1. Create deployment branch
git checkout -b deploy/v$(date +%Y%m%d-%H%M%S)

# 2. Build production assets
npm run build:maestro
npm run build:analyze

# 3. Run pre-deployment smoke tests
./scripts/pre-deploy-tests.sh

# 4. Deploy to staging
./scripts/deploy-staging.sh

# 5. Run integration tests
./scripts/integration-tests.sh

# 6. Deploy to production (blue-green)
./scripts/deploy-production.sh --strategy=blue-green

# 7. Validate deployment
./scripts/post-deploy-validation.sh

# 8. Switch traffic (if blue-green successful)
./scripts/switch-traffic.sh
```

### Rollback Procedures

#### Immediate Rollback (< 5 minutes)

```bash
# Emergency rollback to previous version
./scripts/emergency-rollback.sh

# Verify rollback successful
curl -f https://maestro.intelgraph.io/health
./scripts/validate-rollback.sh
```

#### Planned Rollback (15-30 minutes)

```bash
# 1. Stop new deployments
./scripts/deployment-freeze.sh

# 2. Drain current traffic
./scripts/drain-traffic.sh --timeout=300

# 3. Rollback to stable version
./scripts/rollback.sh --version=${LAST_STABLE_VERSION}

# 4. Validate rollback
./scripts/post-rollback-validation.sh

# 5. Resume normal operations
./scripts/resume-deployments.sh
```

## Incident Response

### Severity Levels

#### P0 - Critical (15 minutes response)

- Complete service outage
- Data loss or corruption
- Security breach
- SLO breach > 50%

#### P1 - High (1 hour response)

- Partial service degradation
- Performance issues affecting users
- SLO breach > 20%
- Non-critical security issues

#### P2 - Medium (4 hours response)

- Minor feature issues
- Performance degradation < 20%
- Documentation errors

### P0 Incident Response Process

#### Immediate Actions (0-15 minutes)

```bash
# 1. Acknowledge incident
./scripts/incident-ack.sh --severity=P0 --oncall=$(whoami)

# 2. Establish war room
slack-cli send "#maestro-incidents" "P0 INCIDENT: Brief description"

# 3. Initial triage
./scripts/health-check.sh --full
./scripts/error-rate-check.sh --last=15m
./scripts/slo-status.sh

# 4. Page additional responders if needed
./scripts/page-sre.sh --incident-id=${INCIDENT_ID}
```

#### Diagnosis Phase (15-45 minutes)

```bash
# Check system health
kubectl get pods -n maestro
kubectl logs -n maestro deployment/maestro-ui --tail=1000

# Check infrastructure
./scripts/infra-health.sh
./scripts/database-health.sh
./scripts/cdn-health.sh

# Check external dependencies
./scripts/dependency-health.sh

# Review recent changes
git log --oneline --since="2 hours ago"
./scripts/recent-deployments.sh
```

#### Resolution Phase (45+ minutes)

```bash
# Apply immediate fixes
./scripts/emergency-patch.sh --issue=${ROOT_CAUSE}

# Implement workaround if needed
./scripts/implement-workaround.sh --type=${WORKAROUND_TYPE}

# Verify resolution
./scripts/validate-fix.sh --incident-id=${INCIDENT_ID}

# Update stakeholders
./scripts/incident-update.sh --status="Resolved" --summary="..."
```

### Common Incident Types

#### High Error Rate

```bash
# Check error patterns
kubectl logs -n maestro deployment/maestro-ui | grep "ERROR" | tail -100

# Review recent deployments
./scripts/recent-deployments.sh --last=2h

# Check database performance
./scripts/db-performance-check.sh

# Review rate limiting
./scripts/rate-limit-status.sh

# If deployment related: rollback
./scripts/emergency-rollback.sh
```

#### Performance Degradation

```bash
# Check resource utilization
kubectl top pods -n maestro
./scripts/resource-usage.sh

# Review CDN performance
./scripts/cdn-performance.sh

# Check database slow queries
./scripts/slow-query-analysis.sh

# Analyze traffic patterns
./scripts/traffic-analysis.sh --last=1h

# Scale if needed
kubectl scale deployment/maestro-ui --replicas=6
```

#### Authentication Issues

```bash
# Check SSO provider status
./scripts/sso-health-check.sh --provider=all

# Review authentication logs
kubectl logs -n maestro deployment/maestro-ui | grep "auth"

# Check JWT token validation
./scripts/jwt-validation-test.sh

# Verify certificate validity
./scripts/cert-check.sh --domain=maestro.intelgraph.io

# Test authentication flow
./scripts/auth-flow-test.sh --user=test@intelgraph.io
```

## Performance Troubleshooting

### Performance Monitoring

#### Core Web Vitals Analysis

```bash
# Check current performance metrics
./scripts/core-web-vitals.sh

# Historical performance trends
./scripts/performance-trends.sh --days=7

# Bundle analysis
./scripts/bundle-analysis.sh

# CDN cache hit rates
./scripts/cdn-analysis.sh
```

#### Backend Performance

```bash
# API response times
./scripts/api-performance.sh --endpoint=/api/maestro/v1/runs

# Database query performance
./scripts/db-query-analysis.sh

# Memory usage patterns
kubectl top pods -n maestro --sort-by=memory

# CPU utilization
kubectl top pods -n maestro --sort-by=cpu
```

### Performance Optimization

#### Frontend Optimization

```bash
# Bundle size optimization
npm run bundle:analyze
npm run bundle:optimize

# Code splitting verification
./scripts/code-splitting-check.sh

# Cache optimization
./scripts/cache-optimization.sh

# Image optimization
./scripts/image-optimization.sh
```

#### Backend Optimization

```bash
# Database optimization
./scripts/db-optimize.sh

# Query optimization
./scripts/optimize-slow-queries.sh

# Connection pool tuning
./scripts/tune-connection-pool.sh

# Memory optimization
./scripts/memory-optimization.sh
```

## Security Incident Response

### Security Incident Types

#### Suspected Breach

```bash
# Immediate containment
./scripts/security-lockdown.sh --level=high

# Evidence collection
./scripts/collect-security-evidence.sh --incident=${INCIDENT_ID}

# Check for data exfiltration
./scripts/data-access-audit.sh --window=24h

# Review authentication logs
./scripts/auth-audit.sh --suspicious-only

# Notify security team
./scripts/notify-security-team.sh --incident=${INCIDENT_ID}
```

#### Vulnerability Disclosure

```bash
# Assess vulnerability severity
./scripts/vulnerability-assessment.sh --cve=${CVE_ID}

# Check if system affected
./scripts/vulnerability-check.sh --component=${COMPONENT}

# Plan remediation
./scripts/create-remediation-plan.sh --vulnerability=${CVE_ID}

# Apply security patches
./scripts/apply-security-patches.sh --emergency
```

#### Failed Authentication Spike

```bash
# Check for brute force attacks
./scripts/brute-force-detection.sh --threshold=100

# Review IP patterns
./scripts/ip-analysis.sh --suspicious-auth

# Apply rate limiting
./scripts/increase-rate-limits.sh --auth-endpoints

# Block suspicious IPs
./scripts/block-ips.sh --from-analysis

# Monitor continued attempts
./scripts/monitor-auth-attempts.sh --duration=1h
```

## SLO Management

### SLO Monitoring

#### Check SLO Status

```bash
# Current SLO compliance
./scripts/slo-status.sh --all

# Error budget consumption
./scripts/error-budget-status.sh

# SLO trend analysis
./scripts/slo-trends.sh --period=7d

# Burn rate analysis
./scripts/burn-rate-analysis.sh
```

#### SLO Breach Response

```bash
# P0: SLO breach > 50%
./scripts/slo-breach-response.sh --severity=P0 --slo=${SLO_NAME}

# Identify root cause
./scripts/slo-root-cause.sh --slo=${SLO_NAME} --window=2h

# Implement immediate fixes
./scripts/slo-immediate-fix.sh --issue=${ROOT_CAUSE}

# Update error budget
./scripts/update-error-budget.sh --slo=${SLO_NAME}
```

### SLO Maintenance

#### Monthly SLO Review

```bash
# Generate SLO report
./scripts/slo-monthly-report.sh --month=$(date +%Y-%m)

# Review SLO targets
./scripts/slo-target-review.sh

# Update SLO configurations
./scripts/update-slo-config.sh --based-on-review

# Stakeholder communication
./scripts/slo-stakeholder-update.sh --month=$(date +%Y-%m)
```

## Disaster Recovery

### Backup Procedures

#### Database Backup

```bash
# Create full backup
./scripts/db-backup.sh --type=full --retention=30d

# Verify backup integrity
./scripts/verify-backup.sh --backup-id=${BACKUP_ID}

# Test restore procedure
./scripts/test-restore.sh --backup=${LATEST_BACKUP} --target=staging
```

#### Application Backup

```bash
# Configuration backup
./scripts/backup-config.sh --include-secrets=false

# Static assets backup
./scripts/backup-static-assets.sh

# Code repository backup
./scripts/backup-repository.sh --include-lfs
```

### Recovery Procedures

#### Database Recovery

```bash
# Stop application servers
./scripts/stop-app-servers.sh

# Restore from backup
./scripts/restore-database.sh --backup=${BACKUP_ID} --point-in-time=${TIMESTAMP}

# Verify data integrity
./scripts/verify-data-integrity.sh

# Restart application servers
./scripts/start-app-servers.sh

# Validate application functionality
./scripts/validate-app-functionality.sh
```

#### Full System Recovery

```bash
# Provision new infrastructure
./scripts/provision-dr-infrastructure.sh

# Restore database
./scripts/restore-database.sh --backup=${LATEST_BACKUP}

# Deploy application
./scripts/deploy-from-backup.sh --version=${LAST_KNOWN_GOOD}

# Restore configuration
./scripts/restore-configuration.sh

# Switch DNS to DR site
./scripts/switch-dns-to-dr.sh

# Validate full functionality
./scripts/full-system-validation.sh
```

### RTO/RPO Validation

```bash
# Measure Recovery Time Objective
./scripts/measure-rto.sh --start-time=${DISASTER_START} --end-time=${RECOVERY_COMPLETE}

# Measure Recovery Point Objective
./scripts/measure-rpo.sh --disaster-time=${DISASTER_TIMESTAMP} --last-backup=${BACKUP_TIMESTAMP}

# Generate DR report
./scripts/dr-report.sh --incident=${DR_INCIDENT_ID}
```

## Routine Maintenance

### Daily Tasks

```bash
# Health checks
./scripts/daily-health-check.sh

# Backup verification
./scripts/verify-daily-backups.sh

# Security scan
./scripts/daily-security-scan.sh

# Performance metrics
./scripts/daily-performance-report.sh
```

### Weekly Tasks

```bash
# Dependency updates
./scripts/check-dependency-updates.sh
./scripts/apply-security-updates.sh

# Performance analysis
./scripts/weekly-performance-analysis.sh

# SLO review
./scripts/weekly-slo-review.sh

# Capacity planning
./scripts/capacity-planning-analysis.sh
```

### Monthly Tasks

```bash
# Security review
./scripts/monthly-security-review.sh

# Performance optimization
./scripts/monthly-performance-optimization.sh

# DR testing
./scripts/monthly-dr-test.sh

# Documentation updates
./scripts/update-runbook-docs.sh

# Cost optimization
./scripts/monthly-cost-analysis.sh
```

## Emergency Contacts

### On-Call Escalation

1. **Primary On-Call:** Slack @maestro-oncall
2. **SRE Escalation:** Slack @sre-escalation
3. **Security Team:** security@intelgraph.io
4. **Engineering Manager:** Slack @maestro-mgmt

### External Contacts

- **Cloud Provider Support:** [Provider-specific emergency contact]
- **CDN Support:** [CDN provider support]
- **Security Vendor:** [Security vendor contact]

## Tools and Links

### Monitoring Dashboards

- **Application Metrics:** https://grafana.intelgraph.io/d/maestro-overview
- **SLO Dashboard:** https://grafana.intelgraph.io/d/maestro-slo
- **Error Rate:** https://grafana.intelgraph.io/d/maestro-errors
- **Performance:** https://grafana.intelgraph.io/d/maestro-performance

### Alerting Channels

- **Critical Alerts:** #maestro-critical
- **Warning Alerts:** #maestro-warnings
- **Info Alerts:** #maestro-info

### Documentation

- **Architecture:** /docs/maestro/architecture.md
- **API Documentation:** https://api.intelgraph.io/maestro/docs
- **User Guide:** /docs/maestro/user-guide.md

---

_This runbook is a living document and should be updated based on operational experience and system changes. Review quarterly and after major incidents._

**Last Updated:** September 2, 2025  
**Next Review:** December 2, 2025  
**Document Owner:** SRE Team
