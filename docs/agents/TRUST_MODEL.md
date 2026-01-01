# Trust & Confidence Scoring Model

**Version:** 1.0
**Status:** ACTIVE
**Scope:** All agent and prediction trust scoring in Summit
**Authority:** Agent Governance Framework

---

## Purpose

This document defines the **trust and confidence scoring model** for agents and predictive analytics in Summit.

**Core Principle:** Trust scores are **advisory signals only**—never binding, never authoritative, never used as sole decision criteria.

---

## 1. Trust Model Principles

### 1.1 What Trust Scores Are

**Definition:** Non-authoritative numerical signals (0-1 scale) indicating the **historical reliability** of agents or predictions based on:
- Actual outcomes vs. predicted outcomes
- Compliance with constraints and policies
- Audit findings and violations
- Consistency over time

### 1.2 What Trust Scores Are NOT

- **Authorization mechanisms:** Scores do not grant or revoke capabilities
- **Sole decision criteria:** No action is taken based solely on trust scores
- **Permanent labels:** Scores decay and refresh over time
- **Privacy violations:** Scores are derived from system behavior, not personal data

### 1.3 Non-Binding Nature

**Critical Requirement:** Trust scores are **strictly advisory**.

No system component may:
- Grant access based solely on trust score
- Deny service based solely on trust score
- Bypass governance checks using trust scores
- Use trust scores as authentication/authorization

Trust scores **inform** human review and policy evaluation—they do not **replace** them.

---

## 2. Trust Score Components

Trust scores are computed from **four primary factors**:

### 2.1 Historical Accuracy (40% weight)

**Definition:** How often predictions matched actual outcomes; how often agent actions achieved stated goals.

**Measurement:**
- Prediction accuracy: `(correct predictions) / (total predictions)`
- Agent task success: `(successful tasks) / (total tasks)`
- Time-weighted: Recent accuracy weighted more heavily

**Data Source:** Audit logs, prediction outcomes, task completion records

**Decay:** Accuracy older than 90 days receives 50% weight

### 2.2 Constraint Compliance (30% weight)

**Definition:** Adherence to governance constraints, resource limits, and policy boundaries.

**Measurement:**
- Policy compliance: `1 - (violations / total checks)`
- Resource adherence: `1 - (limit breaches / total runs)`
- Capability respect: `1 - (unauthorized attempts / total actions)`

**Data Source:** Policy audit logs, capability check logs

**Penalty:** Violations within last 30 days reduce score by 0.1 per violation (capped at -0.5)

### 2.3 Audit Outcomes (20% weight)

**Definition:** Results from manual or automated audits of agent/prediction behavior.

**Measurement:**
- Audit pass rate: `(audits passed) / (total audits)`
- Critical findings: -0.2 per critical finding (last 60 days)
- Medium findings: -0.1 per medium finding (last 60 days)

**Data Source:** Audit event logs, compliance reports

**Freshness:** Only audits within last 180 days are considered

### 2.4 Consistency (10% weight)

**Definition:** Stability of performance over time; low variance in outcomes.

**Measurement:**
- Variance in accuracy: `1 - stddev(accuracy_by_week)`
- Behavioral stability: Low deviation from historical patterns

**Data Source:** Time-series analysis of audit logs

**Threshold:** High variance (>0.3) reduces consistency score to 0

---

## 3. Trust Score Calculation

### 3.1 Formula

```typescript
TrustScore = (
  HistoricalAccuracy * 0.40 +
  ConstraintCompliance * 0.30 +
  AuditOutcomes * 0.20 +
  Consistency * 0.10
)
```

### 3.2 Score Bands

| Score Range | Band | Interpretation | UI Indicator |
|-------------|------|----------------|--------------|
| 0.90 - 1.00 | **Very High** | Excellent track record | 🟢 Green |
| 0.70 - 0.89 | **High** | Good reliability | 🟡 Yellow-Green |
| 0.50 - 0.69 | **Medium** | Adequate but monitor | 🟡 Yellow |
| 0.30 - 0.49 | **Low** | Concerning, review needed | 🟠 Orange |
| 0.00 - 0.29 | **Very Low** | Poor track record | 🔴 Red |

### 3.3 Initial Trust Score

**New agents/models** start with a **neutral score of 0.50** until sufficient data accumulates.

**Minimum Data Requirement:** At least 10 predictions or 20 agent actions before score is reliable.

### 3.4 Score Decay

Trust scores **decay over time** to reflect staleness:

| Time Since Last Activity | Decay Factor |
|-------------------------|--------------|
| < 7 days | 1.0 (no decay) |
| 7-30 days | 0.95 |
| 30-90 days | 0.85 |
| 90-180 days | 0.70 |
| > 180 days | 0.50 (revert to neutral) |

**Rationale:** Inactive agents/models should not maintain high trust indefinitely.

---

## 4. Prediction Confidence vs. Trust Score

These are **distinct but related** concepts:

| Dimension | Prediction Confidence | Trust Score |
|-----------|----------------------|-------------|
| **Scope** | Single prediction | Historical track record |
| **Timeframe** | Instant (per prediction) | Cumulative (over time) |
| **Data Source** | Data quality, model uncertainty | Audit logs, outcomes |
| **Use Case** | Assess single prediction reliability | Assess agent/model reliability |
| **Decay** | Time-based (hours/days) | Activity-based (months) |

**Relationship:** High trust score + high confidence = strong signal; low trust score + high confidence = red flag (overconfidence).

---

## 5. Agent Trust Scoring

### 5.1 Agent-Specific Inputs

In addition to the four primary factors, agent trust includes:

**Capability Adherence:**
- Does agent only use declared capabilities?
- Are capability checks respected?

**Negotiation Behavior:**
- Does agent negotiate in good faith?
- Are turn limits and protocols respected?

**Resource Discipline:**
- Does agent stay within budgets?
- Are cleanup actions performed?

### 5.2 Agent Trust Calculation

```typescript
AgentTrustScore = (
  BaseComponentScore * 0.80 +
  CapabilityAdherence * 0.10 +
  NegotiationBehavior * 0.05 +
  ResourceDiscipline * 0.05
)
```

### 5.3 Agent Trust Updates

Agent trust scores are updated:
- **After each task completion** (outcome recorded)
- **After policy checks** (compliance tracked)
- **After audits** (findings incorporated)
- **Weekly** (decay applied)

---

## 6. Model Trust Scoring

### 6.1 Model-Specific Inputs

For predictive models, trust includes:

**Calibration:**
- Are confidence scores well-calibrated? (predicted 0.8 confidence → actual 80% accuracy)

**Bias Detection:**
- Are predictions biased toward certain outcomes?
- Are false positive/negative rates balanced?

**Explainability:**
- Do explanations correlate with actual factors?

### 6.2 Model Trust Calculation

```typescript
ModelTrustScore = (
  BaseComponentScore * 0.70 +
  Calibration * 0.15 +
  BiasMetrics * 0.10 +
  ExplainabilityQuality * 0.05
)
```

### 6.3 Model Trust Updates

Model trust scores are updated:
- **After prediction validation** (when ground truth available)
- **After accuracy assessments** (monthly)
- **After bias audits** (quarterly)
- **On version updates** (reset or inherit based on similarity)

---

## 7. Transparency & Explainability

### 7.1 Score Breakdown

Every trust score **must** include a breakdown:

```typescript
interface TrustScoreBreakdown {
  overallScore: number; // 0-1
  band: 'very_high' | 'high' | 'medium' | 'low' | 'very_low';
  components: {
    historicalAccuracy: number;
    constraintCompliance: number;
    auditOutcomes: number;
    consistency: number;
  };
  dataPoints: {
    totalPredictions?: number;
    totalTasks?: number;
    violations: number;
    audits: number;
  };
  lastUpdated: string;
  decayFactor: number;
}
```

### 7.2 Human-Readable Explanations

Trust scores are accompanied by explanations:

**Example (High Trust):**
> "Trust score: 0.85 (High). This agent has completed 150 tasks with 92% success rate, zero policy violations in the last 90 days, and passed 5 audits. Recent performance is consistent with historical averages."

**Example (Low Trust):**
> "Trust score: 0.42 (Low). This model's predictions have been accurate only 65% of the time over the last 30 days, with 3 policy violations detected. Recommend manual review before relying on outputs."

### 7.3 Confidence Intervals

Trust scores include uncertainty bands:

```typescript
interface TrustScoreWithUncertainty {
  score: number;
  confidenceInterval: { lower: number; upper: number };
  sampleSize: number;
}
```

**Example:**
- Score: 0.75
- Confidence Interval: [0.68, 0.82] (95% CI)
- Sample Size: 50 predictions

**Interpretation:** Small sample sizes → wider intervals → less reliable trust score.

---

## 8. Prohibited Uses

The following uses of trust scores are **explicitly prohibited**:

### 8.1 Sole Authorization

❌ **Prohibited:**
```typescript
if (trustScore > 0.7) {
  grantCapability('admin_access');
}
```

✅ **Allowed:**
```typescript
if (policyCheck.action === 'ALLOW' && trustScore > 0.7) {
  logger.info('High trust agent approved by policy');
}
```

### 8.2 Automated Capability Grants

❌ **Prohibited:** Automatically granting capabilities based on trust score

✅ **Allowed:** Flagging high-trust agents for **human review** of capability requests

### 8.3 Cross-Tenant Comparison

❌ **Prohibited:** Comparing trust scores across tenants to make decisions

✅ **Allowed:** Tenant-scoped trust scoring for internal monitoring

### 8.4 Permanent Labeling

❌ **Prohibited:** Storing trust scores as permanent agent attributes

✅ **Allowed:** Recomputing trust scores on-demand from audit logs

---

## 9. Trust Score Governance

### 9.1 Access Control

Trust scores are **sensitive metadata**:

| Role | Read Access | Write Access | Explanation Access |
|------|-------------|--------------|-------------------|
| **Agent** | No | No | No |
| **Human Operator** | Yes | No | Yes |
| **Audit System** | Yes | Yes (compute only) | Yes |
| **Policy Engine** | Yes (read-only) | No | Yes |

**Rationale:** Agents should not be aware of their own trust scores to prevent gaming.

### 9.2 Audit Trail

All trust score updates generate audit events:

```typescript
interface TrustScoreAuditEvent {
  eventType: 'trust_score_updated';
  subjectId: string; // Agent or model ID
  subjectType: 'agent' | 'model';
  oldScore: number;
  newScore: number;
  updateReason: string; // e.g., "Task completion", "Policy violation"
  components: TrustScoreBreakdown;
  timestamp: string;
}
```

### 9.3 Review Process

Trust scores are reviewed:

- **Weekly:** Automated anomaly detection (sudden drops > 0.2)
- **Monthly:** Manual review of low-trust agents/models
- **Quarterly:** Calibration checks (are scores predictive?)
- **Annually:** Model update (adjust weights if needed)

---

## 10. Integration with Governance

### 10.1 Policy Hooks

Trust scores can **inform** (not replace) policy decisions:

**Policy Example:**
```typescript
{
  id: 'high-risk-prediction-review',
  description: 'High-risk predictions from low-trust models require human review',
  scope: { stages: ['runtime'], tenants: ['*'] },
  rules: [
    { field: 'predictionRisk', operator: 'eq', value: 'high' },
    { field: 'modelTrustScore', operator: 'lt', value: 0.6 }
  ],
  action: 'ESCALATE'
}
```

**Outcome:** Low-trust model + high-risk prediction → escalate to human, but policy verdict is still required.

### 10.2 Alerts & Notifications

Trust score changes trigger alerts:

| Condition | Alert | Action |
|-----------|-------|--------|
| Score drops > 0.3 in 7 days | **Critical** | Immediate investigation |
| Score < 0.4 | **Warning** | Review agent/model behavior |
| Score drops below 0.3 after being > 0.7 | **Critical** | Suspend pending review |

### 10.3 Dashboard Visibility

Trust scores are displayed in:
- Agent management dashboard
- Prediction review interface
- Audit report summaries

**Display Format:**
```
Agent: compliance-predictor-v2
Trust Score: 0.82 (High) ▲ +0.05 from last week
Components: Accuracy 0.90, Compliance 0.85, Audits 0.75, Consistency 0.80
Last Updated: 2025-12-31 10:00:00 UTC
```

---

## 11. Calibration & Validation

### 11.1 Score Validation

Trust scores are validated by:

**Historical Backtesting:**
- Do high-trust agents/models perform better than low-trust ones?
- Measure: Correlation between trust score and actual outcomes (target: r > 0.7)

**Predictive Power:**
- Can trust scores predict future violations or failures?
- Measure: AUC-ROC for predicting next-month violations (target: AUC > 0.75)

### 11.2 Weight Tuning

Weights are adjusted if:
- Component does not correlate with outcomes
- New data suggests different importance
- Regulatory requirements change

**Procedure:**
1. Analyze historical data (minimum 6 months)
2. Test alternative weights
3. Validate on held-out data
4. Document change in ADR
5. Update trust model version

### 11.3 Bias Detection

Trust scoring is monitored for bias:

**Protected Attributes:** Ensure scores are not correlated with:
- Tenant size or industry
- Agent deployment region
- Time of day/week

**Fairness Metrics:**
- Demographic parity: Trust score distributions should be similar across tenant types
- Equalized odds: False positive/negative rates should be balanced

---

## 12. Privacy & Security

### 12.1 Data Minimization

Trust scores are computed from:
- **Aggregated** audit logs (not raw event details)
- **Anonymized** outcomes (no PII)
- **Statistical** summaries (not individual records)

**Retention:** Underlying data retained only as long as needed for scoring (default: 180 days).

### 12.2 Score Storage

Trust scores are:
- **Computed on-demand** (not persisted)
- **Cached temporarily** (5-minute TTL)
- **Encrypted in transit** (TLS 1.3)

**Exception:** Historical trust score trends may be persisted for analysis (aggregated monthly snapshots only).

### 12.3 Adversarial Resistance

**Threat:** Agent attempts to game trust score by behaving well temporarily.

**Mitigations:**
- Time-weighted scoring (recent ≠ all that matters)
- Consistency component penalizes variance
- Audits include randomness (not all actions scored)

---

## 13. Compliance & Governance

### 13.1 Framework Alignment

Trust scoring aligns with:

- **SOC 2:** CC7.2 (System monitoring), CC7.3 (Anomaly detection)
- **ISO 27001:** A.12.4.1 (Event logging), A.16.1.4 (Assessment of information security events)
- **NIST AI RMF:** MEASURE 2.1 (AI system performance), MEASURE 2.3 (AI risks and impacts)

### 13.2 Regulatory Considerations

**GDPR:** Trust scores are not "profiling" of individuals (applies to systems, not people).

**Bias Law:** Scoring must not discriminate based on protected attributes (see §11.3).

**Transparency:** Scores are explainable and auditable (see §7).

---

## 14. Example Use Cases

### 14.1 Example: Prediction Review

**Scenario:** Compliance prediction engine generates audit readiness forecast.

**Trust Score Context:**
- Model trust: 0.88 (High)
- Prediction confidence: 0.75
- Combined signal: Strong

**Outcome:** Prediction presented to user with trust context:
> "This prediction has 75% confidence from a high-trust model (trust score: 0.88, based on 200 validated predictions). Recommend proceeding with caution."

### 14.2 Example: Agent Task Assignment

**Scenario:** Two agents available for remediation task.

**Trust Scores:**
- Agent A: 0.92 (Very High) - 95% task success, zero violations
- Agent B: 0.58 (Medium) - 70% task success, 2 recent violations

**Outcome:** Human operator sees trust scores, chooses Agent A. Policy still validates the assignment.

### 14.3 Example: Low-Trust Alert

**Scenario:** Model trust drops from 0.80 to 0.45 in one week.

**Investigation:**
- Recent predictions: 50% accuracy (down from 90%)
- Cause: Data pipeline issue (stale data)

**Action:** Model suspended, data pipeline fixed, model re-validated before re-activation.

---

## 15. Summary: Trust Model in One Page

**What trust scores are:**
- Non-authoritative advisory signals
- Based on historical accuracy, compliance, audits, consistency
- Transparent and explainable
- Decaying over time

**What trust scores are NOT:**
- Authorization mechanisms
- Sole decision criteria
- Permanent labels
- Privacy violations

**Key Components:**
- Historical Accuracy: 40%
- Constraint Compliance: 30%
- Audit Outcomes: 20%
- Consistency: 10%

**Score Bands:**
- 0.90-1.00: Very High
- 0.70-0.89: High
- 0.50-0.69: Medium
- 0.30-0.49: Low
- 0.00-0.29: Very Low

**Prohibited Uses:**
- Sole authorization
- Automated capability grants
- Cross-tenant comparison
- Permanent labeling

**Governance:**
- Access control: Agents cannot see their own scores
- Audit trail: All updates logged
- Review: Weekly anomaly detection, monthly manual review

---

**Trust scores are advisory tools for informed human decision-making. They supplement, but never replace, governance and policy enforcement.**

**Effective Date:** 2025-12-31
**Next Review:** 2026-01-31
**Authority:** Summit Agent Governance Framework
**Enforcement:** Advisory only, non-binding
