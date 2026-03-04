# Rollback Plan

## Overview
This document outlines the rollback procedures for Summit platform deployments.

## Rollback Decision Criteria
- Error rate exceeds 5% threshold
- Critical functionality is broken
- Data integrity issues detected
- Security vulnerability discovered
- Customer-impacting performance degradation

## Rollback Procedures

### Kubernetes Rollback
```bash
kubectl rollout undo deployment/summit-api -n production
kubectl rollout undo deployment/summit-worker -n production
```

### Database Rollback
1. Stop application traffic
2. Restore from pre-deployment snapshot
3. Verify data integrity
4. Resume traffic

### Feature Flag Rollback
1. Disable new feature flags in LaunchDarkly
2. Verify feature is disabled for all users
3. Monitor for residual effects

## Communication Plan
1. Notify on-call team via PagerDuty
2. Update status page
3. Send internal Slack notification
4. Prepare customer communication if needed

## Post-Rollback Actions
1. Document root cause
2. Create incident report
3. Plan remediation
4. Schedule post-mortem

## Contacts
- On-call: Check PagerDuty schedule
- Platform Lead: See internal directory
- Security: security@example.com
