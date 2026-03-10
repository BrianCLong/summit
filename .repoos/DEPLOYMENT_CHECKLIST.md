# RepoOS Deployment Checklist

**Purpose**: Pre-flight checklist before activating autonomous operation  
**Target**: Stage 7.0-O certification  
**Status**: 2 critical items blocking deployment

---

## Critical Blockers (Must Complete Before Activation)

### 🔴 1. Enable Branch Protection: enforce_admins

**Why Critical**: Without this, admins can bypass all governance controls

**Current Status**: ❌ DISABLED  
**Required Status**: ✅ ENABLED

**Action**:
```bash
# Via GitHub UI
Repository → Settings → Branches → main → [x] Include administrators

# Verify
gh api repos/:owner/:repo/branches/main/protection | jq '.enforce_admins.enabled'
# Must return: true
```

**Validation**:
```bash
node scripts/repoos/governance-bypass-drill.mjs
# Expected: Bypasses Blocked: 5/5 (100%)
```

**Blocks**: Gate 3 certification

---

### 🔴 2. Re-run Gate 2 with 90-Day Dataset

**Why Critical**: Current 3-day dataset insufficient to prove patch market effectiveness

**Current Status**: ❌ 7.5% improvement (target: ≥15%)  
**Required Status**: ✅ ≥15% p90 lead time improvement

**Action**:
```bash
# Extract 90-day historical data
gh api /repos/:owner/:repo/pulls \
  --paginate \
  --method GET \
  --field state=all \
  --field per_page=100 > prs-history.json

# Re-run replay with full dataset
node scripts/repoos/patch-market-replay.mjs --dataset prs-history.json
```

**Validation**:
- Lead time improvement ≥ 15%
- Regression reduction ≥ 20%
- Zero starvation in top quartile

**Blocks**: Gate 2 certification

---

## Pre-Deployment Checklist

### Control Loop Verification

- [ ] Patch Market Prioritization operational
- [ ] Agent Budget Enforcement configured
- [ ] Patch Surface Limiting activated (SFPC enabled)
- [ ] Frontier Entropy Monitor deployed
- [ ] Agent Pressure Monitor deployed
- [ ] Merge Throughput Monitor deployed
- [ ] Meta-Governance Lock enforced

**Verification Command**:
```bash
node scripts/repoos/cockpit.mjs | grep "CONTROL LOOPS" -A 7
# All should show: HEALTHY
```

---

### Monitoring Deployment

- [ ] Cron jobs configured
  ```bash
  crontab -l | grep repoos
  # Should show: entropy (daily), pressure (6h), throughput (6h)
  ```

- [ ] Alert thresholds configured
- [ ] Notification channels configured
- [ ] Baseline metrics established (1 week observation)

**Test Commands**:
```bash
# Test each monitor
node scripts/repoos/frontier-entropy-monitor.mjs
node scripts/repoos/agent-pressure-monitor.mjs
node scripts/repoos/merge-throughput-monitor.mjs

# Check output files
ls -lh .repoos/metrics/*.json
```

---

### Configuration Files

- [ ] `.repoos/agent-budget.yml` exists and valid
- [ ] `.repoos/patch-surface-limiting.yml` activated
- [ ] `.repoos/meta-governance-lock.yml` enforced
- [ ] `.github/CODEOWNERS` complete
- [ ] `.github/branch-protection-config.yml` applied

**Verification Command**:
```bash
# Check all configs exist
ls -lh .repoos/*.yml .github/CODEOWNERS

# Verify PSL activation
grep "enabled: true" .repoos/patch-surface-limiting.yml
```

---

### Evidence Artifacts

- [ ] Gate 2 evidence generated
- [ ] Gate 3 evidence generated
- [ ] Governance audit log initialized
- [ ] Validation status documented

**Verification Command**:
```bash
ls -lh .repoos/validation/*.json
# Should show: patch-market-replay-study.json, governance-bypass-game-day.json
```

---

### Documentation

- [ ] Stage 7 Assertion Pack published
- [ ] Validation tracker operational
- [ ] Operational status documented
- [ ] Remediation guides complete
- [ ] Cockpit dashboard documented

**Verification Command**:
```bash
ls -lh .repoos/*.md scripts/repoos/README*.md
```

---

### Governance Enforcement

- [ ] CODEOWNERS coverage: 100%
- [ ] Branch protection: enforce_admins enabled
- [ ] Required reviews: 2 approvals
- [ ] Status checks required: constitution-enforcement, evidence-governance
- [ ] Linear history enforced

**Verification Command**:
```bash
gh api repos/:owner/:repo/branches/main/protection | jq '{
  enforce_admins: .enforce_admins.enabled,
  required_reviews: .required_pull_request_reviews.required_approving_review_count,
  codeowners: .required_pull_request_reviews.require_code_owner_reviews
}'
```

**Expected Output**:
```json
{
  "enforce_admins": true,
  "required_reviews": 2,
  "codeowners": true
}
```

---

## Deployment Sequence

### Phase 1: Critical Gaps (Immediate)
1. Enable enforce_admins
2. Re-run Gate 3 drill → PASS
3. Collect 90-day dataset
4. Re-run Gate 2 replay → PASS

**Timeline**: 1-2 weeks  
**Deliverable**: Gates 2 & 3 certified

### Phase 2: Monitoring Activation (Week 1)
1. Deploy cron schedules
2. Run monitors for 1 week (baseline)
3. Calibrate alert thresholds
4. Configure notifications

**Timeline**: 1 week observation  
**Deliverable**: 24/7 monitoring operational

### Phase 3: Remaining Gates (Weeks 4-20)
1. Gate 1: Simulator backtest (4-6 weeks)
2. Gate 4: Synthesis safety (4-6 weeks)
3. Gate 5: 30-day soak (6-8 weeks)

**Timeline**: 12-20 weeks  
**Deliverable**: Stage 7.0-O certification

---

## Go/No-Go Decision Criteria

### GO: System Ready for Autonomous Operation

**All Must Be True**:
- ✅ enforce_admins enabled
- ✅ Gates 2 & 3 PASS
- ✅ All 7 control loops operational
- ✅ Monitoring deployed and baseline established
- ✅ Cockpit dashboard operational
- ✅ Emergency override process documented

### NO-GO: System Not Ready

**Any Are True**:
- ❌ enforce_admins disabled
- ❌ Gate 2 or 3 FAIL
- ❌ Any control loop non-operational
- ❌ Monitoring not deployed
- ❌ Critical documentation missing

---

## Current Status

**Deployment Readiness**: 85%

**Blocking Items**:
1. enforce_admins disabled (CRITICAL)
2. Gate 2 dataset insufficient (HIGH)

**After Remediation**: READY FOR PRODUCTION

---

## Post-Deployment Validation

After activating autonomous operation, monitor for 72 hours:

### Hour 0-24: Initial Stabilization
- [ ] Cockpit shows all systems HEALTHY
- [ ] No DANGER alerts triggered
- [ ] PR queue stable or improving
- [ ] Entropy drift < 0.05

### Hour 24-48: Steady State
- [ ] Agent pressure 0.8-1.3 (healthy range)
- [ ] Merge throughput stable or rising
- [ ] No intervention actions needed
- [ ] Fitness score > 0.60

### Hour 48-72: Sustained Operation
- [ ] All metrics within bounds
- [ ] Zero unrecovered incidents
- [ ] Control loops self-regulating
- [ ] System demonstrating homeostasis

**Success Criteria**: 72 hours of stable autonomous operation with no manual intervention

---

## Rollback Plan

If system destabilizes after deployment:

### Immediate Actions
1. Pause agent patch generation:
   ```bash
   # Set budget to 0
   # Update .repoos/agent-budget.yml: max_patches_per_day: 0
   ```

2. Check cockpit for alerts:
   ```bash
   node scripts/repoos/cockpit.mjs
   ```

3. Review recent changes:
   ```bash
   git log -20 --oneline
   ```

### Escalation Path
1. L1: Check monitoring dashboards
2. L2: Review intervention recommendations
3. L3: Manual stabilization (reduce budgets, activate PSL)
4. L4: Disable autonomous operation, return to manual control

---

**Recommendation**: Complete the 2 critical blockers before proceeding with autonomous activation. After remediation, system will be ready for production deployment with 24/7 monitoring.
