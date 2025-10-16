# 🚢 Release Captain Verification Playbook

This playbook provides comprehensive verification procedures for the Release Captain system to ensure it's functioning correctly in production.

## 🎯 Overview

Release Captain is an intelligent PR review and auto-merge system that enforces quality gates, security policies, and deployment safety. This playbook covers:

- Pre-deployment verification
- Golden PR test scenarios
- Emergency procedures
- Troubleshooting guide

## 📋 Pre-Deployment Checklist

### 1. Infrastructure Prerequisites

- [ ] GitHub Actions runners are healthy
- [ ] OPA binary is installed and accessible
- [ ] Gitleaks is configured with proper license
- [ ] Node.js v20.11.1 and pnpm v9.6.0 are available
- [ ] Required GitHub tokens have proper permissions
- [ ] Branch protection rules are configured

### 2. Configuration Validation

```bash
# Verify OPA policies
opa test .github/policies/

# Validate GitHub workflows
gh workflow list --all

# Check audit allowlist format
cat .github/audit-allowlist.json | jq .

# Verify safety circuit configuration
.github/scripts/safety-circuit.js status
```

### 3. Security Configuration

- [ ] Gitleaks configuration is up to date
- [ ] SARIF upload permissions are granted
- [ ] Secret scanning is enabled
- [ ] Dependency audit thresholds are configured
- [ ] CODEOWNERS file is properly configured

## 🧪 Golden PR Test Suite

The Golden PR test suite validates Release Captain functionality with carefully crafted scenarios.

### Running the Test Suite

```bash
# Dry run (recommended first)
.github/scripts/golden-pr-test.js --dry-run --verbose

# Full test execution
.github/scripts/golden-pr-test.js

# CI integration
gh workflow run golden-pr-tests.yml
```

### Test Scenarios

#### 1. Low Risk Frontend Change

**Expected**: Auto-approved and merged

- Simple component addition
- Tests included
- No breaking changes
- Clean build and lint

#### 2. Medium Risk Backend Change

**Expected**: Approved with additional checks

- API endpoint modification
- Database interactions
- Integration tests required
- Code owner approval needed

#### 3. High Risk Migration

**Expected**: Requires migration review

- Database schema changes
- Manual review flag required
- Extended testing gates
- Rollback plan validation

#### 4. Security Violation

**Expected**: Blocked immediately

- Hardcoded secrets detected
- Gitleaks findings
- Policy violations
- Manual intervention required

#### 5. Failing Tests

**Expected**: Blocked until fixed

- Unit test failures
- Build errors
- Quality gate failures
- Auto-fix attempts if enabled

## ⚡ Emergency Procedures

### Emergency Override

When critical hotfixes need to bypass normal gates:

```bash
# Enable emergency mode
.github/scripts/safety-circuit.js emergency-on "P0 production outage"

# Apply emergency label to PR
gh pr edit PR_NUMBER --add-label emergency-hotfix

# Trigger Release Captain with override
/merge-pr PR_NUMBER --emergency
```

### Circuit Breaker Management

```bash
# Check circuit status
.github/scripts/safety-circuit.js status

# Reset circuit after incident resolution
.github/scripts/safety-circuit.js reset

# Manual failure recording (for testing)
.github/scripts/safety-circuit.js record-failure
```

### Auto-Rollback Procedures

If automatic rollback is triggered:

1. **Immediate Response**
   - Check #incidents channel for auto-generated issue
   - Verify rollback completion in deployment logs
   - Confirm service health metrics

2. **Investigation**
   - Review rollback trigger cause
   - Analyze deployment metrics
   - Check error logs and traces

3. **Resolution**
   - Fix root cause in separate PR
   - Test thoroughly in staging
   - Plan forward deployment

## 🔧 Troubleshooting Guide

### Common Issues

#### Release Captain Not Triggering

```bash
# Check workflow status
gh run list --workflow=release-captain.yml

# Verify trigger conditions
gh pr view PR_NUMBER --json author,draft,mergeable

# Check authorization
gh api /repos/OWNER/REPO/collaborators/USERNAME/permission
```

#### Quality Gates Failing

```bash
# Check specific gate logs
gh run view RUN_ID --log

# Validate local environment
pnpm run build
pnpm run typecheck
pnpm run lint
pnpm run test

# Fix common issues
pnpm run lint --fix
pnpm run format
```

#### OPA Policy Evaluation Errors

```bash
# Test policy locally
opa eval -d .github/policies -i test-input.json "data.summit.release.decision"

# Validate policy syntax
opa fmt .github/policies/release.rego

# Debug policy logic
opa test .github/policies/ -v
```

#### Safety Circuit Issues

```bash
# Check circuit state
.github/scripts/safety-circuit.js status

# Review recent deployments
jq '.rateLimit.recentDeployments' /tmp/safety-circuit-state.json

# Manual reset if needed
.github/scripts/safety-circuit.js reset
```

### Monitoring & Observability

#### Key Metrics to Monitor

1. **Release Captain Performance**
   - Workflow execution time
   - Success/failure rate
   - Quality gate pass rate
   - Auto-fix success rate

2. **Deployment Safety**
   - Circuit breaker state
   - Rollback frequency
   - Time to detection (TTD)
   - Time to recovery (TTR)

3. **Security Posture**
   - Secret detection rate
   - Vulnerability blocking
   - Policy violation trends
   - SARIF finding patterns

#### Dashboard Queries

```bash
# Release Captain workflow metrics
gh api /repos/OWNER/REPO/actions/workflows/release-captain.yml/runs \
  --jq '.workflow_runs[] | {conclusion, created_at, run_number}'

# Safety circuit health
.github/scripts/safety-circuit.js status | jq .

# Recent security findings
gh api /repos/OWNER/REPO/code-scanning/alerts \
  --jq '.[] | {rule, state, created_at}'
```

## 📊 Performance Benchmarks

### Expected Performance Targets

| Metric                 | Target       | Measurement        |
| ---------------------- | ------------ | ------------------ |
| Workflow Duration      | < 15 minutes | 95th percentile    |
| Quality Gate Pass Rate | > 90%        | Weekly average     |
| Auto-Fix Success Rate  | > 75%        | For fixable issues |
| False Positive Rate    | < 5%         | Security scans     |
| Time to Merge          | < 2 hours    | Ready PRs          |

### Performance Testing

```bash
# Run performance benchmark
time .github/scripts/golden-pr-test.js

# Measure specific gates
time pnpm run build
time pnpm run test
time opa eval -d .github/policies -i test.json "data.summit.release.decision"
```

## 🚨 Incident Response

### Severity Levels

#### P0 - Release Captain Down

- Complete system failure
- All PRs blocked
- Immediate manual override needed

#### P1 - Degraded Performance

- Slow workflows
- Intermittent failures
- Quality gates timing out

#### P2 - Configuration Issues

- Policy evaluation errors
- Security scan failures
- Non-blocking warnings

### Response Procedures

1. **Assessment** (2 minutes)
   - Determine severity level
   - Check system health dashboard
   - Identify affected PRs

2. **Mitigation** (5 minutes)
   - Apply emergency override if needed
   - Disable problematic gates
   - Switch to manual review

3. **Resolution** (30 minutes)
   - Fix root cause
   - Test fix thoroughly
   - Restore normal operations

4. **Post-Incident** (24 hours)
   - Conduct blameless postmortem
   - Update runbooks
   - Implement preventive measures

## 🔄 Maintenance Procedures

### Weekly Maintenance

```bash
# Update security databases
npm audit
pnpm update --latest

# Review and rotate audit allowlist
vi .github/audit-allowlist.json

# Clean up circuit breaker state
.github/scripts/safety-circuit.js status
```

### Monthly Reviews

- [ ] Review policy violations and adjust rules
- [ ] Analyze performance metrics and optimize
- [ ] Update golden PR test scenarios
- [ ] Refresh emergency contact procedures
- [ ] Validate backup and recovery procedures

### Quarterly Updates

- [ ] Upgrade OPA and security tools
- [ ] Review and update branch protection rules
- [ ] Conduct disaster recovery drill
- [ ] Update team training materials
- [ ] Benchmark against industry standards

## 📞 Escalation Contacts

| Role             | Contact        | Responsibility                            |
| ---------------- | -------------- | ----------------------------------------- |
| Platform Team    | @platform-team | Primary Release Captain maintenance       |
| SRE Team         | @sre-team      | Emergency overrides and incident response |
| Security Team    | @security-team | Policy updates and security reviews       |
| On-Call Engineer | PagerDuty      | 24/7 incident response                    |

---

## 📚 Additional Resources

- [Release Captain Architecture](./release-captain-architecture.md)
- [OPA Policy Reference](../.github/policies/README.md)
- [Security Scanning Guide](../docs/security/scanning-guide.md)
- [Deployment Runbooks](./deployment-procedures.md)

_Last updated: $(date '+%Y-%m-%d')_
_Version: 1.0_
