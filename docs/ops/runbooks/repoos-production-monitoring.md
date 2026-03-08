# RepoOS Production Monitoring Runbook

## Overview

This runbook covers production monitoring of the RepoOS Evolution Intelligence System after deployment.

**Target Audience:** Platform Team, DevOps, Repository Administrators
**Frequency:** Weekly monitoring, daily health checks during first month
**Prerequisites:** PR #19778 merged, RepoOS system active

## Timeline

### Phase 1: Initial Deployment (Week 0)
- [ ] Merge PR #19778
- [ ] Verify constitution workflow passes on first PR
- [ ] Verify sovereignty check runs
- [ ] Run initial control plane dashboard

### Phase 2: Production Data Collection (Weeks 1-4)
- [ ] Monitor 2-4 weeks of real PR processing
- [ ] Let workflows run on actual PRs
- [ ] Collect classification accuracy data
- [ ] Track frontier entropy velocity

### Phase 3: Analysis & Optimization (Week 5+)
- [ ] Analyze classification accuracy
- [ ] Retrain ML models if needed
- [ ] Optimize thresholds based on data

## Daily Health Checks (First Month)

### Control Plane Dashboard
```bash
cd /Users/brianlong/Developer/summit
node services/repoos/control-plane-dashboard.mjs show
```

**Expected Output:**
```
╔═══════════════════════════════════════════════════════════════╗
║              RepoOS Control Plane Dashboard                  ║
╚═══════════════════════════════════════════════════════════════╝

System Health: 🟢 HEALTHY (Score: 85-100%)
Average Entropy: <0.5
Entropy Velocity: <0.005/s
Active Locks: 0-5
Stale Locks: 0
```

**Red Flags:**
- System Health: 🔴 CRITICAL or 🟡 WARNING
- Average Entropy: >0.7
- Entropy Velocity: >0.01/s (critical threshold)
- Stale Locks: >3
- Entropy Acceleration: YES ⚠️

**Actions on Red Flags:**
1. Run detailed entropy analysis: `node services/repoos/frontier-entropy.mjs velocity`
2. Check stale locks: `node services/repoos/frontier-lock.mjs status`
3. Review recent PRs for patterns
4. Consider manual intervention (see Incident Response below)

### Frontier Lock Status
```bash
node services/repoos/frontier-lock.mjs status
```

**Expected:** 0-5 active locks, all <30 minutes old

**If Stale Locks Detected:**
```bash
# Automatic cleanup
node services/repoos/frontier-lock.mjs cleanup

# Manual release if needed
node services/repoos/frontier-lock.mjs release <concern>
```

### Entropy Velocity Check
```bash
node services/repoos/frontier-entropy.mjs velocity
```

**Expected:**
- Current velocity: <0.005/s (stable to watch range)
- Assessment: "stable" or "watch"
- Acceleration: No

**Critical Thresholds:**
- `velocity > 0.01/s` = Critical (2-4 week instability warning)
- `isAccelerating: true` = Immediate attention required

## Weekly Monitoring

### Classification Accuracy Analysis
```bash
# Analyze last 7 days
node scripts/repoos/monitor-classification-accuracy.mjs analyze 7

# View latest report
node scripts/repoos/monitor-classification-accuracy.mjs report
```

**Expected Accuracy (after 2-4 weeks of data):**
- Merge Success Prediction: >75%
- Risk Level Assessment: >60%
- Lane Assignment: >75%
- Concern Classification: >80%
- Overall System: >70%

**Retraining Triggers:**
- Overall accuracy <70% = Critical (retrain immediately)
- Merge prediction <70% = High priority
- Any metric <50% = Investigate data quality

**Retraining Process:**
1. Collect sufficient data (minimum 50 classified PRs)
2. Review accuracy report recommendations
3. Extract production features from classified PRs
4. Update ML model training pipeline
5. Retrain with new data
6. Validate on holdout set before deployment

### Patch Window Statistics
```bash
node services/repoos/patch-window-manager.mjs status
```

**Expected:**
- Active windows: 0-10
- Patches buffered: 0-50
- Batches emitted: Increasing weekly
- Avg batch size: 2-8 patches

**Optimization Signals:**
- Avg batch size <2 = Windows too short (increase durations)
- Avg batch size >15 = Windows too long (reduce durations)
- Patches buffered >100 = System overload (investigate)

### Constitution Compliance
**Check via GitHub Actions:**
1. Go to https://github.com/BrianCLong/summit/actions/workflows/evolution-constitution.yml
2. Review recent runs
3. Verify all 5 laws passing

**If Constitution Violations Detected:**
1. Review violation details in workflow logs
2. Determine if legitimate or policy drift
3. Take corrective action:
   - Fix code to comply, OR
   - Request governance approval for exception
4. Document in `.repoos/constitution-violations/`

## Live Monitoring Mode

For active monitoring during high-activity periods:

```bash
# Auto-refresh every 60 seconds
node services/repoos/control-plane-dashboard.mjs monitor 60000

# Press Ctrl+C to stop
```

Use during:
- Major releases
- High PR volume periods
- Suspected instability events
- After system changes

## Incident Response

### Scenario 1: Critical Entropy Velocity

**Symptoms:**
- Entropy velocity >0.01/s
- Acceleration detected
- System health: CRITICAL

**Response:**
1. **Immediate:** Reduce patch ingestion rate
   ```bash
   # Temporarily pause patch intake (if available)
   # Or manually slow PR merges
   ```

2. **Short-term:** Force frontier convergence
   ```bash
   # Flush active windows
   node services/repoos/patch-window-manager.mjs flush <concern>
   ```

3. **Analysis:** Identify entropy source
   ```bash
   node services/repoos/frontier-entropy.mjs velocity
   # Review high-entropy frontiers in output
   ```

4. **Resolution:** Address root cause
   - Too many concurrent PRs → Limit queue depth
   - Conflicting patches → Manual review required
   - System bug → Emergency fix

### Scenario 2: Stale Lock Deadlock

**Symptoms:**
- Multiple stale locks (>30 minutes)
- Frontiers not progressing
- PRs stuck in queue

**Response:**
1. **Identify:** List all locks
   ```bash
   node services/repoos/frontier-lock.mjs status
   ```

2. **Cleanup:** Auto-release stale locks
   ```bash
   node services/repoos/frontier-lock.mjs cleanup
   ```

3. **Verify:** Check progress resumed
   ```bash
   # Wait 5 minutes, then check again
   node services/repoos/frontier-lock.mjs status
   ```

4. **Root Cause:** Review logs for why locks went stale
   - CI failure → Check workflow logs
   - Process crash → Check system logs
   - Bug → File issue and fix

### Scenario 3: Low Classification Accuracy

**Symptoms:**
- Overall accuracy <70%
- Increasing mispredictions
- Wrong lane assignments

**Response:**
1. **Analyze:** Generate detailed report
   ```bash
   node scripts/repoos/monitor-classification-accuracy.mjs analyze 30
   ```

2. **Review:** Check recommendations section
   - Identifies specific underperforming metrics
   - Suggests model retraining or formula fixes

3. **Collect Data:** Ensure sufficient training data
   - Minimum 50 classified PRs
   - Diverse PR types (bug fixes, features, refactors)
   - Actual outcomes confirmed

4. **Retrain:** Update ML models
   - Extract features from production classifications
   - Retrain prediction models
   - Validate on holdout set (>80% accuracy)
   - Deploy updated models

5. **Monitor:** Track accuracy improvement
   - Run analysis weekly
   - Expect 5-10% improvement within 2 weeks

### Scenario 4: Constitution Violation

**Symptoms:**
- Constitution workflow fails on PR
- Laws 1-5 showing failures
- PR blocked from merge

**Response:**
1. **Review:** Check workflow logs
   ```bash
   gh run view <run-id> --log
   ```

2. **Classify:** Determine violation type
   - **Law 1 (Sovereignty):** Direct modification of frontier-owned domain
     - Action: Resubmit as patch via proper channel
   - **Law 2 (Deterministic):** Missing timestamps/versions
     - Action: Add required metadata
   - **Law 3 (Evidence):** Missing classification artifacts
     - Action: Wait for classification workflow or manually create
   - **Law 4 (Homeostasis):** Entropy monitor failure
     - Action: Fix entropy monitoring component
   - **Law 5 (Continuity):** Protected component removed
     - Action: Restore component or request governance approval

3. **Fix:** Apply corrective action from above

4. **Exception Process:** If violation is intentional:
   - File governance approval request
   - Document in `.repoos/constitution-violations/`
   - Requires 2+ approver sign-off
   - Add to amendment audit trail

## Metrics to Track

### System Health Metrics
| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Average Entropy | <0.5 | 0.5-0.7 | >0.7 |
| Entropy Velocity | <0.001/s | 0.001-0.01/s | >0.01/s |
| Stale Locks | 0 | 1-3 | >3 |
| System Health Score | >85% | 70-85% | <70% |

### Classification Accuracy Metrics
| Metric | Target | Retraining Trigger |
|--------|--------|-------------------|
| Merge Success Prediction | >75% | <70% |
| Risk Level Assessment | >60% | <55% |
| Lane Assignment | >75% | <70% |
| Concern Classification | >80% | <75% |
| Overall System | >70% | <65% |

### Operational Metrics
| Metric | Description | Target |
|--------|-------------|--------|
| Frontier Conflicts | Reduced by stability layer | -30-40% vs baseline |
| Synthesis Attempts | Reduced by windowing | -40-60% vs baseline |
| CI Runs | Reduced by batching | -25% vs baseline |
| Early Warning Lead Time | Entropy velocity prediction | 2-4 weeks |

## Reports Generated

### Daily (Automatic)
- `.repoos/reports/daily-health-<date>.json` (via cron)
- Control plane dashboard snapshot

### Weekly (Manual)
- Classification accuracy report
- Entropy velocity trend analysis
- Frontier lock statistics

### Monthly (Manual)
- Full system health audit
- ML model performance review
- Constitution compliance report
- Recommendations for optimization

## Alerting Thresholds

Configure alerts (via monitoring system):

**Critical (PagerDuty/Immediate):**
- Entropy velocity >0.01/s
- System health score <70%
- Stale locks >5
- Classification accuracy <65%

**Warning (Slack/Email):**
- Entropy velocity >0.005/s
- System health score <85%
- Stale locks >2
- Classification accuracy <75%

**Info (Daily Digest):**
- Daily health summary
- Weekly accuracy trends
- Monthly audit results

## Escalation Path

1. **L1 - Platform Team:** Initial triage, standard incidents
2. **L2 - DevOps Lead:** System failures, performance issues
3. **L3 - Architecture Team:** Constitution violations, design changes
4. **L4 - Governance Board:** Emergency exceptions, policy amendments

## Maintenance Windows

Schedule weekly maintenance for:
- Stale lock cleanup (automated)
- Accuracy analysis (automated script)
- Model retraining (as needed)
- Configuration tuning (based on data)

**Recommended Schedule:**
- **Sunday 00:00 UTC:** Automated cleanup and analysis
- **Wednesday 10:00 local:** Manual review and optimization
- **Monthly 1st Friday:** Full system audit

## Support Contacts

- **Platform Team:** #platform-team (Slack)
- **RepoOS Issues:** https://github.com/BrianCLong/summit/issues (label: repoos)
- **Emergency:** Escalation path above

## Additional Resources

- [Evolution Constitution](.repoos/constitution.yml)
- [Frontier Ownership](.repoos/frontier-ownership.yml)
- [Classification Accuracy Reports](.repoos/reports/)
- [Control Plane Dashboard](services/repoos/control-plane-dashboard.mjs)
- [Monitoring Scripts](scripts/repoos/)

---
**Last Updated:** 2026-03-08
**Owner:** Platform Team
**Review Frequency:** Monthly
