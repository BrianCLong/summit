# Release Captain Attestation Template

> **Document Type**: Production Release Approval
> **SOC 2 Control**: CC6.8 (Change Management)
> **Version**: 2.0
> **Last Updated**: 2025-12-27

## Purpose

This template documents the Release Captain's attestation that a production deployment meets all quality, security, and compliance requirements. This attestation is required for SOC 2 Type II compliance (Change Management control CC6.8).

---

## Release Information

**Release ID**: `[e.g., RELEASE-2025-12-27-001]`

**Release Type**: `[Major | Minor | Patch | Hotfix]`

**Target Environment**: `[Production | Staging | QA]`

**Scheduled Deployment Date/Time**: `[YYYY-MM-DD HH:MM UTC]`

**Git Tag/Commit**: `[e.g., v1.5.3 / commit SHA: a1b2c3d4]`

**Release Captain**: `[Full Name, Email]`

**Deployment Engineer**: `[Full Name, Email]`

**Approval Date**: `[YYYY-MM-DD]`

---

## Pre-Deployment Checklist

Release Captain must verify all items before approving deployment:

### Code Quality & Testing

- [ ] **All CI/CD pipeline checks passed**
  - [ ] Linting (ESLint/Prettier)
  - [ ] Type checking (TypeScript strict mode)
  - [ ] Unit tests (Jest) - 100% pass rate
  - [ ] Integration tests - 100% pass rate
  - [ ] E2E tests (Playwright) - 100% pass rate
  - [ ] Golden path smoke test - PASS

- [ ] **Code review completed**
  - [ ] All pull requests reviewed by 2+ engineers
  - [ ] No unresolved review comments
  - [ ] Security review completed (if applicable)

- [ ] **Test coverage meets minimum thresholds**
  - [ ] Overall coverage ≥ 80%
  - [ ] Critical path coverage ≥ 95%
  - [ ] New code coverage ≥ 85%

### Security & Compliance

- [ ] **Security scanning completed**
  - [ ] Gitleaks secret scan - PASS (no secrets detected)
  - [ ] Dependency vulnerability scan (Snyk/Trivy) - PASS
  - [ ] Container image scan - PASS
  - [ ] SBOM generated and attached
  - [ ] CodeQL static analysis - PASS

- [ ] **Production configuration validated**
  - [ ] No development secrets in production config
  - [ ] JWT secrets are production-grade (≥256-bit entropy)
  - [ ] Database passwords are unique and secure
  - [ ] CORS allowlist does not include localhost
  - [ ] Production config check script passed: `pnpm ci:prod-guard`

- [ ] **Compliance requirements met**
  - [ ] Audit logging enabled for all mutations
  - [ ] Provenance tracking operational
  - [ ] ABAC policies validated
  - [ ] Data classification enforcement active
  - [ ] Retention policies configured

### Deployment Readiness

- [ ] **Infrastructure validated**
  - [ ] Kubernetes manifests validated (`kubectl apply --dry-run`)
  - [ ] Helm charts linted and validated
  - [ ] Database migrations tested (dry-run + rollback)
  - [ ] Resource limits/quotas configured
  - [ ] Auto-scaling policies configured

- [ ] **Monitoring & Observability**
  - [ ] Health check endpoints verified
  - [ ] Prometheus metrics exporting
  - [ ] Grafana dashboards updated
  - [ ] Alert rules configured and tested
  - [ ] On-call rotation updated

- [ ] **Rollback Plan**
  - [ ] Rollback procedure documented
  - [ ] Rollback tested in staging environment
  - [ ] Database migration rollback tested
  - [ ] Estimated rollback time: `[e.g., < 10 minutes]`

### Documentation & Communication

- [ ] **Release notes prepared**
  - [ ] Changelog updated (CHANGELOG.md)
  - [ ] Breaking changes documented
  - [ ] Migration guide provided (if applicable)
  - [ ] API schema changes documented

- [ ] **Stakeholder communication**
  - [ ] Deployment notification sent to stakeholders
  - [ ] Maintenance window communicated (if applicable)
  - [ ] Support team briefed on changes
  - [ ] Customer-facing changes documented

---

## Change Summary

### Features Added

```
[List new features, e.g.:]
- Added entity search with fuzzy matching (FEAT-1234)
- Implemented real-time collaboration for investigations (FEAT-5678)
```

### Bug Fixes

```
[List bug fixes, e.g.:]
- Fixed Neo4j connection timeout during high load (BUG-9012)
- Resolved race condition in audit log writes (BUG-3456)
```

### Security Updates

```
[List security updates, e.g.:]
- Updated Apollo Server to v4.11.2 (CVE-2024-XXXX)
- Patched cryptographic library vulnerability
```

### Infrastructure Changes

```
[List infrastructure changes, e.g.:]
- Increased API server replicas from 3 to 5
- Added read replica for PostgreSQL
```

### Breaking Changes

```
[List breaking changes with migration path, e.g.:]
- BREAKING: GraphQL field `entity.metadata` renamed to `entity.properties`
  Migration: Update client queries to use new field name
```

---

## Testing Summary

### Automated Testing

| Test Suite       | Total Tests | Passed | Failed | Coverage |
| ---------------- | ----------- | ------ | ------ | -------- |
| Unit (Jest)      | 1,247       | 1,247  | 0      | 87%      |
| Integration      | 189         | 189    | 0      | 82%      |
| E2E (Playwright) | 47          | 47     | 0      | N/A      |
| Smoke Tests      | 12          | 12     | 0      | N/A      |

**Test Execution Time**: `[e.g., 8m 32s]`

**Test Environment**: `[e.g., CI/CD pipeline - GitHub Actions]`

### Manual Testing

- [ ] Golden path workflow tested end-to-end
- [ ] Performance testing completed (load test results attached)
- [ ] Cross-browser testing completed (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsiveness verified
- [ ] Accessibility testing (WCAG 2.1 AA compliance)

### Staging Environment Validation

- [ ] Deployed to staging: `[YYYY-MM-DD HH:MM UTC]`
- [ ] Staging smoke tests: PASS
- [ ] Staging soaked for minimum duration: `[e.g., 24 hours]`
- [ ] No critical issues detected in staging
- [ ] Performance metrics within acceptable range

---

## Risk Assessment

### Deployment Risk Level

**Overall Risk**: `[Low | Medium | High | Critical]`

### Risk Factors

| Risk Factor          | Severity | Mitigation                                 |
| -------------------- | -------- | ------------------------------------------ |
| Database migration   | Medium   | Tested rollback, backup taken              |
| Breaking API changes | Low      | Deprecated fields maintained for 1 release |
| Traffic spike        | Low      | Load tested to 2x normal traffic           |
| [Add more risks]     | ...      | ...                                        |

### Rollback Triggers

Release Captain will initiate rollback if:

- [ ] Golden path smoke test fails in production
- [ ] Error rate exceeds 1% for ≥ 5 minutes
- [ ] Latency (p95) exceeds 2000ms for ≥ 5 minutes
- [ ] Database migration fails
- [ ] Critical security vulnerability discovered
- [ ] [Other trigger: specify]

---

## Deployment Plan

### Pre-Deployment (T-60 minutes)

- [ ] **T-60**: Final stakeholder notification sent
- [ ] **T-45**: Database backup completed and verified
- [ ] **T-30**: Deployment window begins (low-traffic period)
- [ ] **T-15**: Final staging validation
- [ ] **T-10**: On-call engineer standing by
- [ ] **T-5**: Monitoring dashboards open
- [ ] **T-0**: Deployment initiated

### Deployment Sequence

1. **Database Migrations** (if applicable)
   - [ ] Run migrations in read-only mode (validation)
   - [ ] Run migrations in write mode
   - [ ] Verify migration success
   - [ ] Estimated duration: `[e.g., 5 minutes]`

2. **Application Deployment**
   - [ ] Deploy to Kubernetes cluster (rolling update)
   - [ ] Monitor pod startup and health checks
   - [ ] Verify new pods are receiving traffic
   - [ ] Estimated duration: `[e.g., 10 minutes]`

3. **Cache Invalidation** (if applicable)
   - [ ] Invalidate Redis cache keys
   - [ ] Warm up cache with critical queries
   - [ ] Estimated duration: `[e.g., 2 minutes]`

### Post-Deployment (T+60 minutes)

- [ ] **T+5**: Health checks passing
- [ ] **T+10**: Smoke tests executed in production
- [ ] **T+15**: Metrics review (error rate, latency, throughput)
- [ ] **T+30**: User acceptance spot check
- [ ] **T+60**: Deployment declared successful
- [ ] **T+120**: Post-deployment monitoring report

---

## Success Criteria

Deployment is considered successful when all criteria are met:

- [ ] All health checks return `200 OK`
- [ ] Golden path smoke test passes in production
- [ ] Error rate < 0.1% for 60 minutes post-deployment
- [ ] Latency (p95) < 1000ms for 60 minutes post-deployment
- [ ] No critical alerts triggered
- [ ] Database migrations completed successfully
- [ ] No rollback required

---

## Attestation

I, the undersigned Release Captain, hereby attest that:

1. ✅ All items in the pre-deployment checklist have been verified
2. ✅ All automated tests have passed with 100% success rate
3. ✅ Security scans show no critical or high-severity vulnerabilities
4. ✅ Production configuration has been validated (no dev secrets)
5. ✅ Rollback plan has been tested and is ready for execution
6. ✅ Stakeholders have been notified and briefed
7. ✅ Deployment plan has been reviewed and approved
8. ✅ On-call engineer is available for incident response

I approve this release for production deployment.

**Release Captain Signature**:

```
Name: [Full Name]
Title: [Engineering Manager | Tech Lead | Senior Engineer]
Email: [email@intelgraph.io]
Date: [YYYY-MM-DD]
Digital Signature: [PGP/GPG signature or DocuSign link]
```

---

## Approvals

### Required Approvals

- [ ] **Engineering Manager**: `[Name, Date, Signature]`
- [ ] **Security Lead**: `[Name, Date, Signature]` (if security changes)
- [ ] **Compliance Officer**: `[Name, Date, Signature]` (if compliance impact)
- [ ] **Product Owner**: `[Name, Date, Signature]` (if breaking changes)

### Conditional Approvals

- [ ] **Database Administrator**: `[Name, Date, Signature]` (if DB migrations)
- [ ] **Infrastructure Lead**: `[Name, Date, Signature]` (if infrastructure changes)
- [ ] **Customer Success Lead**: `[Name, Date, Signature]` (if customer impact)

---

## Post-Deployment Report

To be completed within 24 hours of deployment:

### Deployment Outcome

**Status**: `[Success | Partial Success | Rollback Required]`

**Deployment Start**: `[YYYY-MM-DD HH:MM UTC]`

**Deployment End**: `[YYYY-MM-DD HH:MM UTC]`

**Total Duration**: `[e.g., 17 minutes]`

### Metrics Summary (First 24 hours)

| Metric        | Target     | Actual   | Status |
| ------------- | ---------- | -------- | ------ |
| Availability  | 99.9%      | [%]      | ✅/❌  |
| Error Rate    | < 0.1%     | [%]      | ✅/❌  |
| Latency (p95) | < 1000ms   | [ms]     | ✅/❌  |
| Throughput    | [baseline] | [actual] | ✅/❌  |

### Issues Encountered

```
[List any issues encountered during deployment, e.g.:]
- None (smooth deployment)
OR
- Minor: Pod startup took 2 minutes longer than expected (DNS propagation delay)
```

### Lessons Learned

```
[Document lessons learned for future deployments, e.g.:]
- Pre-warm cache before switching traffic to reduce initial latency spike
- Add health check for external API dependency (OFAC watchlist)
```

### Follow-Up Actions

- [ ] `[Action item 1, Owner, Due Date]`
- [ ] `[Action item 2, Owner, Due Date]`

---

## Audit Trail

**Document Created**: `[YYYY-MM-DD HH:MM UTC]`

**Document Last Modified**: `[YYYY-MM-DD HH:MM UTC]`

**Modifications**:

- `[YYYY-MM-DD]`: Initial creation by `[Name]`
- `[YYYY-MM-DD]`: Approval signatures added by `[Name]`
- `[YYYY-MM-DD]`: Post-deployment report completed by `[Name]`

**Retention Period**: 7 years (per DOD requirements)

**Document Location**: `/audit/attestations/release-[RELEASE-ID].md`

**Related Documents**:

- Release notes: `/docs/releases/RELEASE-[version].md`
- Deployment runbook: `/docs/RUNBOOKS/production-deployment.md`
- Rollback procedure: `/docs/RUNBOOKS/rollback-procedure.md`
- CI/CD pipeline run: `[GitHub Actions workflow URL]`

---

## Compliance Mapping

This attestation satisfies the following SOC 2 controls:

| Control | Description                     | Evidence                                  |
| ------- | ------------------------------- | ----------------------------------------- |
| CC6.8   | Change Management               | Complete deployment checklist + approvals |
| CC7.1   | System Operations               | Health checks + smoke tests               |
| CC7.2   | Incident Management             | Rollback plan + monitoring                |
| A1.1    | Availability Commitments        | Performance metrics + SLO tracking        |
| PI1.4   | Processing Integrity Monitoring | Smoke tests + validation                  |

---

## Template Usage Instructions

### For Release Captains

1. **Copy this template** for each production deployment
2. **Fill in all sections** marked with `[brackets]`
3. **Check all checkboxes** as you verify each item
4. **Collect digital signatures** from required approvers
5. **Archive completed attestation** in `/audit/attestations/`
6. **Update post-deployment report** within 24 hours

### For Auditors

This document provides evidence of:

- Change management process adherence (CC6.8)
- Pre-deployment validation and testing
- Security and compliance verification
- Rollback capability and disaster recovery readiness
- Multi-level approval workflow
- Post-deployment monitoring and success validation

### Document Naming Convention

```
release-[YYYY-MM-DD]-[sequence]-[environment].md

Examples:
- release-2025-12-27-001-production.md
- release-2025-12-27-002-production.md (hotfix)
- release-2025-12-28-001-staging.md
```

---

**Template Version**: 2.0
**Template Owner**: Engineering Operations
**Next Review Date**: 2026-06-30
