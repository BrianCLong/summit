# CI Hard Gates Documentation

**Version:** 1.0
**Last Updated:** 2025-12-27
**Owner:** Engineering Team
**SOC 2 Controls:** CC7.1, CC7.2, CC8.1

## Overview

Summit implements mandatory CI hard gates that **MUST** pass before any code can be merged to protected branches. These gates are non-negotiable quality and security checkpoints designed to ensure GA readiness and maintain SOC 2 compliance.

## Protected Branches

The following branches are protected and require all CI gates to pass:

- `main` - Production branch
- `release/**` - Release branches

## CI Gates

All gates are implemented in `.github/workflows/ci-hard-gates.yml` and must pass for merge approval.

### Gate 1: ESLint (Code Quality)

**Purpose:** Enforce code style, quality standards, and catch common errors

**Criteria:**

- ✅ Zero ESLint errors
- ✅ No new code suppressions above baseline (811)
- ⚠️ Warnings under 50

**Blocked By:**

- Any ESLint error
- New `eslint-disable`, `@ts-ignore`, or `@ts-expect-error` comments
- Suppressions without specific rule names

**Remediation:**

- Fix all ESLint errors before merge
- Document suppression justifications in code review
- Get approval from 2+ reviewers for new suppressions

---

### Gate 2: TypeScript (Type Safety)

**Purpose:** Ensure type safety and catch type-related bugs

**Criteria:**

- ✅ Zero TypeScript compilation errors
- ✅ Strict mode enabled
- ✅ All project references valid

**Blocked By:**

- Any `error TS` from TypeScript compiler
- Type resolution failures
- Missing type declarations

**Remediation:**

- Fix all type errors
- Add proper type annotations
- Ensure all dependencies have types

---

### Gate 3: Build (Compilation)

**Purpose:** Verify code compiles and produces valid artifacts

**Criteria:**

- ✅ Client builds successfully
- ✅ Server builds successfully
- ✅ All build artifacts present
- ✅ Bundle sizes within limits

**Blocked By:**

- Build failures in any package
- Missing dist/ directories
- Build script errors

**Remediation:**

- Fix compilation errors
- Ensure all dependencies installed
- Check for circular dependencies

---

### Gate 4: Unit Tests (Functionality)

**Purpose:** Verify core functionality and maintain code coverage

**Criteria:**

- ✅ Zero test failures
- ✅ 80% code coverage (global)
- ✅ 85% coverage for critical paths (middleware, services)
- ✅ No skipped tests in PR changes

**Blocked By:**

- Any failing test
- Coverage below thresholds
- Focused tests (`.only`) in committed code

**Remediation:**

- Fix failing tests
- Add tests for new code
- Remove `.only` and `.skip` from tests

**Coverage Thresholds:**

```javascript
{
  global: {
    branches: 80%,
    functions: 80%,
    lines: 80%,
    statements: 80%
  },
  middleware: 85%,
  services: 85%
}
```

---

### Gate 5: Governance Tests (Policy Enforcement)

**Purpose:** Ensure compliance with governance policies and security controls

**Criteria:**

- ✅ Governance checks pass
- ✅ Threat model tests pass
- ✅ Policy validation tests pass
- ✅ Autonomous evaluation tests pass

**Blocked By:**

- Failed governance checks
- Threat model violations
- Policy test failures

**Test Files:**

- `server/src/quality-evaluation/autonomous/__tests__/abuse-tests/threat-model.test.ts`
- `**/governance*.test.ts`
- `scripts/check-governance.cjs`

**Remediation:**

- Review governance policy violations
- Update threat model if needed
- Ensure proper authorization checks

---

### Gate 6: Provenance Tests (Supply Chain)

**Purpose:** Verify supply chain integrity and data provenance

**Criteria:**

- ✅ Minimum 10 provenance tests pass
- ✅ Data envelope validation passes
- ✅ Receipt verification passes
- ✅ Ledger integrity maintained

**Blocked By:**

- Provenance test failures
- Envelope schema violations
- Receipt signature failures
- Ledger integrity checks fail

**Test Coverage:**

- 137+ provenance-related test files
- Receipt validation
- Ledger integrity
- Canonical graph service
- Export provenance

**Remediation:**

- Fix provenance chain breaks
- Ensure proper receipt generation
- Validate envelope schemas

---

### Gate 7: Schema Diff (Breaking Changes)

**Purpose:** Detect breaking API and database schema changes

**Criteria:**

- ✅ No breaking GraphQL schema changes
- ✅ Database migrations clean
- ✅ API contracts maintained

**Blocked By:**

- Breaking GraphQL changes without versioning
- Unapplied database migrations
- API contract violations

**Remediation:**

- Version breaking changes
- Apply migrations
- Update API documentation

---

### Gate 8: Security (Vulnerability Scanning)

**Purpose:** Detect security vulnerabilities and secrets

**Criteria:**

- ✅ Zero critical vulnerabilities
- ✅ Maximum 5 high vulnerabilities
- ✅ No secrets in code
- ✅ npm audit passes

**Blocked By:**

- Critical vulnerabilities in dependencies
- More than 5 high severity issues
- Detected secrets/credentials
- Compromised packages

**Remediation:**

- Update vulnerable dependencies
- Remove secrets from code
- Use environment variables
- Add secrets to `.gitignore`

---

## Merge-Safe Artifact

Upon successful completion of all gates, a **merge-safe artifact** is generated and stored as a workflow artifact.

### Artifact Contents

The artifact includes:

- ✅ Timestamp and commit SHA
- ✅ Status of all 8 gates
- ✅ Test counts and coverage metrics
- ✅ Quality scores
- ✅ SOC 2 control attestations
- ✅ Digital signature for verification
- ✅ Deployment readiness assessment

### Artifact Location

- **Workflow Artifacts:** Available in GitHub Actions for 90 days
- **Evidence Archive:** `audit/ga-evidence/ci/sample-merge-safe-artifact.json`
- **Production Deployments:** Artifacts attached to releases

### Artifact Verification

```bash
# Verify artifact signature
SIGNATURE=$(echo -n "$COMMIT_SHA$TIMESTAMP" | sha256sum | cut -d' ' -f1)
echo "$SIGNATURE" > expected.sig
diff expected.sig merge-safe-artifact.sig
```

---

## Branch Protection Rules

### Required Configuration

Configure the following in GitHub repository settings under **Settings > Branches > Branch protection rules**:

#### For `main` branch:

1. **Require a pull request before merging**
   - ✅ Require approvals: 2
   - ✅ Dismiss stale approvals
   - ✅ Require review from Code Owners

2. **Require status checks to pass before merging**
   - ✅ Require branches to be up to date before merging

   **Required status checks:**
   - `Gate 1: ESLint`
   - `Gate 2: TypeScript`
   - `Gate 3: Build`
   - `Gate 4: Unit Tests`
   - `Gate 5: Governance`
   - `Gate 6: Provenance`
   - `Gate 7: Schema Diff`
   - `Gate 8: Security`
   - `Generate Merge-Safe Artifact`

3. **Require conversation resolution before merging**
   - ✅ All conversations must be resolved

4. **Require signed commits**
   - ✅ Commits must be signed (recommended)

5. **Require linear history**
   - ✅ Prevent merge commits (use squash or rebase)

6. **Do not allow bypassing the above settings**
   - ✅ Include administrators
   - ⚠️ Restrict who can push to matching branches

#### Additional Settings:

- **Allow force pushes:** ❌ Disabled
- **Allow deletions:** ❌ Disabled

---

## Local Development

### Running Gates Locally

Before pushing, run all gates locally:

```bash
# Gate 1: Lint
npm run lint

# Gate 2: Typecheck
npm run typecheck

# Gate 3: Build
npm run build

# Gate 4: Tests
npm run test

# Gate 5: Governance
npm run check:governance
npm test -- --testPathPattern="governance"

# Gate 6: Provenance
npm test -- --testPathPattern="provenance"

# Gate 7: Schema
npm run graphql:schema:check
npm run db:pg:status

# Gate 8: Security
npm audit --audit-level=high
```

### Pre-commit Hooks

Configure git hooks to run checks automatically:

```bash
# Install husky
npm run prepare

# Hooks configured in .husky/pre-commit
# - Runs lint-staged
# - Runs typecheck
```

---

## Suppression Policy

### Baseline

Current suppression baseline: **811 total suppressions**

**Breakdown:**

- `eslint-disable` (TypeScript): 571
- `eslint-disable` (JavaScript): 118
- `@ts-ignore`: 105
- `@ts-expect-error`: 17

### Policy

1. **New suppressions are BLOCKED by CI**
2. **All suppressions must:**
   - Include specific rule name
   - Have inline comment explaining justification
   - Be approved by 2+ reviewers
   - Have remediation plan if temporary

3. **Prohibited suppressions:**
   - Generic `eslint-disable` without rule
   - `@ts-ignore` in security-critical code
   - Suppressions bypassing SOC 2 controls

4. **Preferred pattern:**
   ```typescript
   // @ts-expect-error - Express types incompatible, validated by Zod
   const handler: RequestHandler = (req, res, next) => { ... }
   ```

### Audit Schedule

- **Monthly:** Review suppression count
- **Quarterly:** Update baseline if justified
- **Target:** Reduce by 20% within 90 days

See: `audit/ga-evidence/ci/SUPPRESSION_AUDIT.md`

---

## Failure Resolution

### Gate Failed - What Now?

1. **Review CI logs** in GitHub Actions
2. **Identify specific failure** (error messages)
3. **Fix locally** and test
4. **Push fix** to same PR branch
5. **Wait for CI** to re-run automatically

### Common Failures

#### "ESLint errors found"

→ Run `npm run lint` locally and fix errors

#### "TypeScript compilation failed"

→ Run `npm run typecheck` and fix type errors

#### "Tests failed"

→ Run `npm test` and fix failing tests

#### "Coverage below threshold"

→ Add tests for uncovered code

#### "New suppressions detected"

→ Remove suppressions or get approval with justification

#### "Security vulnerabilities"

→ Run `npm audit fix` and test

### Bypass Process (Emergency Only)

For production hotfixes ONLY:

1. **Create incident ticket** documenting emergency
2. **Get VP Engineering approval** in writing
3. **Use temporary bypass** via admin override
4. **Create follow-up PR** to meet all gates
5. **Document in audit log** within 24 hours

**Note:** All bypasses are logged and reviewed in SOC 2 audits.

---

## SOC 2 Compliance

### Control Mapping

| Control | Description               | Implementation                           |
| ------- | ------------------------- | ---------------------------------------- |
| CC7.1   | Detect changes to systems | CI gates detect all code changes         |
| CC7.2   | Manage system changes     | Required status checks enforce standards |
| CC8.1   | Authorize system changes  | PR approval + CI gates required          |

### Audit Evidence

All CI runs generate audit evidence stored in:

- `audit/ga-evidence/ci/`
- GitHub Actions workflow runs (retained 90 days)
- Merge-safe artifacts attached to releases

### Compliance Attestations

Every merge-safe artifact includes:

- ✅ Control compliance status
- ✅ Evidence trail references
- ✅ Verification instructions
- ✅ Digital signature

---

## Metrics and Monitoring

### CI Dashboard Metrics

Track the following in your monitoring dashboard:

```yaml
ci_metrics:
  gate_pass_rate: 95%+
  average_ci_time: 25 minutes
  gates_failed_most: "Gate 4 (Tests)"
  suppression_trend: "Decreasing"
  coverage_trend: "Stable at 84%"
  security_score: "A+"
```

### Alerts

Set up alerts for:

- ❌ Gate pass rate < 90% (investigate CI issues)
- ❌ Average CI time > 45 minutes (optimize workflow)
- ❌ Suppression count increases
- ❌ Coverage decreases below 80%

---

## Maintenance

### Workflow Updates

1. **Test changes** in feature branch first
2. **Review impact** on all PRs
3. **Document changes** in this file
4. **Communicate** to engineering team

### Baseline Updates

Update suppression baseline quarterly:

1. **Review audit** report
2. **Justify increases** with evidence
3. **Update** `.github/workflows/ci-hard-gates.yml`
4. **Document** in git commit

---

## References

- **Workflow:** `.github/workflows/ci-hard-gates.yml`
- **Suppression Audit:** `audit/ga-evidence/ci/SUPPRESSION_AUDIT.md`
- **Sample Artifact:** `audit/ga-evidence/ci/sample-merge-safe-artifact.json`
- **Jest Config:** `jest.config.cjs`
- **ESLint Config:** `.eslintrc.cjs`
- **TypeScript Config:** `tsconfig.json`

---

## Support

**Questions?** Contact:

- **Engineering Team:** #engineering
- **DevOps:** #devops
- **Security:** #security

**Issues?** File a ticket:

- **CI Failures:** Tag `ci-gates`
- **Policy Questions:** Tag `governance`
- **Suppression Approval:** Tag `code-quality`

---

**Last Updated:** 2025-12-27
**Next Review:** 2026-01-27
**Owner:** Engineering Team
