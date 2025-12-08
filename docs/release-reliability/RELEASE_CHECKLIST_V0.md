# CompanyOS Release Checklist v0

> **Version**: 0.1.0
> **Effective Date**: 2025-12-06
> **Owner**: Reliability & Release Team

This checklist ensures every release follows the safe path. Complete all applicable items before promoting to production.

---

## Pre-Flight Checks

### 1. Code Readiness

- [ ] All CI checks passing (build, lint, typecheck)
- [ ] Unit test coverage meets threshold (Tier1: 80%, Tier2: 70%, Tier3: 60%)
- [ ] Integration tests passing
- [ ] Golden path smoke test passing (`make smoke`)
- [ ] No `.only()` or `.skip()` in test files
- [ ] PR approved by required reviewers
- [ ] Commit messages follow conventional commits

### 2. Security Verification

- [ ] No critical CVEs (Trivy scan)
- [ ] No high CVEs for production deployments
- [ ] No secrets detected (Gitleaks scan)
- [ ] Container image signed (Cosign)
- [ ] SLSA attestation level ≥ 3 (production)
- [ ] Dependency review passed (no GPL for production)
- [ ] SBOM generated and attested

### 3. SLO Health

- [ ] Error budget remaining > 20% (or SRE approval obtained)
- [ ] No fast burn alerts active (burn rate < 2x)
- [ ] No active P1 or P2 incidents affecting this service
- [ ] No rollbacks in last 24 hours (or investigation completed)

### 4. Deployment Context

- [ ] Within deployment window (Mon-Thu 09:00-16:00)
- [ ] No active deployment freeze
- [ ] Release Captain available and online
- [ ] Rollback plan documented and tested
- [ ] Monitoring dashboards accessible

---

## Database Migration Checklist

*Complete if release includes database changes*

### Schema Changes

- [ ] Migration script tested in staging
- [ ] Rollback migration script prepared and tested
- [ ] Migration is backward-compatible (or coordinated with app changes)
- [ ] Migration estimated duration documented
- [ ] DBA review completed for large tables
- [ ] Backup taken before migration

### Data Migrations

- [ ] Data migration tested with production-like dataset
- [ ] Data integrity checks defined
- [ ] Performance impact assessed
- [ ] Rollback data migration script available

---

## Feature Flag Checklist

*Complete if release uses feature flags*

- [ ] Feature flag configured in LaunchDarkly/config
- [ ] Initial rollout percentage set (recommend: 1-5%)
- [ ] Kill switch tested and documented
- [ ] Metrics tracking configured for flag
- [ ] Gradual rollout plan documented
- [ ] Flag cleanup ticket created for post-GA

---

## Deployment Execution

### 5. Pre-Deployment

- [ ] Notify #deployments Slack channel
- [ ] Verify target environment is healthy
- [ ] Confirm correct image tag/version
- [ ] Review deployment diff (`helm diff` or `kubectl diff`)

### 6. Canary Phase

- [ ] Canary deployed successfully
- [ ] Health checks passing on canary pods
- [ ] No error rate increase (< 2% error rate)
- [ ] Latency within SLO (p95 < threshold)
- [ ] No anomalies detected
- [ ] Synthetic checks passing

### 7. Progressive Rollout

For Tier 1 services (Progressive Canary):

| Traffic % | Duration | Checks Required |
|-----------|----------|-----------------|
| 1% | 1 min | Smoke check |
| 10% | 5 min | SLO burn, error budget |
| 25% | 10 min | SLO burn, synthetic |
| 50% | 15 min | SLO burn, anomaly detection |
| 100% | - | Final validation |

- [ ] 1% traffic: smoke check passed
- [ ] 10% traffic: SLO burn check passed
- [ ] 25% traffic: synthetic check passed
- [ ] 50% traffic: anomaly check passed
- [ ] 100% traffic: deployment complete

For Tier 2 services (Standard Canary):

| Traffic % | Duration | Checks Required |
|-----------|----------|-----------------|
| 10% | 2 min | Quick health |
| 50% | 3 min | SLO burn |
| 100% | - | Final validation |

- [ ] 10% traffic: health check passed
- [ ] 50% traffic: SLO burn check passed
- [ ] 100% traffic: deployment complete

---

## Post-Deployment Verification

### 8. Health Validation

- [ ] All pods healthy and ready
- [ ] Health endpoint returning 200 (`/health`, `/readyz`, `/healthz`)
- [ ] No crash loops or restarts
- [ ] Resource usage within limits (CPU < 70%, Memory < 75%)

### 9. Functional Validation

- [ ] Golden path test passing
- [ ] Synthetic monitoring green
- [ ] No new errors in logs (check last 5 minutes)
- [ ] Key business metrics normal

### 10. SLO Validation

- [ ] Error rate within SLO
- [ ] Latency within SLO
- [ ] No error budget consumption spike
- [ ] Grafana dashboard shows healthy metrics

---

## Rollback Triggers

Immediately rollback if any of these occur:

| Trigger | Threshold | Auto/Manual |
|---------|-----------|-------------|
| Error rate spike | > 5% | Automatic |
| Latency p95 | > 500ms sustained 2min | Automatic |
| Health check failures | > 50% pods failing | Automatic |
| Golden path broken | Test failing | Manual |
| Customer reports | Multiple complaints | Manual |
| SLO burn rate | > 5x for 5 minutes | Automatic |

### Rollback Procedure

```bash
# 1. Abort current rollout
kubectl argo rollouts abort <service> -n production

# 2. Rollback to previous revision
kubectl argo rollouts undo <service> -n production

# 3. Verify rollback
kubectl argo rollouts status <service> -n production

# 4. Confirm health
curl -sf http://<service>:4000/health
```

---

## Post-Release Tasks

### 11. Documentation

- [ ] Release notes updated (if applicable)
- [ ] CHANGELOG updated
- [ ] API documentation updated (if API changed)
- [ ] Runbook updated (if operational changes)

### 12. Communication

- [ ] #deployments channel notified of completion
- [ ] Stakeholders informed of new features
- [ ] On-call briefed on changes (if significant)

### 13. Cleanup

- [ ] Feature flag cleanup scheduled (if applicable)
- [ ] Old deployment artifacts cleaned up
- [ ] Temporary resources removed
- [ ] Monitoring alerts tuned (if needed)

---

## Emergency Release Checklist

*Use only for P0/P1 hotfixes with explicit approval*

### Emergency Prerequisites

- [ ] P0/P1 incident ticket created
- [ ] Emergency override approved by: ________________
- [ ] Incident ID: ________________
- [ ] Reason documented: ________________

### Abbreviated Checks

- [ ] Build passing
- [ ] Unit tests passing (critical paths)
- [ ] No new critical CVEs
- [ ] Secret scan clean
- [ ] Fix verified in staging (or bypass approved)

### Emergency Deployment

- [ ] `/emergency-on "<reason>"` executed
- [ ] Canary deployed (can use accelerated timeline)
- [ ] Basic health verified
- [ ] Full rollout completed
- [ ] `/emergency-off` executed

### Emergency Post-Mortem

- [ ] Post-incident review scheduled within 24 hours
- [ ] Blameless postmortem documented
- [ ] Follow-up items tracked
- [ ] Process improvements identified

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Release Captain | | | |
| Developer | | | |
| SRE (if Tier 1) | | | |

---

## Quick Reference

### Key Commands

```bash
# Check release gate status
opa eval -d policies/release_gate.rego -i input.json "data.companyos.release.decision"

# Start deployment
kubectl argo rollouts set image <service> api=<image>:<tag>

# Check status
kubectl argo rollouts status <service> -n production

# Promote canary
kubectl argo rollouts promote <service> -n production

# Abort rollout
kubectl argo rollouts abort <service> -n production

# Rollback
kubectl argo rollouts undo <service> -n production
```

### Key URLs

| Resource | URL |
|----------|-----|
| Grafana Dashboard | http://grafana:3001/d/slo-overview |
| Prometheus | http://prometheus:9090 |
| Argo Rollouts | http://argo-rollouts:3100 |
| GitHub Actions | https://github.com/BrianCLong/summit/actions |

### Contact

| Role | Slack | PagerDuty |
|------|-------|-----------|
| Release Captain | #release-captain | @release-oncall |
| SRE Team | #sre-team | @sre-oncall |
| On-Call Engineer | #incidents | @oncall |

---

*Checklist version 0.1.0 - Review and update quarterly*
