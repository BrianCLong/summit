# Stage 7 Validation Scripts

This directory contains validation infrastructure for transitioning from **Stage 7.0-C (Capability Complete)** to **Stage 7.0-O (Operationally Validated)**.

## Overview

Stage 7.0-C means all control-plane components are implemented, integrated, and documented. Stage 7.0-O requires operational evidence that the system works as claimed through 5 validation gates.

**Target**: Complete all 5 gates by July 2026

## Validation Gates

### Gate 1: Simulator Backtest Pack (Target: 2026-04-20)
**Purpose**: Validate predictive accuracy of Architecture Evolution Simulator

**Script**: `simulator-backtest.mjs` (TBD)

**Evidence**: `.repoos/validation/simulator-backtest-pack.json`

**Acceptance Criteria**:
- MAPE < 20% for all metrics (FE, DD, ρ, API)
- Confidence intervals achieve 85%+ coverage
- 2+ successful intervention validations

**Timeline**: 4-6 weeks (data collection + analysis)

---

### Gate 2: Patch-Market Replay Study (Target: 2026-04-06)
**Purpose**: Prove market-based prioritization outperforms FIFO

**Script**: `patch-market-replay.mjs` ✅

**Evidence**: `.repoos/validation/patch-market-replay-study.json`

**Acceptance Criteria**:
- Lead time improvement ≥ 15% vs FIFO
- Regression reduction ≥ 20% vs FIFO
- Zero starvation in top quartile

**Usage**:
```bash
# Extract last 500 merged PRs and compare FIFO vs Market
./scripts/repoos/patch-market-replay.mjs

# Results saved to: .repoos/validation/patch-market-replay-study.json
```

**Timeline**: 2-3 weeks (data extraction + simulation)

---

### Gate 3: Governance Bypass Game Day (Target: 2026-03-23)
**Purpose**: Validate meta-governance lock enforcement

**Script**: `governance-bypass-drill.mjs` ✅

**Evidence**: `.repoos/validation/governance-bypass-game-day.json`

**Acceptance Criteria**:
- 100% of bypass attempts rejected
- All override attempts logged
- Valid override succeeds with 3 signatures + 24h cooling
- Auto-revert after max duration (168h)

**Usage**:
```bash
# Run controlled bypass drill (tests protections without actually bypassing)
./scripts/repoos/governance-bypass-drill.mjs

# Pre-requisites:
# 1. Apply branch protection rules (see .github/branch-protection-config.yml)
# 2. Configure CODEOWNERS teams in GitHub
# 3. Enable enforce_admins on main branch

# Results saved to:
# - .repoos/validation/governance-bypass-game-day.json
# - .repoos/governance-audit-log.json
```

**Prerequisites**:
1. **Apply Branch Protection** (via GitHub UI or API):
   - Protect `main` branch
   - Enable `enforce_admins: true` (CRITICAL)
   - Require pull request reviews (2 approvals)
   - Require code owner reviews
   - Require status checks: constitution-enforcement, evidence-governance

2. **Configure GitHub Teams**:
   - Create `@summit-architecture-board` (3+ members)
   - Create `@summit-platform-leads` (3+ members)
   - Create `@summit-security-leads` (3+ members)

3. **Verify CODEOWNERS**:
   - `.github/CODEOWNERS` file exists with Stage 7 protections
   - Protected files mapped to required teams

**Timeline**: 1-2 weeks (setup + testing)

---

### Gate 4: Synthesis Safety Trial (Target: 2026-04-27)
**Purpose**: Validate autonomous synthesis is safe and accurate

**Script**: `synthesis-safety-trial.mjs` (TBD)

**Evidence**: `.repoos/validation/synthesis-safety-trial.json`

**Acceptance Criteria**:
- Cluster precision ≥ 80%, recall ≥ 70%
- False merge rate < 5%
- Rollback rate < 5% over 30 days
- Blast radius < 10% for all syntheses

**Timeline**: 4-6 weeks (trial period + analysis)

---

### Gate 5: 30-Day Operational Soak (Target: 2026-05-11)
**Purpose**: Prove system stability under real load

**Script**: `soak-test-monitor.mjs` (TBD)

**Evidence**: `.repoos/validation/soak-test-summary.json`

**Acceptance Criteria**:
- 90%+ uptime for all Stage 7 components
- Stability bounds maintained 90%+ of time (FE < 0.30, RMR > 0.85, MTS < 0.80)
- Zero unrecovered critical incidents
- Alert false positive rate < 5%

**Timeline**: 6-8 weeks (2 weeks baseline + 4-6 weeks soak)

---

## Validation Tracker

**Script**: `validation-tracker.mjs` ✅

**Purpose**: Monitor progress across all 5 gates

**Usage**:
```bash
# Show validation dashboard
./scripts/repoos/validation-tracker.mjs

# Output:
# ╔════════════════════════════════════════════════════════════════╗
# ║        Stage 7 Validation Tracker                             ║
# ║        7.0-C → 7.0-O Progression                              ║
# ╚════════════════════════════════════════════════════════════════╝
#
# Current Maturity: 7.0-C
# Target Maturity: 7.0-O
# Target Date: July 2026
#
# Overall Progress: 0%
#
# ━━━ Validation Gates ━━━
# [Gate status for each of 5 gates]
#
# ━━━ Next Actions ━━━
# [Recommended next steps]
```

---

## Quick Start Guide

### 1. Start with Gate 3 (Quickest to Complete)

Gate 3 can be started immediately and provides foundational protections:

```bash
# Step 1: Review branch protection config
cat .github/branch-protection-config.yml

# Step 2: Apply protections via GitHub UI
# Navigate to: Settings → Branches → Branch protection rules → main
# Enable all protections listed in branch-protection-config.yml

# Step 3: Run bypass drill
./scripts/repoos/governance-bypass-drill.mjs

# Step 4: Check results
cat .repoos/validation/governance-bypass-game-day.json
```

**Expected Output**: All bypass attempts blocked, Gate 3 PASS

### 2. Run Gate 2 (Patch Market Replay)

Requires historical PR data:

```bash
# Extract and analyze last 500 PRs
./scripts/repoos/patch-market-replay.mjs

# Expected runtime: 2-5 minutes (depends on API rate limits)

# Check results
cat .repoos/validation/patch-market-replay-study.json
```

**Expected Output**: 15%+ lead time improvement, Gate 2 PASS

### 3. Track Overall Progress

```bash
# View dashboard
./scripts/repoos/validation-tracker.mjs

# Check evidence artifacts
ls -la .repoos/validation/
```

---

## Evidence Artifacts

All validation gates produce evidence artifacts in `.repoos/validation/`:

| Gate | Evidence File | Status |
|------|--------------|--------|
| Gate 1 | `simulator-backtest-pack.json` | ⏳ Pending |
| Gate 2 | `patch-market-replay-study.json` | ⏳ Pending |
| Gate 3 | `governance-bypass-game-day.json` | ⏳ Pending |
| Gate 4 | `synthesis-safety-trial.json` | ⏳ Pending |
| Gate 5 | `soak-test-summary.json` | ⏳ Pending |

**Certification Requirement**: All 5 evidence files must exist with PASS status

---

## Troubleshooting

### Gate 3: Bypass Drill Fails

**Problem**: Drill reports bypass attempts not blocked

**Solutions**:
1. Check branch protection is enabled:
   ```bash
   gh api repos/:owner/:repo/branches/main/protection
   ```

2. Verify `enforce_admins` is true:
   ```bash
   gh api repos/:owner/:repo/branches/main/protection | jq '.enforce_admins.enabled'
   ```

3. Check CODEOWNERS file exists:
   ```bash
   cat .github/CODEOWNERS | grep "meta-governance-lock"
   ```

### Gate 2: Replay Study Shows No Improvement

**Problem**: Market prioritization performs worse than FIFO

**Possible Causes**:
- Historical dataset too small (need 500+ PRs)
- Market scoring weights need calibration
- Repository doesn't have enough architectural heterogeneity

**Solution**: Review market scoring algorithm in `patch-market.mjs` and adjust weights

### General: Evidence Files Not Generated

**Problem**: Script runs but no `.json` file created

**Solutions**:
1. Check directory exists:
   ```bash
   mkdir -p .repoos/validation
   ```

2. Check file permissions:
   ```bash
   chmod 755 .repoos/validation
   ```

3. Run script with verbose output to see errors

---

## Documentation

- **Assertion Pack**: `.repoos/STAGE_7_ASSERTION_PACK.md` - Complete validation framework
- **Branch Protection**: `.github/branch-protection-config.yml` - Required GitHub protections
- **CODEOWNERS**: `.github/CODEOWNERS` - File-level protection mapping
- **Architecture Guide**: `docs/repoos/STAGE_6_7_AUTONOMOUS_ARCHITECTURE.md` - System overview
- **Complete Guide**: `docs/repoos/STAGE_7_COMPLETE_GUIDE.md` - Operational guide

---

## Beyond FAANG Innovation

This validation framework represents a novel approach to autonomous systems certification:

1. **Evidence-Based Validation**: Not just implementation, but operational proof
2. **Measurement Contracts**: Every metric has anti-gaming constraints
3. **Constitutional Governance**: Automated bypass validation with audit trails
4. **Predictive Validation**: Simulator backtesting before production claims
5. **Systematic Timeline**: 19-week structured path from capability to operational

No major tech company has published a comparable validation framework for autonomous software evolution systems.

---

## Next Steps

1. ✅ Gate 3 setup complete - apply branch protection and run drill
2. ✅ Gate 2 script ready - run patch market replay study
3. ⏳ Gate 1 script - build simulator backtest infrastructure
4. ⏳ Gate 4 script - build synthesis safety trial tracker
5. ⏳ Gate 5 script - build soak test monitoring dashboard

**Target**: All gates complete by July 2026 for Stage 7.0-O certification
