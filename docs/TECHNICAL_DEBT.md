# Technical Debt Tracking and Management

> **Last Updated**: 2025-11-20
> **Purpose**: This document describes how we track, measure, and reduce technical debt in the IntelGraph platform.

## Table of Contents

1. [What is Technical Debt?](#what-is-technical-debt)
2. [Tracking Technical Debt](#tracking-technical-debt)
3. [Measuring Technical Debt](#measuring-technical-debt)
4. [Prioritization Framework](#prioritization-framework)
5. [Reduction Strategies](#reduction-strategies)
6. [Reporting and Monitoring](#reporting-and-monitoring)

---

## What is Technical Debt?

**Technical Debt** is the implied cost of rework caused by choosing an expedient solution now instead of a better approach that would take longer.

### Types of Technical Debt

1. **Deliberate Debt** (Tactical)
   - Conscious shortcuts to meet deadlines
   - Example: "We'll skip tests for this hotfix"
   - Should be tracked and repaid quickly

2. **Accidental Debt** (Inadvertent)
   - Results from learning or evolving requirements
   - Example: "We didn't know about this pattern when we started"
   - Normal part of software evolution

3. **Bit Rot** (Progressive)
   - Code becomes outdated as standards evolve
   - Example: Dependencies become deprecated
   - Requires continuous maintenance

4. **Design Debt**
   - Architectural decisions that don't scale
   - Example: Monolith should be microservices
   - Often requires major refactoring

---

## Tracking Technical Debt

### 1. Automated Detection

#### Code Comments

Track TODO/FIXME/HACK comments:

```typescript
// TODO: Refactor this to use the new UserService
// FIXME: This causes memory leak with large datasets
// HACK: Temporary workaround for API rate limiting
// XXX: Security issue - needs validation
```

**Automated Tracking**:
- Weekly count in code-quality.yml workflow
- Danger.js warns when new TODOs added
- Report artifact: `technical-debt-report.md`

```bash
# Run locally
grep -r "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.js" server/src client/src
```

#### SonarQube Metrics

**Technical Debt Ratio** = (Remediation Cost / Development Cost) × 100

- **A Rating**: < 5% (Excellent)
- **B Rating**: 6-10% (Good)
- **C Rating**: 11-20% (Fair)
- **D Rating**: 21-50% (Poor)
- **E Rating**: > 50% (Critical)

**Remediation Cost** = Sum of effort to fix all code smells

### 2. GitHub Issues

Create issues for significant debt:

```markdown
**Title**: [Tech Debt] Refactor GraphAnalyzer complexity

**Labels**: technical-debt, refactoring, priority-medium

**Template**:

## Problem
GraphAnalyzer.analyzePattern() has cyclomatic complexity of 42.
This makes it hard to test and maintain.

## Impact
- Testing: Hard to write comprehensive tests
- Bugs: High risk of bugs in edge cases
- Velocity: Slows down new feature development
- Onboarding: New developers struggle to understand

## Context
This was created during the v1.0 MVP rush. We knew it was
complex but needed to ship quickly.

## Proposed Solution
1. Extract pattern validation → validatePattern()
2. Extract scoring logic → calculatePatternScore()
3. Extract result formatting → formatAnalysisResult()
4. Add unit tests for each extracted function

## Effort Estimate
- Development: 1 day
- Testing: 0.5 days
- Code Review: 0.5 days
**Total: 2 days**

## Priority
Medium - Not blocking, but slowing development

## Acceptance Criteria
- [ ] Complexity reduced to < 15
- [ ] Test coverage > 80%
- [ ] All existing tests still pass
- [ ] Documentation updated
```

### 3. Architecture Decision Records (ADRs)

Document debt-inducing decisions:

```markdown
# ADR-042: Use MongoDB for Real-time Collaboration

## Status
Accepted (with technical debt)

## Context
Need real-time collaboration features by Q4 deadline.

## Decision
Use MongoDB for operational data, keep Neo4j for graph.

## Consequences

### Positive
- Fast time-to-market
- Good real-time performance
- Team knows MongoDB

### Negative
- **Technical Debt**: Data duplication between MongoDB and Neo4j
- **Technical Debt**: Complex sync logic required
- **Technical Debt**: Two databases to maintain

### Debt Repayment Plan
Q1 2026: Evaluate Postgres with JSON columns as unified store
Q2 2026: Prototype migration
Q3 2026: Execute migration if successful
```

---

## Measuring Technical Debt

### Quantitative Metrics

#### 1. SonarQube Debt Ratio

**Formula**:
```
Debt Ratio = (Total Effort to Fix Issues) / (Total Development Time) × 100
```

**Effort Values** (SonarQube defaults):
- Blocker: 4 hours
- Critical: 1 hour
- Major: 30 minutes
- Minor: 10 minutes
- Info: 5 minutes

**Current Status**:
```bash
# Check current debt ratio
curl -u $SONAR_TOKEN: "$SONAR_URL/api/measures/component?component=intelgraph-platform&metricKeys=sqale_debt_ratio"
```

#### 2. Code Complexity Metrics

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| Files > 1000 lines | 71 | 0 | 71 files |
| Files > 500 lines | 150 | 50 | 100 files |
| Functions > 100 lines | 45 | 0 | 45 functions |
| Cyclomatic complexity > 15 | 89 | 0 | 89 functions |
| Classes > 20 methods | 12 | 0 | 12 classes |

```bash
# Run complexity analysis
pnpm run metrics:complexity
```

#### 3. Code Duplication

**Formula**:
```
Duplication % = (Duplicated Lines) / (Total Lines) × 100
```

**Targets**:
- Overall: < 3%
- Per file: < 5%
- New code: 0%

```bash
# Run duplication detection
pnpm run metrics:duplication
open jscpd-report/index.html
```

#### 4. Test Coverage Debt

**Formula**:
```
Coverage Debt = (Target Coverage % - Current Coverage %) × Total Lines
```

Example:
```
Target: 80%
Current: 72%
Total Lines: 50,000
Debt: (80% - 72%) × 50,000 = 4,000 lines need tests
```

### Qualitative Indicators

1. **Developer Velocity**
   - Feature development slowing down
   - More time spent on bug fixes than features

2. **Onboarding Time**
   - New developers take longer to become productive
   - Frequent questions about "why is this code like this?"

3. **Bug Rate**
   - Increasing bug reports in older code
   - Regression bugs in "stable" features

4. **Fear of Change**
   - Developers avoid touching certain files
   - "Don't refactor, it might break something"

---

## Prioritization Framework

### Debt Impact Matrix

| Impact | Urgency | Priority | Action |
|--------|---------|----------|--------|
| High | High | P0 | Fix immediately |
| High | Low | P1 | Schedule this sprint |
| Low | High | P2 | Fix if time permits |
| Low | Low | P3 | Backlog |

### Impact Assessment

**High Impact** (Score 8-10):
- Blocking new features
- Causing production bugs
- Security vulnerabilities
- Significant performance issues

**Medium Impact** (Score 4-7):
- Slowing development velocity
- Confusing for new developers
- Moderate code smells
- Low test coverage in critical paths

**Low Impact** (Score 1-3):
- Cosmetic issues
- Minor inefficiencies
- Isolated to non-critical features
- No user impact

### Urgency Assessment

**High Urgency**:
- Affects active development
- Blocking upcoming features
- Recent regression

**Low Urgency**:
- Legacy code rarely changed
- Future feature dependent
- Can be addressed gradually

### Priority Formula

```
Priority Score = (Impact × 2) + (Effort to Fix Inverse)

Effort to Fix Inverse:
- 1 hour: 10 points
- 1 day: 7 points
- 1 week: 4 points
- 1 month: 1 point
```

Higher score = higher priority

### Example Prioritization

```markdown
## Technical Debt Items

1. **[P0] Fix SQL injection in user search** (Score: 30)
   - Impact: 10 (Security vulnerability)
   - Effort: 2 hours
   - Action: Fix today

2. **[P1] Refactor GraphAnalyzer complexity** (Score: 23)
   - Impact: 7 (Slowing development)
   - Effort: 2 days
   - Action: Schedule this sprint

3. **[P2] Extract duplicate validation logic** (Score: 15)
   - Impact: 5 (Code smell)
   - Effort: 1 day
   - Action: Next sprint if time

4. **[P3] Rename inconsistent variable names** (Score: 8)
   - Impact: 3 (Cosmetic)
   - Effort: 4 hours
   - Action: Backlog
```

---

## Reduction Strategies

### 1. Continuous Refactoring

**Boy Scout Rule**: Leave code better than you found it

```typescript
// While working on feature, notice poor naming
function calc(x, y) {  // Unclear
  return x * y + 10;
}

// Improve while you're here
function calculateTotalWithTax(subtotal: number, taxRate: number): number {
  const TAX_OFFSET = 10;
  return subtotal * taxRate + TAX_OFFSET;
}
```

**Guidelines**:
- Refactor code you touch for features
- Don't go on tangents (stay focused)
- Small improvements each PR
- Commit refactors separately

### 2. Dedicated Refactoring Sprints

**20% Time**: Allocate 1 day per week for debt reduction

**Refactoring Sprint** (every 4-6 sprints):
- Entire sprint dedicated to debt
- Pick top 10 P1/P2 items
- Goal: Measurable improvement in metrics

**Planning**:
```markdown
## Refactoring Sprint Goals

### Metrics
- Reduce debt ratio from 7% to 5%
- Reduce files > 500 lines from 150 to 100
- Increase coverage from 72% to 75%

### Top Items
1. Refactor UserService (2 days)
2. Extract duplicate auth logic (1 day)
3. Add tests to InvestigationRepo (1 day)
4. Break up 2000-line GraphService.ts (1 day)
```

### 3. Code Review Focus

**Prevent New Debt**:
- Block PRs that add significant debt
- Require tests for new code
- Enforce complexity limits
- Check for duplication

**Danger.js Automation**:
- Warns on large PRs
- Flags missing tests
- Detects console.log
- Checks for TODOs

### 4. Gradual Migration

**Strangler Fig Pattern**:
- Don't rewrite everything at once
- Build new system alongside old
- Gradually migrate functionality
- Eventually deprecate old system

Example:
```typescript
// Old API (deprecated, but still works)
function getUser(id: string) {
  return legacyUserService.fetch(id);
}

// New API (preferred)
function getUserV2(id: string): Promise<User> {
  return userRepository.findById(id);
}

// Adapter (allows gradual migration)
function getUser(id: string): Promise<User> {
  if (featureFlags.useNewUserService) {
    return getUserV2(id);
  }
  return Promise.resolve(legacyUserService.fetch(id));
}
```

### 5. Automate Where Possible

**Automated Refactoring Tools**:
- ESLint auto-fix: `eslint --fix`
- Prettier formatting: `prettier --write`
- TypeScript refactoring: IDE refactor tools
- Codemod scripts for bulk changes

Example codemod:
```typescript
// Rename all instances of old function name
jscodeshift -t scripts/codemods/rename-function.js src/
```

---

## Reporting and Monitoring

### Weekly Reports

**Automated Report** (code-quality.yml workflow):
- Runs every Sunday at 2 AM UTC
- Generates artifacts:
  - maintainability-report.json
  - technical-debt-report.md
  - duplication-report/

**Review in Team Meeting**:
- Debt ratio trend (increasing/decreasing)
- New high-complexity functions added
- Test coverage change
- Action items for next week

### Monthly Dashboard

**SonarQube Dashboard**:
1. Login to SonarQube
2. Navigate to IntelGraph Platform project
3. Review:
   - Quality Gate status
   - Debt ratio trend (6-month view)
   - New issues vs. fixed issues
   - Hot spots (files with most issues)

**GitHub Project Board**:
- Technical Debt column
- Track issues by priority
- Burn down chart

### Quarterly Review

**Technical Debt Audit**:
1. Review all P0/P1 debt items
2. Update priorities based on roadmap
3. Set quarterly debt reduction goals
4. Plan refactoring sprints

**Metrics to Track**:
```markdown
## Q4 2025 Technical Debt Report

### Summary
- **Debt Ratio**: 7% → 5% ✅ (Target: < 5%)
- **Test Coverage**: 72% → 76% ⚠️ (Target: 80%)
- **Files > 500 lines**: 150 → 120 ✅ (Target: < 100)
- **Complexity > 15**: 89 → 65 ✅ (Target: 0)

### Top Achievements
1. Refactored UserService (117 methods → 4 services)
2. Added 500+ tests to core modules
3. Eliminated SQL injection vulnerabilities

### Remaining Challenges
1. 71 files still > 1000 lines
2. 4 files > 2000 lines (GraphService.ts, InvestigationService.ts, ...)
3. Test coverage gap in legacy modules

### Q1 2026 Goals
- Debt ratio: Maintain < 5%
- Coverage: Increase to 80%
- Files > 1000 lines: Reduce to 30
```

---

## Best Practices

### 1. Track Debt, Don't Hide It

```markdown
// ❌ Bad: Silent debt
function processOrder(order) {
  // This is a mess but shipping is tomorrow, I'll fix it later
  // (Narrator: They never fixed it)
}

// ✅ Good: Documented debt
function processOrder(order: Order): Result {
  // TODO(#1234): Refactor complexity (currently 25, target < 15)
  // Estimated effort: 1 day
  // Priority: P1 (blocking new payment features)
  // Owner: @john
}
```

### 2. Pay Debt Early

Compound interest applies to technical debt too!

- 1 week debt → 1 day to fix
- 1 month debt → 3 days to fix
- 1 year debt → 2 weeks to fix

### 3. Communicate Tradeoffs

When taking on debt intentionally:

```markdown
## PR Description

### Changes
Implemented urgent fix for payment processor outage.

### Technical Debt Incurred
⚠️ Skipped tests for PaymentService (200 lines of new code)

**Why**: P0 incident, needed to ship within 2 hours

**Repayment Plan**:
- Created issue #5678 to add tests
- Scheduled for next sprint
- Estimated effort: 0.5 days

### Reviewers
Please focus on correctness and security.
We'll add tests in follow-up PR.
```

### 4. Celebrate Debt Reduction

Make it visible and rewarding:

- Show metrics improvements in team meetings
- Recognize developers who reduce debt
- Track "debt paid" as a metric

---

## Tools and Automation

### Installed Tools

1. **SonarQube** - `sonar-project.properties`
2. **ESLint Complexity** - `.eslintrc.complexity.cjs`
3. **jscpd** - `.jscpd.json`
4. **Danger.js** - `dangerfile.ts`
5. **GitHub Actions** - `.github/workflows/code-quality.yml`

### Local Commands

```bash
# Check all metrics
pnpm run metrics:all

# Individual checks
pnpm run metrics:complexity
pnpm run metrics:duplication
pnpm run metrics:loc

# Generate reports
pnpm run metrics:report          # Human-readable
pnpm run metrics:report:json     # Machine-readable
```

---

## FAQ

### Q: Should we stop all feature work to pay down debt?

**A**: No. Use the 80/20 rule:
- 80% time on features
- 20% time on debt reduction

For critical debt (security, blocking features), stop and fix immediately.

### Q: How do we avoid accumulating debt in the first place?

**A**:
1. Enforce quality gates (pre-commit, CI)
2. Code review standards
3. Definition of Done includes tests
4. Refactor as you go (Boy Scout Rule)
5. Track velocity - slow velocity indicates debt

### Q: What if we can't reduce debt ratio below target?

**A**:
1. Re-evaluate target (is 5% realistic for your codebase?)
2. Focus on high-impact debt first
3. Consider rewrite if debt > 50% and growing
4. Increase refactoring time allocation

---

## Resources

- [Managing Technical Debt - Martin Fowler](https://martinfowler.com/bliki/TechnicalDebt.html)
- [Refactoring - Martin Fowler](https://refactoring.com/)
- [SonarQube Docs](https://docs.sonarqube.org/)
- [Code Smells Catalog](https://refactoring.guru/refactoring/smells)

---

## Changelog

- **2025-11-20**: Initial creation with comprehensive tracking and reduction strategies
