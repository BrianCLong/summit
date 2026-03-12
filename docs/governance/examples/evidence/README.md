# S-AOS Evidence Artifact Examples

This directory contains example evidence artifacts that demonstrate the proper structure and content for S-AOS compliance.

---

## Overview

Evidence artifacts are the foundation of S-AOS's "evidence-first" principle. Every PR must produce verifiable evidence appropriate to the change type:

- **Feature/Fix PRs**: Test results, metrics, before/after comparisons
- **Infrastructure PRs**: Deployment logs, health checks, performance baselines
- **Refactoring PRs**: Test coverage, performance benchmarks
- **Automation PRs**: Evidence reports with predictions and audit trails

---

## Example Files

### 1. Entropy Report (`entropy-report-example.json`)

**Purpose**: Evidence artifact from entropy prediction analysis

**Key Sections**:
- **reportId**: Unique identifier for this report
- **scope**: What code/commits were analyzed
- **metrics**: Entropy score, confidence, risk level
- **predictions**: List of predicted issues with probabilities
- **recommendations**: Suggested actions based on predictions
- **calibrationStatus**: Model calibration state (CRITICAL for gating)
- **safetyChecks**: Verification that safety guardrails are active

**Schema**: `schemas/evidence/entropy-report.schema.json`

**Use Case**:
```bash
# Generate entropy report
node scripts/entropy-monitor.mjs --branch=feature/my-feature --output=artifacts/

# Validate against schema
ajv validate -s schemas/evidence/entropy-report.schema.json \
              -d artifacts/repoos/frontier-entropy/report.json
```

**Key Fields Explained**:

- **calibrationStatus.isCalibrated**: Must be `true` for hard controls
- **calibrationStatus.currentF1Score**: Must be ≥ 0.75 for actuation authority
- **calibrationStatus.blocksActuation**: `true` = predictions are informational only
- **safetyChecks.dryRunMode**: `true` = all actions simulated, no real changes

**Current State** (as of 2026-03-11):
- F1 Score: 0.000 (POOR)
- Status: Uncalibrated
- Blocks Actuation: Yes
- All predictions are informational only

### 2. Resurrection Report (`resurrection-report-example.json`)

**Purpose**: Evidence artifact from abandoned commit analysis

**Key Sections**:
- **reportId**: Unique identifier for this report
- **scope**: Repository and commit range analyzed
- **metrics**: Total commits, abandoned branches, candidates
- **triageResults**: 4-lane classification (A/B/C/D)
- **recommendations**: Prioritized actions for each lane
- **calibrationMetrics**: Model accuracy and confusion matrix

**Schema**: `schemas/evidence/resurrection-report.schema.json`

**Use Case**:
```bash
# Run resurrection analysis
node scripts/resurrection-engine.mjs --lookback=30 --output=artifacts/

# Validate against schema
ajv validate -s schemas/evidence/resurrection-report.schema.json \
              -d artifacts/history-quick/report.json
```

**Lane Classification**:

| Lane | Priority | Description | Typical Actions |
|------|----------|-------------|-----------------|
| A | URGENT | Critical work abandoned mid-flight | page_oncall, create_incident |
| B | HIGH | High-value work stalled | flag_for_review, notify |
| C | MEDIUM | Potentially valuable but uncertain | notify, manual review |
| D | LOW | Low priority or superseded | archive, ignore |

**Key Fields Explained**:

- **triageResults.laneA.commits[].signals**: Indicators used for classification
  - `partialFeature`: Feature incomplete
  - `hasTests`: Tests written
  - `securityImpact`: Security implications
  - `businessValue`: Business priority

- **calibrationMetrics.calibrationAccuracy**: 0.625 = 62.5% accuracy
  - Target: 0.75 (75%)
  - Status: ACCEPTABLE (but below target)

### 3. Audit Log (`audit-log-example.json`)

**Purpose**: Immutable audit trail of all entropy/resurrection actions

**Key Sections**:
- **actionId**: Unique identifier for this action
- **evidenceId**: Links to the evidence report that triggered this action
- **type**: Action type (notify, flag_for_review, page_oncall, etc.)
- **status**: Action state (pending_approval, executed, denied)
- **approval**: Approval workflow details (if required)
- **result**: Execution outcome
- **signature**: HMAC-SHA256 signature for tamper detection

**NOT Schema-Validated**: Audit logs use signature verification instead

**Use Case**:
```bash
# View audit trail
cat artifacts/repoos/entropy-actions/audit.json | jq '.'

# Verify signatures
node services/repoos/immutable-audit-logger.mjs verify
```

**Action Lifecycle Example**:

1. **Prediction Made** (entropy report generated)
   ```json
   {
     "actionId": "action-001",
     "type": "page_oncall",
     "status": "pending_approval",
     "approval": { "required": true, "obtained": null }
   }
   ```

2. **Approval Requested** (Slack notification sent)
   - User clicks "Approve" or "Deny" button in Slack

3. **Approval Received**
   ```json
   {
     "actionId": "action-001",
     "status": "executed",
     "approval": {
       "required": true,
       "obtained": "approved",
       "approver": "security-lead@example.com"
     }
   }
   ```

4. **Action Executed** (PagerDuty incident created)
   ```json
   {
     "result": {
       "success": true,
       "pagerDutyIncidentId": "INCIDENT-789"
     }
   }
   ```

**Signature Verification**:

Each entry has a `signature` field:
- Computed using HMAC-SHA256 with secret key
- Includes all fields except `signature` itself
- Constant-time comparison prevents timing attacks
- Tampered entries fail verification

---

## Schema Validation

### Install AJV (JSON Schema Validator)

```bash
npm install -g ajv-cli
```

### Validate Examples

```bash
# Entropy report
ajv validate -s schemas/evidence/entropy-report.schema.json \
              -d docs/governance/examples/evidence/entropy-report-example.json

# Resurrection report
ajv validate -s schemas/evidence/resurrection-report.schema.json \
              -d docs/governance/examples/evidence/resurrection-report-example.json
```

### Expected Output

```
docs/governance/examples/evidence/entropy-report-example.json valid
docs/governance/examples/evidence/resurrection-report-example.json valid
```

---

## Using These Examples

### For PR Authors

When creating a PR that runs entropy/resurrection analysis:

1. **Generate Evidence**:
   ```bash
   # Run analysis
   node scripts/entropy-monitor.mjs --branch=$(git branch --show-current)

   # Check output
   cat artifacts/repoos/frontier-entropy/report.json
   ```

2. **Validate Evidence**:
   ```bash
   # Validate against schema
   node scripts/verify-s-aos-compliance.mjs
   ```

3. **Include in PR**:
   - Link to evidence artifacts in PR description
   - Paste key metrics/findings
   - Explain any anomalies or warnings

### For Reviewers

When reviewing a PR with evidence artifacts:

1. **Verify Schema Compliance**:
   ```bash
   # Should pass in CI, but can run locally
   node scripts/verify-s-aos-compliance.mjs
   ```

2. **Check Key Fields**:
   - **Entropy**: `calibrationStatus`, `safetyChecks`, `riskLevel`
   - **Resurrection**: `triageResults`, `calibrationMetrics`, `recommendations`
   - **Audit**: `signature` verification passes

3. **Validate Claims**:
   - Do predictions match the code changes?
   - Are recommended actions appropriate?
   - Are safety checks enabled?

### For Platform Teams

When deploying automation that generates evidence:

1. **Test with Examples**:
   ```bash
   # Copy example to artifacts directory
   cp docs/governance/examples/evidence/entropy-report-example.json \
      artifacts/repoos/frontier-entropy/report.json

   # Run validation
   node scripts/verify-s-aos-compliance.mjs

   # Should see: ✅ All compliance checks passed
   ```

2. **Use as Templates**:
   ```javascript
   import exampleReport from './docs/governance/examples/evidence/entropy-report-example.json';

   // Modify with real data
   const report = {
     ...exampleReport,
     reportId: `entropy-${Date.now()}`,
     timestamp: new Date().toISOString(),
     // ... update other fields
   };
   ```

3. **Integrate with CI/CD**:
   - CI validates evidence against schemas
   - Blocks merge if validation fails
   - See: `.github/workflows/s-aos-compliance.yml`

---

## Common Mistakes

### ❌ Missing Required Fields

```json
{
  "reportId": "entropy-001",
  // ❌ Missing "timestamp", "version", "evidenceType"
  "metrics": { ... }
}
```

**Error**: Schema validation fails

**Fix**: Include all required fields from schema

### ❌ Invalid Enum Values

```json
{
  "calibrationStatus": {
    "status": "bad"  // ❌ Invalid - must be POOR/ACCEPTABLE/GOOD/EXCELLENT
  }
}
```

**Error**: Schema validation fails on enum mismatch

**Fix**: Use valid enum values from schema

### ❌ Tampered Audit Entries

```json
{
  "actionId": "action-001",
  "type": "notify",  // ✏️ Changed after signing
  "signature": "abc123..."  // ❌ Signature now invalid
}
```

**Error**: Signature verification fails

**Fix**: Never manually edit audit trail - entries are immutable

### ❌ Missing Calibration Status

```json
{
  "reportId": "entropy-001",
  "metrics": { "entropyScore": 0.75 },
  // ❌ Missing "calibrationStatus" section
}
```

**Error**: Cannot determine if predictions are reliable

**Fix**: Always include `calibrationStatus` with current F1 score

---

## Advanced Usage

### Generating Test Data

Use examples as fixtures for integration tests:

```javascript
import { describe, it, expect } from 'vitest';
import entropyExample from './examples/evidence/entropy-report-example.json';
import { validateEntropyReport } from './validators';

describe('Entropy Report Validation', () => {
  it('validates example report', () => {
    expect(validateEntropyReport(entropyExample)).toBe(true);
  });

  it('detects missing calibration status', () => {
    const invalid = { ...entropyExample };
    delete invalid.calibrationStatus;
    expect(validateEntropyReport(invalid)).toBe(false);
  });
});
```

### Mocking for Development

Use examples when developing features that consume evidence:

```javascript
// Mock entropy service for development
class MockEntropyService {
  async generateReport(branch) {
    // Return example report instead of running analysis
    const example = await import('./examples/evidence/entropy-report-example.json');
    return {
      ...example,
      scope: { frontierBranch: branch }
    };
  }
}
```

### CI/CD Integration

Validate evidence in CI pipeline:

```yaml
- name: Validate Evidence Artifacts
  run: |
    # Install AJV
    npm install -g ajv-cli

    # Validate all reports
    for report in artifacts/*/report.json; do
      schema=$(determine_schema "$report")
      ajv validate -s "$schema" -d "$report"
    done
```

---

## Resources

### Schemas
- `schemas/evidence/entropy-report.schema.json` - Entropy report structure
- `schemas/evidence/resurrection-report.schema.json` - Resurrection report structure

### Documentation
- [Evidence Contract Spec](../../EVIDENCE_CONTRACT_SPEC.md) - Complete specification
- [S-AOS Compliance Scorecard](../../S-AOS_COMPLIANCE_SCORECARD.md) - Scoring rubric
- [S-AOS Examples: Good vs Bad](../../S-AOS_EXAMPLES_GOOD_VS_BAD.md) - Real examples

### Tools
- `scripts/verify-s-aos-compliance.mjs` - Automated validation
- `services/repoos/immutable-audit-logger.mjs` - Audit trail management
- `.github/workflows/s-aos-compliance.yml` - CI/CD automation

---

## Questions?

**Q: Do I need to generate evidence for every PR?**
A: Only for PRs that run automation (entropy/resurrection analysis). Standard feature/fix PRs need test results, but not necessarily these specific reports.

**Q: What if my evidence doesn't match the schema?**
A: CI will block the merge. Run `node scripts/verify-s-aos-compliance.mjs` locally to debug.

**Q: Can I manually edit evidence artifacts?**
A: Yes for reports (entropy/resurrection), NO for audit logs (immutable).

**Q: What if calibration F1 is 0.000?**
A: Predictions are informational only. Hard controls (throttle, freeze) remain GATED until F1 ≥ 0.75.

---

**Last Updated**: 2026-03-11
**Maintainer**: Platform Architecture Team
