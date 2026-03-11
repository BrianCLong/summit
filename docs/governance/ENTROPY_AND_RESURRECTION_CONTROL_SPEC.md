# Entropy & Resurrection Control Systems - Governance Specification

**Version:** 1.0.0
**Status:** Draft
**Last Updated:** 2026-03-11
**Approval Required:** Platform Architecture Board

---

## Executive Summary

This document specifies the governance model for the Frontier Entropy Monitor and Historical Resurrection System - automated control primitives that regulate frontier chaos and facilitate cross-frontier integration.

**Scope**: Evidence contracts, control-loop actuation, triage classification, calibration requirements, and operational governance.

**Intent**: Transform these systems from "implemented and operational" to **production-governing infrastructure** with formal evidence contracts, calibration requirements, and actuation authority.

---

## 1. System Classification

### 1.1 Control Authority

Both systems are classified as **Tier 1 Control Primitives** with the following authorities:

| System | Authority Level | Scope | Approval Required |
|--------|----------------|-------|-------------------|
| Entropy Monitor | **Observation + Advisory** | Frontier state tracking | No |
| Entropy Actuator | **Limited Enforcement** | Throttling, notifications | Varies by action |
| Resurrection System | **Discovery + Classification** | Historical candidate identification | No |

### 1.2 Critical Actions

Actions requiring **manual approval**:

1. **Freeze Frontier** (`freeze_frontier`)
   - Blocks all non-emergency frontier operations
   - Approval: Platform lead or on-call engineer
   - SLA: 15 minutes for approval decision

2. **Force Convergence** (`initiate_convergence` with mode="emergency")
   - Currently auto-approved but generates incident
   - **Recommendation**: Require approval for production deployment

3. **Policy Changes**
   - Any modification to `config/entropy-policy.json`
   - Approval: Platform Architecture Board
   - Process: PR review + calibration validation

### 1.3 Audit Requirements

All control actions MUST be logged with:
- Evidence ID (traceability to source state)
- Timestamp (when action occurred)
- Trigger (what condition caused action)
- Approval status (auto-approved, manual-approved, pending, denied)
- Outcome (executed, failed, skipped)

**Retention**: 90 days minimum (configurable in policy)

---

## 2. Evidence Contracts

### 2.1 Deterministic Artifacts

All systems MUST emit deterministic evidence artifacts that:

1. **Exclude timestamps** from primary report
2. **Include source commit** (40-character SHA)
3. **Include source branch** name
4. **Include evidence ID** (unique, reproducible hash)
5. **Conform to JSON Schema** (versioned)

### 2.2 Evidence Schema Versioning

| Schema | Version | Location | Status |
|--------|---------|----------|--------|
| Entropy Report | v1.0.0 | `schemas/evidence/entropy-report.schema.json` | Active |
| Resurrection Report | v1.0.0 | `schemas/evidence/resurrection-report.schema.json` | Active |
| Calibration Report | v1.0.0 | `schemas/evidence/calibration-report.schema.json` | Pending |

**Breaking Changes**: Require major version bump + migration plan

**Schema Evolution**:
- Additive fields: Minor version bump
- Optional fields: Patch version bump
- Field removal/rename: Major version bump

### 2.3 Evidence Artifact Locations

#### Entropy Monitor
```
artifacts/repoos/frontier-entropy/
├── report.json         # Deterministic (schema-compliant)
├── stamp.json          # Non-deterministic (timestamps)
└── state.json          # Persistent history
```

#### Actuator
```
artifacts/repoos/entropy-actions/
├── audit.json          # Full audit trail
└── actions.log         # Text log (append-only)
```

#### Resurrection System
```
artifacts/history-quick/
├── report.json         # Deterministic (schema-compliant)
└── stamp.json          # Non-deterministic (timestamps)
```

#### Calibration Harnesses
```
artifacts/repoos/entropy-calibration/
├── report.json
└── stamp.json

artifacts/repoos/resurrection-calibration/
├── report.json
└── stamp.json
```

### 2.4 Evidence Admissibility Criteria

For evidence to be admissible in governance processes:

1. ✅ **Schema Compliance**: Must validate against declared schema version
2. ✅ **Source Traceability**: Must include valid git commit SHA
3. ✅ **Reproducibility**: Re-running with same input MUST produce same deterministic report
4. ✅ **Timestamp Separation**: Timestamps isolated to stamp.json
5. ✅ **Evidence Chain**: Each evidence artifact references prior artifacts in chain

---

## 3. Control-Loop Actuation

### 3.1 Entropy as Actuator (Not Dashboard)

**Principle**: Entropy monitoring is a **control-loop actuator**, not passive observation.

**Control Flow**:
```
Monitor (Observe) → Policy (Decide) → Actuator (Execute) → Audit (Record)
```

**Key Distinction**:
- ❌ **Dashboard Model**: Human reads entropy, decides what to do
- ✅ **Actuator Model**: System reads entropy, executes policy-driven actions

### 3.2 Policy Configuration

Policy is centralized in `config/entropy-policy.json` with structure:

```json
{
  "thresholds": {
    "stable": { "maxVelocity": 0.001, "actions": [...] },
    "watch": { "maxVelocity": 0.005, "actions": [...] },
    "warning": { "maxVelocity": 0.01, "actions": [...] },
    "critical": { "maxVelocity": null, "actions": [...] }
  },
  "prediction": {
    "timeBands": { "<1h": {...}, "<24h": {...}, ... }
  },
  "actuation": {
    "enabled": true,
    "dryRun": false,
    "hooks": [...]
  },
  "governance": {
    "auditLog": true,
    "evidenceRetention": "90d",
    "requireApproval": { ... }
  }
}
```

### 3.3 Action Types

| Action | Approval | Reversible | Impact |
|--------|----------|------------|--------|
| `notify` | Auto | N/A | Informational |
| `page_oncall` | Auto | No | Alert |
| `flag_for_review` | Auto | Yes | Administrative |
| `throttle_frontier` | Auto | Yes | Rate limiting |
| `freeze_frontier` | **Manual** | Yes | **Blocking** |
| `initiate_convergence` | Auto* | No | Workflow |
| `create_incident` | Auto | No | Administrative |
| `escalate_monitoring` | Auto | Yes | Monitoring |

*Recommendation: Require manual approval for production

### 3.4 Dry-Run Mode

**Purpose**: Test policy changes without executing actions

**Activation**:
```bash
# Via environment
DRY_RUN=true node scripts/orchestrator/entropy-control-loop.mjs

# Via policy
# Set actuation.dryRun: true in config/entropy-policy.json
```

**Effect**: All actions log "[DRY RUN]" prefix and do not execute

---

## 4. Triage Classification

### 4.1 Resurrection Lane Model

Four-lane triage system for resurrection candidates:

| Lane | Score Range | Patch Size | Criteria | SLA |
|------|-------------|------------|----------|-----|
| **A** | ≥ 120 | 50-500 LOC | High-value, merge-ready | 24h |
| **B** | 80-119 | 500-2000 LOC | Needs synthesis/review | 3d |
| **C** | 40-79 | Any | Informational/low-priority | 7d |
| **D** | < 40 | Any | Duplicate/obsolete | None |

### 4.2 Lane Assignment Algorithm

**Inputs**:
- Recency score (0-100, newer = higher)
- Patch size score (0-50, moderate = optimal)
- File count score (0-30, more files = higher)
- Concern type (categorical)
- Duplicate detection (boolean)

**Scoring Formula**:
```
score = recency + patchSize + fileCount

recency = max(0, 100 - ageInDays * 10)
patchSize = {
  50 if 50 ≤ size ≤ 500
  size if size < 50
  max(0, 50 - (size - 500)/10) if size > 500
}
fileCount = min(count * 5, 30)
```

**Lane Thresholds**:
- **Lane A**: score ≥ 120 AND 50 ≤ patchSize ≤ 500
- **Lane B**: score ≥ 80 OR (500 < patchSize ≤ 2000)
- **Lane C**: score ≥ 40 OR concern == "documentation"
- **Lane D**: score < 40 OR duplicate == true

### 4.3 Duplicate Detection

**Method**: Subject normalization + file overlap signature

**Algorithm**:
1. Normalize commit subject (remove tags, PR numbers, ports)
2. Create file signature (first 5 files, sorted)
3. Hash: `subject::fileSignature`
4. If signature seen before → duplicate = true

**Example**:
```
Original: "feat: add login (Port) (#12345)"
Normalized: "feat: add login"
Files: ["client/login.tsx", "server/auth.ts"]
Signature: "feat: add login::client/login.tsx|server/auth.ts"
```

### 4.4 Lane Governance

**Lane A (Merge-Ready)**:
- Automatically flagged for immediate review
- Requires at least 1 maintainer approval
- CI/CD must pass
- Merged within 24h SLA

**Lane B (Synthesis)**:
- May require breakdown into smaller patches
- Coordinate with original author if available
- Review within 3d SLA

**Lane C (Backlog)**:
- Tracked in resurrection backlog
- Reviewed during sprint planning
- No strict SLA

**Lane D (Archive)**:
- Verify duplicate status before discarding
- Document reason in audit log
- No merge action

---

## 5. Calibration Requirements

### 5.1 Calibration Frequency

| System | Frequency | Trigger |
|--------|-----------|---------|
| Entropy Predictor | Weekly | Routine |
| Entropy Predictor | Immediate | After policy threshold change |
| Resurrection Scorer | Biweekly | Routine |
| Resurrection Scorer | Immediate | After scoring formula change |

### 5.2 Calibration Metrics

**Entropy Calibration**:
- Confusion Matrix (TP, FP, TN, FN)
- Accuracy, Precision, Recall, F1 Score
- **Acceptance Threshold**: F1 ≥ 0.75 (GOOD) for production deployment

**Resurrection Calibration**:
- Per-lane accuracy (A, B, C, D)
- Overall accuracy
- **Acceptance Threshold**: Overall accuracy ≥ 75% (GOOD)

### 5.3 Calibration Governance

1. **Excellent** (F1 ≥ 0.9, Acc ≥ 90%): Deploy immediately
2. **Good** (F1 ≥ 0.75, Acc ≥ 75%): Deploy with monitoring
3. **Acceptable** (F1 ≥ 0.5, Acc ≥ 50%): Deploy to staging only
4. **Poor** (F1 < 0.5, Acc < 50%): **DO NOT DEPLOY**

**Process**:
- Poor calibration triggers mandatory review
- Platform Architecture Board must approve deployment
- Requires retraining or parameter tuning

### 5.4 Calibration Evidence

All calibration runs MUST produce:
- Calibration report (schema-compliant)
- Timestamp stamp
- Confusion matrix or accuracy breakdown
- Recommendation (excellent/good/acceptable/poor)

**Storage**: Same evidence artifact pattern as primary systems

---

## 6. Operational Governance

### 6.1 Monitoring Requirements

**SLIs (Service Level Indicators)**:
1. Evidence artifact generation rate (artifacts/hour)
2. Entropy assessment distribution (% stable, watch, warning, critical)
3. Actuator action success rate (% executed vs failed)
4. Lane distribution (% A, B, C, D)
5. Calibration drift (F1 score trend)

**SLOs (Service Level Objectives)**:
1. Evidence artifacts generated within 60s of sample
2. Entropy assessment ≤ WARNING 95% of time
3. Actuator success rate ≥ 95%
4. Lane A accuracy ≥ 80%
5. Calibration F1 ≥ 0.75

**SLAs (Service Level Agreements)**:
1. CRITICAL entropy response within 30 minutes
2. Lane A candidates reviewed within 24 hours
3. Calibration runs weekly (no gaps)

### 6.2 Change Management

**Policy Changes** (`config/entropy-policy.json`):
1. Create PR with rationale
2. Run calibration harness
3. Attach calibration report to PR
4. Require Platform Architecture Board approval
5. Deploy to staging first
6. Monitor for 48h
7. Promote to production

**Scoring Algorithm Changes**:
1. Create PR with test cases
2. Run resurrection calibration
3. Compare lane accuracy before/after
4. Require ≥2 maintainer approvals
5. Deploy to staging first

**Schema Changes**:
1. Follow semantic versioning
2. Provide migration script for breaking changes
3. Support N-1 version compatibility during migration
4. Update all consumers before deprecating old schema

### 6.3 Incident Response

**Runaway Actuator**:
- Symptom: >10 actions/minute
- Response: Enable dry-run mode immediately
- Investigation: Review audit log for trigger
- Resolution: Fix policy or disable actuator

**Calibration Drift**:
- Symptom: F1 score drops below 0.5
- Response: Alert platform team
- Investigation: Run calibration harness
- Resolution: Retrain or adjust thresholds

**Evidence Corruption**:
- Symptom: Schema validation failures
- Response: Quarantine corrupted artifacts
- Investigation: Check git state, file permissions
- Resolution: Regenerate from source commit

---

## 7. Access Control

### 7.1 Artifact Access

| Role | Read Evidence | Write Evidence | Modify Policy | Approve Actions |
|------|---------------|----------------|---------------|-----------------|
| Operator | ✅ | ❌ | ❌ | ❌ |
| On-Call Engineer | ✅ | ❌ | ❌ | ✅ (freeze_frontier only) |
| Platform Lead | ✅ | ❌ | ✅ (via PR) | ✅ |
| Architecture Board | ✅ | ❌ | ✅ | ✅ |
| System (Actuator) | ✅ | ✅ | ❌ | ✅ (auto-approved actions) |

### 7.2 Audit Log Access

- **Read**: All engineers
- **Write**: System only (append-only)
- **Modify/Delete**: **PROHIBITED** (immutable log)

**Retention**: 90 days (configurable)
**Backup**: Daily to immutable storage

---

## 8. Compliance & Attestation

### 8.1 Evidence Chain of Custody

Each evidence artifact MUST:
1. Reference source git commit (immutable)
2. Include schema version (versioned contract)
3. Generate unique evidence ID (traceability)
4. Maintain timestamp separation (determinism)

### 8.2 Reproducibility

**Requirement**: Given the same source commit state, regenerating evidence MUST produce identical deterministic reports (excluding timestamps).

**Verification**:
```bash
# Generate report 1
COMMIT=$(git rev-parse HEAD)
node services/repoos/frontier-entropy.mjs test
cp artifacts/repoos/frontier-entropy/report.json report1.json

# Generate report 2
node services/repoos/frontier-entropy.mjs test
cp artifacts/repoos/frontier-entropy/report.json report2.json

# Compare (excluding evidenceId which includes timestamp)
diff <(jq 'del(.evidenceId)' report1.json) <(jq 'del(.evidenceId)' report2.json)
# Should be empty (identical)
```

### 8.3 Attestation

Platform Architecture Board MUST attest to:
1. **Policy correctness**: Thresholds align with operational reality
2. **Calibration validity**: Harnesses accurately measure performance
3. **Evidence integrity**: Artifacts conform to governance requirements
4. **Actuation safety**: Critical actions require appropriate approval

**Attestation Frequency**: Quarterly or after major system changes

---

## 9. Future Enhancements

### 9.1 Planned Capabilities

1. **Multi-Repository Support**
   - Extend entropy monitoring to track cross-repo frontier
   - Federated resurrection across multiple repositories

2. **Machine Learning Integration**
   - Train ML models on historical calibration data
   - Adaptive threshold adjustment

3. **Advanced Duplicate Detection**
   - Semantic similarity (not just syntactic)
   - File content hashing (not just names)

4. **Real-Time Dashboard**
   - Live entropy velocity streaming
   - Interactive lane assignment

5. **Policy as Code**
   - GitOps for policy deployment
   - A/B testing for threshold changes

### 9.2 Research Questions

1. **Optimal Velocity Thresholds**: Are current thresholds (0.001, 0.005, 0.01) optimal?
2. **Time-Band Accuracy**: How accurate are predictions across different time bands?
3. **Lane Boundary Tuning**: Can Lane B/C boundary (score 80) be improved?
4. **Duplicate Detection Precision**: What is the false positive rate?

---

## 10. Appendices

### Appendix A: Evidence Schema Examples

See:
- `schemas/evidence/entropy-report.schema.json`
- `schemas/evidence/resurrection-report.schema.json`

### Appendix B: Operator Runbook

See: `docs/operations/ENTROPY_RESURRECTION_RUNBOOK.md`

### Appendix C: Calibration Methodology

See:
- `scripts/orchestrator/entropy-calibration.mjs`
- `scripts/orchestrator/resurrection-calibration.mjs`

### Appendix D: Policy Configuration

See: `config/entropy-policy.json`

---

## Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Platform Lead | [TBD] | __________ | ________ |
| Architecture Board Chair | [TBD] | __________ | ________ |
| Security Lead | [TBD] | __________ | ________ |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-03-11 | Claude (AI Assistant) | Initial governance specification |

---

**END OF DOCUMENT**
