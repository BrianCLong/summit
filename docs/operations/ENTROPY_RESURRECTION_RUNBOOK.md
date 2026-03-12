# Entropy & Resurrection Control Plane - Operator Runbook

**Version:** 1.0.0
**Last Updated:** 2026-03-11
**Audience:** Platform operators, SREs, on-call engineers

## Overview

This runbook covers operational procedures for the Frontier Entropy Monitor and Historical Resurrection System - the Stage 6/7 control primitives that govern frontier chaos and automated integration.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  Entropy Control Loop                        │
│  ┌────────────┐    ┌────────────┐    ┌──────────────┐      │
│  │  Monitor   │───▶│  Actuator  │───▶│   Actions    │      │
│  │ (Observe)  │    │ (Decide)   │    │  (Execute)   │      │
│  └────────────┘    └────────────┘    └──────────────┘      │
│         │                  │                   │             │
│         ▼                  ▼                   ▼             │
│   Evidence Artifacts  Policy Enforcement  Audit Logs        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Resurrection Pipeline                           │
│  ┌────────────┐    ┌────────────┐    ┌──────────────┐      │
│  │   Mining   │───▶│  Scoring   │───▶│Triage Lanes  │      │
│  │ (Discover) │    │ (Evaluate) │    │  (Classify)  │      │
│  └────────────┘    └────────────┘    └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Evidence Artifacts

All systems emit deterministic evidence artifacts:

### Entropy Monitor
- **Report**: `artifacts/repoos/frontier-entropy/report.json` (deterministic)
- **Stamp**: `artifacts/repoos/frontier-entropy/stamp.json` (timestamps)
- **State**: `artifacts/repoos/frontier-entropy/state.json` (persistent history)

### Actuator
- **Audit**: `artifacts/repoos/entropy-actions/audit.json` (action log)
- **Actions**: `artifacts/repoos/entropy-actions/actions.log` (text log)

### Resurrection System
- **Report**: `artifacts/history-quick/report.json` (deterministic)
- **Stamp**: `artifacts/history-quick/stamp.json` (timestamps)

### Calibration Harnesses
- **Entropy Cal**: `artifacts/repoos/entropy-calibration/report.json`
- **Resurrection Cal**: `artifacts/repoos/resurrection-calibration/report.json`

## Daily Operations

### Routine Monitoring

**Frequency**: Every 4 hours during business hours

1. Check entropy assessment:
   ```bash
   node services/repoos/frontier-entropy.mjs report
   ```

2. Check actuator history:
   ```bash
   node services/repoos/entropy-actuator.mjs report
   ```

3. Check resurrection candidates:
   ```bash
   LOOKBACK_DAYS=1 MAX_COMMITS=20 node scripts/orchestrator/quick-resurrect.mjs
   ```

### Evidence Review

**Frequency**: Daily

1. Verify evidence artifacts are being generated:
   ```bash
   ls -lt artifacts/repoos/frontier-entropy/ | head -5
   ls -lt artifacts/history-quick/ | head -5
   ```

2. Check schema compliance (manual):
   - Evidence IDs follow pattern: `entropy-[0-9a-f]{8}`
   - Reports contain schemaVersion: "1.0.0"
   - Source commits are 40-character SHAs

3. Review audit trail for control actions:
   ```bash
   tail -50 artifacts/repoos/entropy-actions/actions.log
   ```

## Alert Response Procedures

### Entropy Assessment Levels

#### STABLE (Velocity < 0.001)
- **Action**: None required
- **Recommendation**: Continue normal operations

#### WATCH (Velocity 0.001-0.005)
- **Action**: Review monitoring
- **Recommendation**: Monitor for trends
- **Escalation**: None

#### WARNING (Velocity 0.005-0.01)
- **Action**:
  1. Review resurrection candidates (Lane A/B)
  2. Check for high-value merges ready to land
  3. Consider preemptive convergence planning
- **Recommendation**: Frontier consolidation within 24-48h
- **Escalation**: Notify platform lead

#### CRITICAL (Velocity > 0.01)
- **Action**:
  1. **IMMEDIATE**: Review emergency convergence protocol
  2. Check actuator actions executed
  3. If `freeze_frontier` is pending approval, evaluate and approve/deny
  4. Coordinate with on-call engineer
- **Recommendation**: Initiate emergency convergence
- **Escalation**: Page on-call immediately
- **SLA**: Respond within 30 minutes

### Acceleration Detection

When acceleration is detected (3+ consecutive velocity increases):

1. **Verify**: Check velocity history in report.json
2. **Assess**: Determine if pattern is sustained or transient
3. **Act**:
   - If sustained: Escalate to WARNING protocol
   - If transient: Document and monitor

### Prediction Bands

| Time Band | Meaning | Action |
|-----------|---------|--------|
| `stable` | Insufficient data or not approaching | Monitor |
| `<1h` | Instability within 1 hour | Immediate intervention |
| `<24h` | Instability within 24 hours | Prepare convergence |
| `1-3d` | Instability in 1-3 days | Schedule review |
| `>3d` | Instability beyond 3 days | Track |

**Note**: Low-confidence predictions with `<1h` are suppressed and shown as `stable` to prevent operator alarm fatigue.

## Resurrection Triage Lanes

### Lane A: High-Value Merge-Ready
- **Criteria**: Score ≥ 120, patch size 50-500 LOC
- **Action**: Prioritize for immediate review and merge
- **SLA**: Review within 24 hours
- **Process**:
  1. Review candidate diff
  2. Run local tests
  3. Merge if clean
  4. Monitor post-merge

### Lane B: Needs Synthesis/Review
- **Criteria**: Score 80-119 OR patch size 500-2000 LOC
- **Action**: Requires synthesis or breakdown
- **SLA**: Review within 3 days
- **Process**:
  1. Assess complexity
  2. Break into smaller patches if needed
  3. Coordinate with original author if available
  4. Merge incrementally

### Lane C: Informational/Low-Priority
- **Criteria**: Score 40-79 OR documentation
- **Action**: Backlog for future integration
- **SLA**: Review within 7 days
- **Process**:
  1. Document in backlog
  2. Review during sprint planning
  3. Merge when bandwidth allows

### Lane D: Duplicate/Obsolete
- **Criteria**: Score < 40 OR detected as duplicate
- **Action**: Archive or discard
- **SLA**: None
- **Process**:
  1. Verify duplicate status
  2. Close or archive
  3. Document reason

## Control Actions Reference

### Notify
- **Type**: Informational
- **Approval**: Auto-approved
- **Effect**: Send notification to monitoring channel

### Page OnCall
- **Type**: Alert
- **Approval**: Auto-approved
- **Effect**: Trigger PagerDuty alert

### Flag for Review
- **Type**: Administrative
- **Approval**: Auto-approved
- **Effect**: Create review ticket

### Throttle Frontier
- **Type**: Rate limiting
- **Approval**: Auto-approved
- **Effect**: Reduce concurrent branch limit

### Freeze Frontier
- **Type**: **DESTRUCTIVE**
- **Approval**: **MANUAL REQUIRED**
- **Effect**: Block all non-emergency frontier operations
- **Process**:
  1. Review actuator audit log
  2. Assess current entropy state
  3. Coordinate with team lead
  4. Approve via manual intervention (policy update)
  5. Communicate freeze to team

### Initiate Convergence
- **Type**: Workflow
- **Approval**: Auto-approved
- **Effect**: Trigger convergence automation

### Create Incident
- **Type**: Administrative
- **Approval**: Auto-approved
- **Effect**: Create incident in IMS

## Calibration Procedures

### Entropy Calibration

**Frequency**: Weekly or after threshold changes

1. Run calibration harness:
   ```bash
   node scripts/orchestrator/entropy-calibration.mjs
   ```

2. Review results:
   - **Excellent** (F1 ≥ 0.9): No action needed
   - **Good** (F1 ≥ 0.75): Document and monitor
   - **Acceptable** (F1 ≥ 0.5): Schedule recalibration review
   - **Poor** (F1 < 0.5): **DO NOT DEPLOY** - retrain model

3. If recalibration needed:
   - Review `config/entropy-policy.json` thresholds
   - Adjust velocity thresholds or time-band logic
   - Re-run calibration
   - Update change log

### Resurrection Calibration

**Frequency**: Biweekly or after scoring changes

1. Run calibration harness:
   ```bash
   node scripts/orchestrator/resurrection-calibration.mjs
   ```

2. Review lane accuracy:
   - **Excellent** (≥ 90%): No action
   - **Good** (≥ 75%): Monitor
   - **Acceptable** (≥ 50%): Review lane thresholds
   - **Poor** (< 50%): Revise scoring algorithm

3. Tuning parameters:
   - Recency weight (currently 100 max)
   - Patch size optimal range (currently 50-500)
   - File count weight (currently 5 per file)
   - Lane score thresholds (A: 120, B: 80, C: 40)

## Troubleshooting

### Entropy Monitor Not Generating Reports

**Symptoms**: No report.json or stamp.json in artifacts directory

**Diagnosis**:
```bash
# Check if monitor has been initialized
ls artifacts/repoos/frontier-entropy/state.json

# Check recent samples
node services/repoos/frontier-entropy.mjs report
```

**Resolution**:
1. If state.json missing: Run test mode to generate samples
   ```bash
   node services/repoos/frontier-entropy.mjs test
   ```
2. Check file permissions on artifacts directory
3. Verify git is available (needed for source commit/branch detection)

### Actuator Actions Not Executing

**Symptoms**: Audit log shows "pending" or "failed" status

**Diagnosis**:
```bash
# Check actuator audit trail
cat artifacts/repoos/entropy-actions/audit.json | jq '.[] | select(.status != "executed")'
```

**Common Causes**:
- Dry-run mode enabled (check `config/entropy-policy.json`)
- Action requires manual approval
- Integration not implemented (stub actions)

**Resolution**:
1. For dry-run: Set `actuation.dryRun: false` in policy
2. For manual approval: Review and approve via policy update
3. For stub actions: Implement actual integrations (Slack, PagerDuty, etc.)

### Resurrection Producing Too Many Lane D Candidates

**Symptoms**: >50% of candidates in Lane D

**Diagnosis**: Duplicate detection too aggressive or score calibration off

**Resolution**:
1. Review duplicate detection signature algorithm
2. Run resurrection calibration
3. Adjust score weights if needed
4. Consider lookback window (may be too long)

## Escalation Matrix

| Severity | Condition | Response Time | Escalate To |
|----------|-----------|---------------|-------------|
| P4 | STABLE/WATCH | Best effort | None |
| P3 | WARNING + prediction >3d | 4 hours | Platform lead |
| P2 | WARNING + prediction 1-3d | 2 hours | On-call engineer |
| P1 | CRITICAL or prediction <24h | 30 minutes | Page on-call + platform lead |
| P0 | CRITICAL + acceleration | 15 minutes | Page all hands |

## Dashboard Specification

### Entropy Dashboard

**Panels**:
1. **Current Entropy** (gauge)
   - Source: `report.json → entropy.current`
   - Thresholds: 0-2 (green), 2-4 (yellow), 4+ (red)

2. **Velocity Assessment** (status)
   - Source: `report.json → entropy.assessment`
   - Colors: stable (green), watch (blue), warning (yellow), critical (red)

3. **Velocity Trend** (time series)
   - Source: `state.json → velocityTracker.velocityHistory`
   - X-axis: timestamp, Y-axis: velocity

4. **Prediction Time Band** (status)
   - Source: `report.json → prediction.timeBand`
   - Display confidence level

5. **Recent Actions** (table)
   - Source: `audit.json`
   - Columns: timestamp, assessment, actions executed

### Resurrection Dashboard

**Panels**:
1. **Lane Distribution** (pie chart)
   - Source: `report.json → summary.lanes`
   - Segments: A (green), B (yellow), C (blue), D (gray)

2. **Top Concerns** (bar chart)
   - Source: `report.json → concerns`
   - X-axis: concern, Y-axis: commit count

3. **Candidate Timeline** (table)
   - Source: `report.json → candidates`
   - Columns: lane, concern, hash, subject, score
   - Sort: by score descending

4. **Entropy vs Candidates** (correlation)
   - X-axis: entropy, Y-axis: candidate count
   - Trend line

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-03-11 | Initial operator runbook |

## References

- Evidence Schema: `schemas/evidence/entropy-report.schema.json`
- Evidence Schema: `schemas/evidence/resurrection-report.schema.json`
- Policy Configuration: `config/entropy-policy.json`
- Governance Spec: `docs/governance/ENTROPY_AND_RESURRECTION_CONTROL_SPEC.md`
