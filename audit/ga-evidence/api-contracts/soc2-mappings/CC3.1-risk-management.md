# SOC 2 CC3.1 - Risk Management in Design

> **Control:** The entity identifies, assesses, and manages risks associated with the design and development of its services.
>
> **Category:** Common Criteria
> **Domain:** Risk Assessment
> **Epic:** GA-E3: API Contracts

## Control Objective

Systematically identify, assess, and mitigate risks in API design changes, ensuring breaking changes are recognized and managed appropriately.

## Risk Assessment Framework

### Risk Categories for API Changes

#### 1. Breaking Changes (Critical Risk)

**Impact:** Client integration failures, service outages, data corruption

**Examples:**

- Removing endpoints or fields
- Changing field types incompatibly
- Making optional fields required
- Removing enum values

**Mitigation:**

- Automated detection via schema diff
- Mandatory version bump requirement
- Blocked merge until properly versioned
- Migration guide required

**Evidence:** `/scripts/schema-diff.ts` (lines 80-150 - breaking change detection)

#### 2. Non-Breaking Changes (Low Risk)

**Impact:** Minimal - clients unaffected

**Examples:**

- Adding new endpoints
- Adding optional fields
- Adding new enum values
- Making required fields optional

**Mitigation:**

- Documentation updates
- Changelog entries
- Monitoring for adoption

**Evidence:** `/scripts/schema-diff.ts` (lines 200-230 - non-breaking categorization)

#### 3. Deprecations (Medium Risk)

**Impact:** Future breaking change, advance warning needed

**Examples:**

- Marking fields as deprecated
- Announcing endpoint sunset

**Mitigation:**

- 12-month minimum notice period
- Deprecation headers in responses
- Client notifications
- Usage monitoring

**Evidence:** `/api-schemas/VERSION_POLICY.md` (Deprecation Policy section)

## Risk Assessment Implementation

### Automated Risk Detection

**Mechanism:** Schema diff script analyzes all changes

**Risk Scoring:**

```typescript
// From /scripts/schema-diff.ts
const severity = {
  field_removed: "critical",
  type_removed: "critical",
  endpoint_removed: "critical",
  field_type_changed: "high",
  field_made_required: "high",
  method_changed: "high",
  enum_value_removed: "high",
  field_deprecated: "medium",
  field_added: "low",
  type_added: "low",
  endpoint_added: "low",
};
```

**Evidence:** Diff reports categorize each change by severity

### Risk Mitigation Strategies

| Risk Level | Mitigation               | Enforcement      |
| ---------- | ------------------------ | ---------------- |
| Critical   | Version bump required    | CI blocks merge  |
| High       | Version bump recommended | Warning + review |
| Medium     | Documentation required   | Code review      |
| Low        | Changelog entry          | Automated        |

## Risk Assessment Process

### 1. Identification Phase

**When:** On every PR affecting API schemas

**How:** Automated schema diff comparison

**Output:**

- List of all changes
- Categorization (breaking/non-breaking)
- Severity assignment

**Evidence:**

- CI workflow execution logs
- Diff report JSON files
- PR comments with analysis

### 2. Assessment Phase

**When:** Immediately after identification

**How:** Impact analysis and recommendations

**Criteria:**

- Number of clients affected
- Data integrity impact
- Service availability impact
- Migration complexity

**Output:**

- Risk severity (critical/high/medium/low)
- Recommended actions
- Version bump requirement

**Evidence:**

- `recommendations` field in diff reports
- PR review comments
- Architecture decision records

### 3. Mitigation Phase

**When:** Before merge

**How:** Implement required controls

**Actions:**

- Critical: Create new version + migration guide
- High: Version bump or refactor to non-breaking
- Medium: Document deprecation timeline
- Low: Update changelog

**Evidence:**

- New version snapshots
- Migration guides
- Updated documentation
- Approved PR

### 4. Monitoring Phase

**When:** Post-deployment

**How:** Track adoption and issues

**Metrics:**

- Deprecated version usage
- Error rates by version
- Client migration progress
- Support tickets by version

**Evidence:**

- API metrics dashboards
- Deprecation header analytics
- Support ticket tracking

## Evidence Artifacts

### Risk Identification

| Artifact                | Purpose                       | Location                                         |
| ----------------------- | ----------------------------- | ------------------------------------------------ |
| Schema Diff Reports     | Automated risk identification | `/audit/ga-evidence/api-contracts/diff-reports/` |
| Breaking Change List    | Categorized risks             | Diff report `breakingChanges` field              |
| Severity Classification | Risk scoring                  | Diff report `severity` field                     |

### Risk Assessment

| Artifact         | Purpose                    | Location                            |
| ---------------- | -------------------------- | ----------------------------------- |
| Recommendations  | Mitigation guidance        | Diff report `recommendations` field |
| Impact Analysis  | Client impact assessment   | PR review comments                  |
| Version Decision | Risk acceptance/mitigation | Version registry updates            |

### Risk Mitigation

| Artifact            | Purpose                   | Location                         |
| ------------------- | ------------------------- | -------------------------------- |
| Version Snapshots   | Breaking change isolation | `/api-schemas/v{VERSION}/`       |
| Migration Guides    | Client transition support | `/api-schemas/VERSION_POLICY.md` |
| Deprecation Notices | Advance warning           | API response headers             |

## Control Testing

### Test 1: Breaking Change Risk Detection

**Test Procedure:**

1. Modify GraphQL schema to remove a field
2. Create PR
3. Observe schema diff output
4. Verify severity = 'critical'

**Expected Result:**

- ✅ Change detected as breaking
- ✅ Severity correctly assigned
- ✅ Version bump recommended
- ✅ Merge blocked

**Evidence:** Sample diff report showing field_removed with critical severity

### Test 2: Risk Categorization Accuracy

**Test Procedure:**

1. Introduce multiple change types in single PR
2. Run schema diff
3. Verify each change categorized correctly
4. Verify overall risk assessment accurate

**Expected Result:**

- ✅ Breaking changes flagged critical/high
- ✅ Non-breaking changes flagged low
- ✅ Overall assessment reflects highest severity
- ✅ Recommendations appropriate

**Evidence:** Multi-change diff report with varied severities

### Test 3: Mitigation Enforcement

**Test Procedure:**

1. Create PR with critical breaking change
2. Attempt merge without version bump
3. Verify merge blocked
4. Add version bump
5. Verify merge allowed

**Expected Result:**

- ❌ Initial merge blocked
- ✅ Version bump detected
- ✅ Merge allowed after bump
- ✅ Audit trail complete

**Evidence:** CI logs showing block then success

## Risk Register

### Active Risks

| Risk ID | Description                          | Severity | Mitigation                       | Status    |
| ------- | ------------------------------------ | -------- | -------------------------------- | --------- |
| API-001 | Undetected breaking change           | Critical | Automated schema diff            | Mitigated |
| API-002 | Version bump without migration guide | High     | Policy requires documentation    | Mitigated |
| API-003 | Client unaware of deprecation        | Medium   | Response headers + notifications | Mitigated |
| API-004 | Schema snapshot corruption           | Medium   | SHA256 hashing + git versioning  | Mitigated |

### Historical Risks (Resolved)

| Risk ID | Description                  | Resolution                    | Date       |
| ------- | ---------------------------- | ----------------------------- | ---------- |
| API-000 | No version control mechanism | Implemented versioning system | 2025-12-27 |

## Continuous Improvement

### Monthly Risk Review

Platform team reviews:

1. New risks identified
2. Risk mitigation effectiveness
3. Client impact from changes
4. Process improvement opportunities

### Metrics Tracked

- False positive rate (changes flagged incorrectly)
- False negative rate (breaking changes missed)
- Time to mitigate critical risks
- Client impact incidents

### Feedback Loop

- Client feedback on version transitions
- Developer experience with tooling
- Auditor feedback on evidence
- Incident post-mortems

## Related Controls

- **CC8.1:** Change Management (authorization process)
- **PI1.5:** Processing Integrity (schema validation)
- **CC7.2:** System Monitoring (risk metrics)

## Revision History

| Date       | Version | Changes                | Author        |
| ---------- | ------- | ---------------------- | ------------- |
| 2025-12-27 | 1.0     | Initial risk framework | Platform Team |

---

**Status:** ✅ Implemented and Operational
**Next Review:** 2026-06-27
**Owner:** Platform Engineering Team
