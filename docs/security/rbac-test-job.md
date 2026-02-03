# RBAC Verification Test Job Configuration

**Purpose:** Ensure Role-Based Access Control (RBAC) policies are continuously validated in CI/CD pipeline
**Test Suite:** `/server/__tests__/rbac/investigation-export-rbac.test.ts`
**Policy Reference:** `/docs/security/rbac_policy.md`

## Overview

This document describes the CI/CD test job configuration for running RBAC verification tests. These tests are marked with the `@rbac_critical` tag and must pass before any changes to investigation management, export functionality, or permission systems can be merged.

## Test Job Requirements

### Job Name
`rbac-verification-tests` or integrated into existing `security-tests` job

### When to Run
- On every pull request to `main` or `develop` branches
- On changes to files matching:
  - `server/src/authz/**`
  - `server/src/middleware/rbac.ts`
  - `server/src/services/*RBAC*.ts`
  - `server/src/graphql/resolvers/investigation.ts`
  - `server/src/analytics/exports/**`
  - `server/src/cases/**`
  - `server/__tests__/rbac/**`
  - `docs/security/rbac_policy.md`
- Nightly as part of compliance test suite
- Before any production deployment

### Test Environment

```yaml
environment:
  NODE_ENV: test
  DATABASE_URL: postgresql://test:test@localhost:5432/summit_test
  REDIS_URL: redis://localhost:6379
  RBAC_ENFORCEMENT_MODE: strict
  AUDIT_LOGGING_ENABLED: true
```

### Dependencies
- PostgreSQL 14+ (for audit log verification)
- Redis 7+ (for session/MFA state)
- Node.js 20+
- Jest test runner

## Test Execution

### Command

```bash
# Run all RBAC tests
npm test -- --testPathPattern=__tests__/rbac/

# Run only critical RBAC tests
npm test -- --testNamePattern="@rbac_critical"

# Run with coverage
npm test -- --coverage --testPathPattern=__tests__/rbac/

# Run in CI mode (fail fast, verbose output)
npm test -- --ci --bail --verbose --testPathPattern=__tests__/rbac/
```

### Expected Output

```
PASS server/__tests__/rbac/investigation-export-rbac.test.ts
  Investigation Management RBAC Tests
    @rbac_critical - Investigation View Permissions
      ✓ should allow all roles to view investigations within their clearance (5ms)
      ✓ should deny VIEWER access to investigations beyond clearance level (3ms)
      ✓ should enforce tenant isolation for non-admin users (4ms)
      ✓ should allow admin cross-tenant access (2ms)
    @rbac_critical - Investigation Create Permissions
      ✓ should allow ANALYST+ to create investigations (2ms)
      ✓ should deny VIEWER from creating investigations (1ms)
    @rbac_critical - Investigation Update Permissions
      ✓ should allow ANALYST to update assigned investigations (3ms)
      ✓ should deny ANALYST from updating unassigned investigations (2ms)
      ✓ should allow LEAD+ to update any investigation in tenant (3ms)
      ✓ should deny VIEWER from updating investigations (1ms)
    ... [40+ more test cases]

Test Suites: 1 passed, 1 total
Tests:       45 passed, 45 total
Snapshots:   0 total
Time:        2.145 s
```

### Success Criteria

- All `@rbac_critical` tests pass (100% success rate)
- Test coverage ≥ 95% for RBAC-related code
- Execution time < 5 seconds
- No skipped or disabled tests
- Zero flaky tests (tests must be deterministic)

### Failure Actions

If RBAC tests fail:
1. **Block PR merge** - No bypass allowed without security team approval
2. **Alert security team** - Send notification to `#security-alerts` Slack channel
3. **Create security incident** - Log failure in incident tracking system
4. **Revert if in production** - Automatic rollback if post-deploy failure

## Test Coverage Requirements

### Code Coverage Targets

| Component | Line Coverage | Branch Coverage | Function Coverage |
|-----------|---------------|-----------------|-------------------|
| `authz/permissions.ts` | 100% | 100% | 100% |
| `middleware/rbac.ts` | 95% | 95% | 100% |
| `services/EnhancedGovernanceRBACService.ts` | 90% | 90% | 95% |
| `graphql/resolvers/investigation.ts` | 85% | 85% | 90% |
| `analytics/exports/ExportService.ts` | 90% | 90% | 95% |

### Mutation Testing

Consider adding mutation testing with Stryker for critical RBAC logic:

```bash
# Example mutation testing command
npx stryker run --mutate="server/src/authz/permissions.ts"
```

Target: 100% mutation score for permission checking logic

## Integration with CI/CD Pipeline

### GitHub Actions Example

```yaml
# .github/workflows/rbac-tests.yml
name: RBAC Verification Tests

on:
  pull_request:
    paths:
      - 'server/src/authz/**'
      - 'server/src/middleware/rbac.ts'
      - 'server/src/services/*RBAC*.ts'
      - 'server/src/graphql/resolvers/investigation.ts'
      - 'server/src/analytics/exports/**'
      - 'server/__tests__/rbac/**'
      - 'docs/security/rbac_policy.md'
  push:
    branches: [main, develop]
  schedule:
    - cron: '0 2 * * *' # Nightly at 2 AM UTC

jobs:
  rbac-verification:
    name: RBAC Policy Verification
    runs-on: ubuntu-latest
    timeout-minutes: 10

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: summit_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run database migrations
        run: npm run db:migrate:test
        env:
          DATABASE_URL: postgresql://postgres:test@localhost:5432/summit_test

      - name: Run RBAC verification tests
        run: npm test -- --ci --bail --verbose --testPathPattern=__tests__/rbac/
        env:
          NODE_ENV: test
          DATABASE_URL: postgresql://postgres:test@localhost:5432/summit_test
          REDIS_URL: redis://localhost:6379
          RBAC_ENFORCEMENT_MODE: strict
          AUDIT_LOGGING_ENABLED: true

      - name: Generate coverage report
        if: always()
        run: npm test -- --coverage --testPathPattern=__tests__/rbac/ --coverageReporters=text --coverageReporters=lcov

      - name: Upload coverage to Codecov
        if: always()
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          flags: rbac-tests
          name: rbac-coverage

      - name: Comment PR with test results
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const testResults = fs.readFileSync('test-results.json', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## RBAC Test Results\n\`\`\`json\n${testResults}\n\`\`\``
            });

      - name: Fail if coverage below threshold
        run: |
          COVERAGE=$(npm test -- --coverage --testPathPattern=__tests__/rbac/ --coverageReporters=json-summary | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 95" | bc -l) )); then
            echo "RBAC test coverage ($COVERAGE%) is below 95% threshold"
            exit 1
          fi

      - name: Notify security team on failure
        if: failure()
        uses: slackapi/slack-github-action@v1
        with:
          channel-id: 'security-alerts'
          slack-message: 'RBAC verification tests failed in ${{ github.repository }} on branch ${{ github.ref }}'
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```

### Alternative: Integrated into Main Test Job

If you prefer to integrate into an existing test job rather than create a separate workflow:

```yaml
# In existing .github/workflows/test.yml
jobs:
  test:
    # ... existing setup ...

    steps:
      # ... existing test steps ...

      - name: Run RBAC critical tests
        run: npm test -- --testNamePattern="@rbac_critical" --bail
        env:
          RBAC_ENFORCEMENT_MODE: strict

      - name: Verify RBAC policy documentation
        run: |
          # Ensure rbac_policy.md is up to date with code
          npm run verify:rbac-policy
```

## Local Development

### Running Tests Locally

```bash
# Quick test during development
npm test -- --watch --testPathPattern=rbac

# Full verification before PR
npm run test:rbac

# With coverage
npm run test:rbac:coverage
```

### Add to package.json

```json
{
  "scripts": {
    "test:rbac": "jest --testPathPattern=__tests__/rbac/ --bail --verbose",
    "test:rbac:coverage": "jest --testPathPattern=__tests__/rbac/ --coverage --coverageThreshold='{\"global\":{\"lines\":95}}'",
    "test:rbac:watch": "jest --watch --testPathPattern=__tests__/rbac/",
    "verify:rbac-policy": "node scripts/verify-rbac-policy-sync.js"
  }
}
```

## Pre-commit Hook Integration

Add RBAC tests to pre-commit hooks for files that modify permissions:

```yaml
# .husky/pre-commit or .pre-commit-config.yaml
- repo: local
  hooks:
    - id: rbac-tests
      name: RBAC Verification Tests
      entry: npm test -- --testPathPattern=__tests__/rbac/ --bail
      language: system
      files: '^(server/src/(authz|middleware/rbac|services/.*RBAC)|docs/security/rbac_policy\.md)'
      pass_filenames: false
```

## Monitoring and Alerting

### Test Metrics to Track

1. **Test Success Rate:** 100% required
2. **Test Duration:** < 5 seconds (alert if > 10 seconds)
3. **Flakiness Rate:** 0% tolerated
4. **Coverage Trend:** Should remain ≥ 95%

### Dashboards

Create monitoring dashboard with:
- Daily test run results
- Coverage trends over time
- Time-to-fix for RBAC test failures
- Count of RBAC violations in audit logs

### Alerts

Configure alerts for:
- RBAC test failures in CI
- Coverage drops below threshold
- Flaky test detection
- Unauthorized access attempts in production

## Compliance Requirements

### SOC 2 / ISO 27001

- **Control:** CC6.1, CC6.2, CC6.3
- **Evidence:** Test execution logs, coverage reports, audit trail of test results
- **Frequency:** Every code change + nightly verification
- **Retention:** 7 years for audit compliance

### Documentation for Auditors

Provide auditors with:
1. This test job configuration document
2. RBAC policy document (`rbac_policy.md`)
3. Sample test execution logs
4. Coverage reports for last 90 days
5. Evidence of failures and remediation

## Troubleshooting

### Common Issues

**Issue:** Tests fail with "Cannot connect to database"
**Solution:** Ensure PostgreSQL service is running and `DATABASE_URL` is correct

**Issue:** Tests timeout
**Solution:** Increase job timeout or optimize test fixtures

**Issue:** Flaky tests due to async operations
**Solution:** Use proper Jest async patterns (async/await, done callback, or return Promise)

**Issue:** Coverage below threshold
**Solution:** Add tests for uncovered branches or adjust threshold temporarily with justification

## Maintenance

### Quarterly Review

Every quarter, review and update:
- Test coverage requirements
- Performance benchmarks
- Alert thresholds
- Integration with new CI/CD tools

### Annual Certification

Annually certify that:
- All RBAC policies are tested
- Tests align with current threat model
- Coverage meets compliance requirements
- Test infrastructure is secure

## Related Documentation

- `/docs/security/rbac_policy.md` - RBAC policy matrix
- `/server/__tests__/rbac/investigation-export-rbac.test.ts` - Test implementation
- `/docs/security/THREAT_MODEL.md` - Security threat model
- `/.github/workflows/` - CI/CD workflow definitions

## Approval and Updates

**Document Owner:** Security Team
**Last Updated:** 2026-01-30
**Next Review:** 2026-04-30

This configuration must be approved by:
- [ ] Security Team Lead
- [ ] DevOps/Platform Team Lead
- [ ] QA Engineering Lead
