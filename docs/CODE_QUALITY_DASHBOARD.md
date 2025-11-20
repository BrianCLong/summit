# Code Quality Dashboard

> **Last Updated**: 2025-11-20
> **Purpose**: This document describes the code quality monitoring dashboards and how to interpret the metrics.

## Overview

The IntelGraph platform uses multiple tools for continuous code quality monitoring:

1. **SonarQube** - Comprehensive code analysis platform
2. **GitHub Actions** - Automated quality checks on every PR
3. **Danger.js** - Automated PR review comments
4. **ESLint** - Code linting with complexity and security rules
5. **jscpd** - Code duplication detection

---

## SonarQube Dashboard

### Accessing SonarQube

- **Local Development**: Configure SonarQube locally or connect to your organization's instance
- **CI/CD**: Automated scans run weekly and on every PR
- **Configuration**: See `sonar-project.properties` for project settings

### Key Metrics

#### 1. Maintainability Rating (A-E)

| Rating | Debt Ratio | Description |
|--------|-----------|-------------|
| A | < 5% | Excellent - Low technical debt |
| B | 6-10% | Good - Manageable debt |
| C | 11-20% | Fair - Needs attention |
| D | 21-50% | Poor - Significant refactoring needed |
| E | > 50% | Critical - Major refactoring required |

**Current Thresholds:**
- Target: A rating (< 5% debt ratio)
- Files > 500 lines: Warning
- Files > 1000 lines: 71 files need refactoring
- Functions > 100 lines: Refactor
- Cyclomatic complexity > 15: Simplify

#### 2. Reliability Rating

Measures bug risk:
- **A**: No bugs
- **B**: At least 1 minor bug
- **C**: At least 1 major bug
- **D**: At least 1 critical bug
- **E**: At least 1 blocker bug

**Target**: A rating (zero bugs)

#### 3. Security Rating

Measures security vulnerability risk:
- **A**: No vulnerabilities
- **B**: At least 1 minor vulnerability
- **C**: At least 1 major vulnerability
- **D**: At least 1 critical vulnerability
- **E**: At least 1 blocker vulnerability

**Target**: A rating (zero vulnerabilities)

#### 4. Code Coverage

- **Current Minimum**: 70%
- **Target**: 80%
- **Recommendation**: All new code should have > 80% coverage

#### 5. Code Duplication

- **Maximum Allowed**: 5% duplicated lines
- **Tool**: jscpd with 10-line minimum threshold
- **Action**: Refactor when duplication > 3%

---

## Complexity Metrics

### Cyclomatic Complexity

**Definition**: Number of independent paths through code

| Complexity | Rating | Action |
|------------|--------|--------|
| 1-10 | Low | No action needed |
| 11-15 | Moderate | Consider refactoring |
| 16-25 | High | Refactor recommended |
| > 25 | Very High | Refactor required |

**Current Threshold**: 15 (will reduce to 10 over time)

**Issues Found**:
- Files with 100+ conditionals: Refactor immediately
- Switch statements with 32 cases: Break into strategy pattern

### Cognitive Complexity

**Definition**: Measures how difficult code is to understand (considers nesting)

**Threshold**: 15

More strict than cyclomatic complexity. Nested structures increase the score faster.

### Function Length

- **Max Lines**: 100 (excluding comments/blank lines)
- **Current Issues**: Functions over 200 lines found
- **Action**: Extract helper functions, use early returns

### File Length

- **Target**: 500 lines max
- **Warning**: 500-1000 lines
- **Critical**: > 1000 lines
- **Current Issues**: 71 files over 1000 lines, 4 files over 2000 lines

### Class Methods

- **Target**: Max 20 methods per class
- **Current Issues**: Classes with 117 methods (God Objects)
- **Pattern**: Use composition, extract responsibilities

### Function Parameters

- **Target**: Max 5 parameters
- **Pattern**: Use options object for > 5 parameters
- **Example**:

```typescript
// ❌ Bad
function createUser(name, email, age, role, department, manager, startDate) { }

// ✅ Good
interface CreateUserOptions {
  name: string;
  email: string;
  age: number;
  role: string;
  department: string;
  manager: string;
  startDate: Date;
}

function createUser(options: CreateUserOptions) { }
```

---

## Code Duplication Detection

### jscpd Configuration

See `.jscpd.json` for configuration.

**Settings**:
- **Minimum Lines**: 10
- **Minimum Tokens**: 100
- **Threshold**: 3% duplication triggers warning

**Reports Generated**:
- HTML report: `jscpd-report/index.html`
- JSON report: `jscpd-report/jscpd-report.json`
- Console summary
- Badge: `jscpd-report/badge.svg`

**How to Use**:

```bash
# Run duplication detection
pnpm run metrics:duplication

# View HTML report
open jscpd-report/index.html
```

---

## Technical Debt Tracking

### Automated Detection

The code quality workflow automatically tracks:

1. **TODO Comments**: 194 found across codebase
2. **FIXME Comments**: Tracked separately
3. **HACK Comments**: Indicates shortcuts taken
4. **XXX Comments**: Urgent issues

**Workflow**:
- Count updated weekly
- Reported in CI artifacts
- PRs adding TODOs trigger Danger.js message

### Technical Debt Metrics

**Formula**:
```
Technical Debt = (Issues × Effort to Fix) / Developer Capacity
```

**Effort Ratings** (from SonarQube):
- Trivial: 5 minutes
- Minor: 10 minutes
- Major: 30 minutes
- Critical: 1 hour
- Blocker: 4 hours

### Tracking in GitHub

Create issues for technical debt:

```markdown
**Title**: [Tech Debt] Refactor UserService god object

**Labels**: technical-debt, refactoring

**Body**:
## Context
UserService has 117 methods and 2,500 lines

## Impact
- Hard to test
- High cyclomatic complexity (85)
- Violates Single Responsibility Principle

## Proposed Solution
1. Extract authentication methods → AuthenticationService
2. Extract authorization methods → AuthorizationService
3. Extract user CRUD → UserRepository
4. Keep orchestration in UserService

## Effort
Estimated: 2 days

## Priority
Medium - No immediate bugs, but slowing development
```

---

## Quality Gates

### Pre-Commit Gates (Husky)

Runs on every commit:

1. **Gitleaks**: Secret scanning
2. **ESLint**: Linting with auto-fix
3. **Prettier**: Code formatting
4. **Type Checking**: TypeScript compilation
5. **Dependency Audit**: Check for high-severity vulnerabilities (warning only)

**Location**: `.husky/pre-commit`

### PR Gates (GitHub Actions)

Required checks for merge:

1. **Danger.js**: Automated code review
2. **ESLint**: No errors, max 10 security warnings
3. **TypeScript**: No type errors
4. **Tests**: All tests must pass
5. **Code Coverage**: Must not decrease
6. **SonarQube Quality Gate** (optional but recommended)

### SonarQube Quality Gate

**Conditions for Passing**:

| Metric | Operator | Value |
|--------|----------|-------|
| Coverage on New Code | >= | 70% |
| Duplicated Lines on New Code | <= | 5% |
| Maintainability Rating on New Code | = | A |
| Reliability Rating on New Code | = | A |
| Security Rating on New Code | = | A |
| Security Hotspots Reviewed | = | 100% |

**Exemptions**:
- Test files are excluded from coverage requirements
- Generated code is excluded
- Archive directories are excluded

---

## GitHub Actions Workflows

### code-quality.yml

Runs on:
- Push to main/develop/claude/** branches
- Pull requests
- Weekly schedule (Sundays 2 AM UTC)
- Manual trigger

**Jobs**:

1. **sonarqube**: Full SonarQube analysis with quality gate check
2. **complexity-analysis**: ESLint complexity metrics
3. **duplication-analysis**: jscpd duplication detection
4. **code-metrics**: Lines of code statistics (cloc)
5. **technical-debt**: Count TODOs, FIXMEs, HACKs
6. **quality-summary**: Aggregates all reports, comments on PR

**Artifacts** (retained 30 days):
- maintainability-report.json
- duplication-report/ (HTML + JSON)
- loc-report.txt
- technical-debt-report.md

### danger.yml

Runs on: All PR events (opened, edited, synchronize, reopened)

**Checks**:
- PR description quality (min 50 chars)
- Linked issues (#123)
- PR size (warns if > 500 lines)
- Test coverage (warns if source changed without tests)
- Security issues (console.log, debugger, eval, secrets)
- Code quality (TODOs, FIXMEs)
- Documentation (suggests docs for large PRs)
- Dependencies (pnpm-lock.yaml sync)
- GraphQL/Database changes (migration reminders)

**Output**: PR comment with automated feedback

---

## Monitoring Best Practices

### For Developers

**Daily**:
1. Check pre-commit hooks pass before committing
2. Review Danger.js feedback on your PRs
3. Address ESLint warnings/errors

**Weekly**:
1. Review your code coverage trends
2. Check for new technical debt items assigned to you
3. Refactor at least one TODO/FIXME

**Monthly**:
1. Review SonarQube dashboard for your components
2. Address code smells and high-complexity functions
3. Update technical debt estimates

### For Tech Leads

**Weekly**:
1. Review SonarQube quality gate status
2. Track technical debt trend (increasing or decreasing)
3. Identify hot spots (files/modules with most issues)
4. Review duplication report for refactoring opportunities

**Monthly**:
1. Set OKRs for code quality improvements
2. Identify patterns in code review feedback
3. Update quality gate thresholds if needed
4. Plan refactoring sprints

**Quarterly**:
1. Review overall maintainability rating trend
2. Celebrate improvements (debt reduction, coverage increase)
3. Adjust coding standards if needed
4. Training for common anti-patterns

---

## Grafana Dashboard (Optional)

### Setup

If using Prometheus + Grafana for observability:

1. Export SonarQube metrics to Prometheus
2. Create Grafana dashboard with panels:
   - Overall Quality Gate Status (gauge)
   - Maintainability Rating (graph over time)
   - Code Coverage (graph over time)
   - Technical Debt (graph over time)
   - New Issues per Week (bar chart)
   - Hot Spots (table - files with most issues)

### Sample Queries

```promql
# Quality Gate Status (1 = pass, 0 = fail)
sonarqube_quality_gate_status{project="intelgraph-platform"}

# Maintainability Rating (1=A, 2=B, 3=C, 4=D, 5=E)
sonarqube_maintainability_rating{project="intelgraph-platform"}

# Code Coverage Percentage
sonarqube_coverage{project="intelgraph-platform"}

# Technical Debt in minutes
sonarqube_technical_debt{project="intelgraph-platform"}
```

---

## Interpreting Reports

### SonarQube Report

**Green**: All quality gates passed ✅
- Maintainability: A
- Reliability: A
- Security: A
- Coverage: > 70%
- Duplication: < 5%

**Yellow**: Some issues but acceptable 🟡
- Minor bugs or code smells
- Coverage 60-70%
- Duplication 5-10%

**Red**: Quality gate failed ❌
- Critical bugs or vulnerabilities
- Coverage < 60%
- Duplication > 10%
- Blocker issues

### Danger.js Report

**Sections in PR Comment**:
1. **Statistics**: Lines changed, files modified
2. **Warnings**: Issues that should be addressed but won't block
3. **Failures**: Issues that must be fixed before merge
4. **Messages**: Informational tips and suggestions

### Complexity Report

Look for:
- Functions with complexity > 15: Refactor
- Files with complexity > 50: Break into modules
- Deep nesting (> 4 levels): Flatten logic

---

## FAQ

### Q: Why is my PR failing quality checks?

**A**: Check the GitHub Actions logs:
1. Click "Details" next to the failed check
2. Expand the failing step
3. Address the specific issues listed
4. Push fixes to your branch

### Q: How do I run quality checks locally?

**A**:
```bash
# Run all quality checks
pnpm run ci

# Run specific checks
pnpm run lint
pnpm run typecheck
pnpm run test:coverage
pnpm run metrics:complexity
pnpm run metrics:duplication
```

### Q: Can I bypass quality gates for urgent fixes?

**A**: In exceptional cases (P0 incidents):
1. Get approval from tech lead
2. Create a follow-up issue to fix quality issues
3. Link the follow-up in PR description
4. Merge with admin override (if necessary)

**Never bypass**:
- Security scans (Gitleaks, CodeQL)
- Test failures
- TypeScript errors

### Q: How do I improve code coverage?

**A**:
1. Identify uncovered lines: `pnpm run test:coverage:html`
2. Write tests for new code first (TDD)
3. Focus on complex logic and edge cases
4. Use coverage reports to find gaps
5. Don't test trivial getters/setters

### Q: What's the difference between cyclomatic and cognitive complexity?

**A**:
- **Cyclomatic**: Counts decision points (if, switch, &&, ||)
- **Cognitive**: Considers nesting and readability

Example:
```typescript
// Cyclomatic: 3, Cognitive: 1
function isValid(x, y, z) {
  return x && y && z;
}

// Cyclomatic: 3, Cognitive: 7 (nesting penalty)
function isValid(x, y, z) {
  if (x) {
    if (y) {
      if (z) {
        return true;
      }
    }
  }
  return false;
}
```

### Q: How often should I refactor?

**A**: Follow the Boy Scout Rule: "Leave code better than you found it"

- **Small refactors**: Every PR (rename variables, extract functions)
- **Medium refactors**: When complexity > threshold (extract classes)
- **Large refactors**: Planned sprints (architectural changes)

### Q: What if SonarQube is unavailable?

**A**: Other checks still run:
- Local: Pre-commit hooks
- CI: ESLint, TypeScript, tests, Danger.js
- SonarQube is additive, not blocking by default

---

## Resources

- **SonarQube Docs**: https://docs.sonarqube.org/
- **ESLint Complexity Rules**: https://eslint.org/docs/rules/complexity
- **jscpd**: https://github.com/kucherenko/jscpd
- **Danger.js**: https://danger.systems/js/
- **Conventional Commits**: https://www.conventionalcommits.org/

---

## Changelog

- **2025-11-20**: Initial creation with comprehensive metrics and dashboards
