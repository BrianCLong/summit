# SOC 2 CC8.1 - Change Management Authorization

> **Control:** The entity authorizes, designs, develops or acquires, configures, documents, tests, approves, and implements changes to infrastructure, data, software, and procedures to meet its objectives.
>
> **Category:** Common Criteria
> **Domain:** Change Management
> **Epic:** GA-E3: API Contracts

## Control Objective

Ensure all API changes are authorized, documented, tested, and approved before implementation, with particular focus on preventing unauthorized breaking changes to API contracts.

## Implementation Details

### 1. Authorization Process

**Mechanism:** All API schema changes must pass through CI/CD validation

**Implementation:**

- Schema diff automatically runs on every PR
- Breaking changes trigger explicit warnings
- Merge is blocked if breaking changes detected without version bump
- Platform team approval required for version bumps

**Evidence:**

- CI workflow configuration: `/.github/workflows/schema-diff.yml`
- Merge protection rules in GitHub
- Audit log: `/audit/ga-evidence/api-contracts/audit-log/schema-checks.jsonl`

### 2. Design and Documentation

**Mechanism:** Version policy documents all change categories and requirements

**Implementation:**

- Breaking vs non-breaking changes clearly defined
- Version bump requirements specified
- Migration guide templates provided
- Deprecation timelines documented

**Evidence:**

- Policy document: `/api-schemas/VERSION_POLICY.md`
- API versioning guide: `/docs/API_VERSIONING.md`
- Version registry: `/api-schemas/registry.json`

### 3. Testing

**Mechanism:** Automated schema diffing validates all changes

**Implementation:**

- GraphQL schema comparison
- OpenAPI spec comparison
- Breaking change detection
- Impact categorization (critical/high/medium/low)

**Evidence:**

- Diff script: `/scripts/schema-diff.ts`
- Diff reports: `/audit/ga-evidence/api-contracts/diff-reports/*.json`
- Test results in CI artifacts

### 4. Approval

**Mechanism:** Multi-level approval for different change types

**Implementation:**

- Non-breaking changes: Automated approval if CI passes
- Breaking changes: Blocked until version bump
- Version bumps: Require platform team approval
- All changes: Code review required

**Evidence:**

- GitHub branch protection settings
- PR approval requirements
- CI status checks (required)
- Audit log with approver information

### 5. Implementation

**Mechanism:** Controlled rollout with version snapshots

**Implementation:**

- Schema snapshots created before deployment
- Version registry updated atomically
- Middleware enforces version detection
- Rollback possible via snapshot restoration

**Evidence:**

- Schema snapshots: `/api-schemas/v{VERSION}/`
- Version metadata with timestamps
- Deployment logs
- Version detection middleware: `/server/src/middleware/api-version.ts`

## Evidence Artifacts

### Primary Evidence

| Artifact         | Location                                         | Purpose                      | Retention          |
| ---------------- | ------------------------------------------------ | ---------------------------- | ------------------ |
| Version Policy   | `/api-schemas/VERSION_POLICY.md`                 | Change categorization rules  | Indefinite         |
| Schema Snapshots | `/api-schemas/v{VERSION}/`                       | Immutable contract baselines | Indefinite         |
| Diff Reports     | `/audit/ga-evidence/api-contracts/diff-reports/` | Change analysis              | 7 years            |
| Audit Log        | `/audit/ga-evidence/api-contracts/audit-log/`    | Authorization trail          | 7 years            |
| CI Workflow      | `/.github/workflows/schema-diff.yml`             | Automated enforcement        | Version controlled |

### Supporting Evidence

| Artifact           | Location                                                    | Purpose                      |
| ------------------ | ----------------------------------------------------------- | ---------------------------- |
| Version Middleware | `/server/src/middleware/api-version.ts`                     | Runtime enforcement          |
| OpenAPI Specs      | `/api-schemas/v{VERSION}/openapi-spec-v{VERSION}.json`      | REST API contracts           |
| GraphQL Schemas    | `/api-schemas/v{VERSION}/graphql-schema-v{VERSION}.graphql` | GraphQL contracts            |
| Version Registry   | `/api-schemas/registry.json`                                | Version lifecycle management |

## Control Testing

### Test 1: Unauthorized Breaking Change Prevention

**Test Procedure:**

1. Create PR with breaking change (e.g., remove GraphQL field)
2. Observe CI schema diff check
3. Verify merge is blocked
4. Verify audit log entry created

**Expected Result:**

- ❌ CI check fails
- ❌ Merge button disabled
- ⚠️ Breaking change warning in PR comment
- ✅ Audit log entry with failure status

**Evidence:** PR #[sample-pr], CI run logs, audit log entry

### Test 2: Non-Breaking Change Approval

**Test Procedure:**

1. Create PR with non-breaking change (e.g., add optional field)
2. Observe CI schema diff check
3. Verify merge is allowed after code review
4. Verify audit log entry created

**Expected Result:**

- ✅ CI check passes
- ✅ Merge allowed after approval
- ℹ️ Non-breaking change noted in PR comment
- ✅ Audit log entry with success status

**Evidence:** PR #[sample-pr], CI run logs, audit log entry

### Test 3: Version Bump Authorization

**Test Procedure:**

1. Create PR with breaking changes and version bump
2. Update version registry and create snapshots
3. Request platform team approval
4. Verify merge allowed after approval

**Expected Result:**

- ✅ CI acknowledges version bump
- ✅ New snapshots created
- ✅ Platform team approval obtained
- ✅ Merge succeeds with audit trail

**Evidence:** PR #[sample-pr], snapshot commits, approvals, audit log

### Test 4: Audit Trail Completeness

**Test Procedure:**

1. Review audit log for sample period
2. Verify all required fields present
3. Cross-reference with GitHub PR history
4. Verify 100% coverage of schema changes

**Expected Result:**

- ✅ All PRs affecting schemas have audit entries
- ✅ Timestamps, authors, results captured
- ✅ No gaps in audit trail
- ✅ Audit log is append-only

**Evidence:** Audit log analysis, GitHub comparison

## Compliance Validation

### Required Elements

- [x] Change authorization mechanism exists
- [x] Changes are documented before implementation
- [x] Automated testing validates all changes
- [x] Multi-level approval process enforced
- [x] Implementation is controlled and auditable
- [x] Rollback capability exists
- [x] Audit trail is complete and immutable
- [x] Evidence is accessible to auditors

### Audit Questions

**Q1:** How are API changes authorized?
**A1:** All changes go through PR process with automated CI validation. Breaking changes blocked without version bump and platform team approval.

**Q2:** How is change impact assessed?
**A2:** Automated schema diff categorizes all changes as breaking or non-breaking with severity levels. Recommendations provided based on impact.

**Q3:** Who approves breaking changes?
**A3:** Platform team (minimum 2 approvers) required for version bumps. Non-breaking changes require standard code review (1 approver).

**Q4:** How are changes tested?
**A4:** Automated schema comparison against immutable snapshots. GraphQL and OpenAPI specs validated. Breaking changes detected algorithmically.

**Q5:** Can changes be rolled back?
**A5:** Yes, via immutable schema snapshots. Each version has complete snapshot allowing instant rollback.

**Q6:** How long are audit records retained?
**A6:** 7 years minimum per SOC 2 requirements. Configured in GitHub Actions workflow retention settings.

## Continuous Monitoring

### Metrics

- **Schema Change Frequency:** Track via audit log
- **Breaking Change Rate:** % of changes that are breaking
- **CI Success Rate:** % of schema diff checks that pass
- **Mean Time to Version Bump:** Days from breaking change to new version
- **Audit Log Completeness:** 100% coverage required

### Alerts

- ⚠️ Breaking change without version bump (CI blocks)
- ⚠️ Schema diff check failure
- ⚠️ Audit log write failure
- ⚠️ Version registry inconsistency

### Monthly Review

Platform team reviews:

1. All breaking changes from past month
2. Version bump justifications
3. Deprecation/sunset status
4. Audit log completeness
5. CI workflow health

## Related Controls

- **CC3.1:** Risk Management (breaking change categorization)
- **CC6.6:** Logical and Physical Access Controls (GitHub permissions)
- **CC7.2:** System Monitoring (audit logs)
- **PI1.5:** Processing Integrity (schema validation)

## Revision History

| Date       | Version | Changes                       | Author        |
| ---------- | ------- | ----------------------------- | ------------- |
| 2025-12-27 | 1.0     | Initial control documentation | Platform Team |

---

**Status:** ✅ Implemented and Operational
**Next Audit:** 2026-06-27
**Owner:** Platform Engineering Team
