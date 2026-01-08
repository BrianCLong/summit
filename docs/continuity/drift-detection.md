# Drift Detection: Early Warning Systems for Mission Compromise

**Principle**: Detect Erosion Before It Becomes Collapse

## Overview

Mission drift rarely happens suddenly. It's a gradual process:

- "Just this once" exceptions become precedents
- Standards are "temporarily" relaxed and never restored
- Governance is "streamlined" to remove friction
- Constraints are reframed as "legacy thinking"
- Evidence discipline is sacrificed for decisiveness

**Drift detection** is the systematic monitoring of indicators that precede mission compromise—enabling intervention **before** damage is irreversible.

## Core Thesis

> By the time drift is obvious, it's often too late.
> Early detection requires looking for leading indicators, not lagging ones.

## Drift Taxonomy

### Type 1: Standard Erosion Drift

**Pattern**: Gradual lowering of evidence quality or decision rigor

**Examples**:

- Evidence citation requirements loosened
- Confidence thresholds reduced without approval
- "Fast-track" processes that skip oversight
- Increasing exceptions to evidence discipline

**Detection**: Behavioral metrics showing standard degradation

---

### Type 2: Scope Creep Drift

**Pattern**: Expansion into areas beyond approved boundaries

**Examples**:

- Operating outside defined scope without governance approval
- "Mission adjacent" projects that violate limitations
- Partnerships that create new scope obligations
- Feature additions that compromise core constraints

**Detection**: Activity monitoring against scope boundaries

---

### Type 3: Governance Bypass Drift

**Pattern**: Erosion of oversight and accountability mechanisms

**Examples**:

- Decisions made without required oversight approval
- Information withheld from oversight board
- "Emergency" overrides becoming routine
- Reduction in oversight board authority

**Detection**: Governance process compliance tracking

---

### Type 4: Cultural Drift

**Pattern**: Change in organizational values and norms

**Examples**:

- "Move fast and break things" replacing principled caution
- Dismissal of constraints as "process" or "bureaucracy"
- Celebrating shortcuts instead of disciplined refusal
- Reframing mission as "aspirational" not "mandatory"

**Detection**: Staff feedback, retention patterns, internal discourse analysis

---

### Type 5: Linguistic Drift

**Pattern**: Subtle changes in how mission is described

**Examples**:

- "Evidence-based" becomes "data-informed"
- "Refusal under uncertainty" becomes "conservative approach"
- "Mandatory constraints" become "best practices"
- "Oversight" becomes "advisory"

**Detection**: Document analysis, external communication monitoring

---

## Drift Detection Framework

### Layer 1: Automated Technical Monitoring

#### 1.1 Decision Quality Metrics

**Monitored Indicators**:

```
- Evidence citation rate (target: 100% for high-stakes)
- Evidence quality scores (avg, min, trend)
- Decisions lacking minimum evidence (target: 0)
- Override frequency (esp. evidence requirements)
- Escalation to human review rate (should be stable)
- Appeal reversal rate (indicator of automation quality)
```

**Alert Thresholds**:

```
⚠️ Warning: Evidence citation rate <98% over 7 days
🚨 Critical: Evidence citation rate <95% over 7 days
🚨 Critical: Any high-stakes decision without evidence
⚠️ Warning: Override rate increase >20% over 30 days
```

**Automated Response**:

- Alerts sent to oversight board immediately
- Detailed decision logs attached
- Trend analysis and comparison to baseline
- Automatic escalation if not addressed within 48 hours

#### 1.2 Scope Boundary Monitoring

**Monitored Indicators**:

```
- Decisions outside approved scope (target: 0)
- "Edge case" decisions (proximity to scope boundary)
- Partnership agreements creating new obligations
- Feature deployments expanding capability
- User requests for out-of-scope operation
```

**Alert Thresholds**:

```
🚨 Critical: Any out-of-scope decision without approval
⚠️ Warning: Edge case decisions increasing
⚠️ Warning: Partnership terms mentioning scope expansion
```

#### 1.3 Governance Process Compliance

**Monitored Indicators**:

```
- Governance-reserved decisions made without board approval
- Oversight board meeting frequency and attendance
- Board information access (audit log reviews)
- Time between governance violation and remediation
- Whistleblower reports (volume and resolution)
```

**Alert Thresholds**:

```
🚨 Critical: Governance-reserved decision without approval
🚨 Critical: Board information access denied or delayed
⚠️ Warning: Board meeting cancelled or postponed
🚨 Critical: Whistleblower report alleging governance violation
```

---

### Layer 2: Periodic Audit & Review

#### 2.1 Independent Quarterly Audits

**Scope**:

- Sample of decisions reviewed for evidence quality
- Compliance with invariants verified
- Governance process adherence checked
- Comparison to historical baseline

**Deliverables**:

- Compliance scorecard
- Drift indicators flagged
- Recommendations for remediation
- Trend analysis

**Red Flags** (trigger immediate oversight board attention):

- Any invariant violation detected
- Statistically significant degradation in evidence quality
- Governance bypasses identified
- Cultural drift indicators in staff interviews

#### 2.2 Annual Deep Audit

**Scope**:

- Comprehensive review of all monitoring systems
- Validation of automated metrics
- Long-term trend analysis
- Comparison to public commitments
- External stakeholder perception assessment

**Includes**:

- Forensic review of decisions (larger sample)
- Interviews with staff (cultural assessment)
- Review of all governance decisions
- Public signal vs. actual behavior alignment check

---

### Layer 3: Human Intelligence

#### 3.1 Staff Feedback Systems

**Channels**:

- Anonymous reporting channel (direct to oversight board)
- Regular staff surveys on mission adherence
- Exit interviews specifically probing drift concerns
- Skip-level meetings with oversight board members

**Key Questions**:

```
- "Do you feel pressure to lower evidence standards?"
- "Have you witnessed shortcuts or overrides you were uncomfortable with?"
- "Is the mission treated as mandatory or aspirational?"
- "Can you refuse to act on insufficient evidence without career impact?"
- "Do you trust the oversight mechanisms?"
```

**Early Warning Signals**:

- Staff report pressure to compromise
- Increasing discomfort with decisions
- Retention problems among mission-aligned staff
- Self-censorship due to fear of pushback

#### 3.2 Oversight Board Direct Engagement

**Activities**:

- Quarterly unfiltered briefings from operational staff
- Direct review of decision logs (not summaries)
- Attendance at operational meetings (observer)
- One-on-one conversations with team members

**Purpose**: Board sees reality, not curated presentations

#### 3.3 External Stakeholder Feedback

**Sources**:

- Partner feedback on decision quality and consistency
- Regulator observations and concerns
- User/customer perception surveys
- Public sentiment monitoring

**Indicators**:

- Partners expressing concern about changes
- Regulators asking questions about drift
- Users noticing inconsistencies
- Public criticism of perceived standard reduction

---

### Layer 4: Comparative Analysis

#### 4.1 Baseline Comparisons

**Method**: Compare current metrics to historical baseline

**Metrics**:

```
Evidence Quality:
  - Baseline (Year 1): 99.8% citation rate, 4.2/5 avg quality
  - Current: X% citation rate, Y/5 avg quality
  - Trend: [up/down/stable]

Refusal Rate:
  - Baseline: 8% of requests refused (insufficient evidence)
  - Current: X% refused
  - Trend: [Declining refusal rate may indicate lower standards]

Escalation Rate:
  - Baseline: 12% escalated to human review
  - Current: X% escalated
  - Trend: [Declining may indicate avoiding oversight]
```

**Alert**: Statistically significant divergence from baseline

#### 4.2 Peer Comparisons

**Method**: Compare to similar organizations or stated best practices

**Purpose**: Detect absolute drift (not just relative to own baseline)

---

## Drift Detection Dashboard

### For Oversight Board (Real-Time)

```
┌─────────────────────────────────────────────────────┐
│ MISSION ADHERENCE DASHBOARD                         │
├─────────────────────────────────────────────────────┤
│ INVARIANT COMPLIANCE            STATUS              │
│ • Evidence Discipline           ✅ 99.9% (7d)       │
│ • Refusal Under Uncertainty     ✅ 8.2% rate        │
│ • Independent Oversight         ✅ Fully engaged    │
│ • Scope Adherence               ⚠️  2 edge cases     │
│ • Transparency                  ✅ On schedule      │
├─────────────────────────────────────────────────────┤
│ DRIFT INDICATORS                                     │
│ • Standard Erosion              ✅ No degradation   │
│ • Scope Creep                   ⚠️  Monitor         │
│ • Governance Bypass             ✅ Zero incidents   │
│ • Cultural Drift                ✅ Healthy          │
│ • Linguistic Drift              ✅ Stable           │
├─────────────────────────────────────────────────────┤
│ ALERTS (Last 30 Days)                               │
│ 🚨 Critical: 0                                      │
│ ⚠️  Warning: 2 (reviewed, addressed)                │
├─────────────────────────────────────────────────────┤
│ NEXT REVIEW: Quarterly audit in 12 days            │
└─────────────────────────────────────────────────────┘
```

---

## Specific Drift Indicators Catalog

### Standard Erosion Indicators

| Indicator                               | Threshold     | Alert Level |
| --------------------------------------- | ------------- | ----------- |
| Evidence citation rate decline          | <99% (7d)     | ⚠️ Warning  |
| Evidence citation rate decline          | <95% (7d)     | 🚨 Critical |
| Average evidence quality decline        | >10% (30d)    | ⚠️ Warning  |
| Minimum evidence threshold not met      | Any instance  | 🚨 Critical |
| Override of evidence requirement        | >1% decisions | ⚠️ Warning  |
| "Fast-track" decisions without evidence | Any instance  | 🚨 Critical |

### Scope Creep Indicators

| Indicator                                  | Threshold            | Alert Level |
| ------------------------------------------ | -------------------- | ----------- |
| Out-of-scope decision                      | Any without approval | 🚨 Critical |
| Edge case frequency increase               | >20% (30d)           | ⚠️ Warning  |
| New capability without governance approval | Any instance         | 🚨 Critical |
| Partnership creating scope obligations     | Any without review   | ⚠️ Warning  |
| User requests for out-of-scope             | Trending up          | ℹ️ Info     |

### Governance Bypass Indicators

| Indicator                                | Threshold    | Alert Level |
| ---------------------------------------- | ------------ | ----------- |
| Reserved decision without board approval | Any instance | 🚨 Critical |
| Board meeting cancelled                  | Any instance | ⚠️ Warning  |
| Board information access delayed         | >24 hours    | ⚠️ Warning  |
| Board information access denied          | Any instance | 🚨 Critical |
| Emergency override not reviewed          | >72 hours    | 🚨 Critical |
| Whistleblower report                     | Any received | 🚨 Critical |

### Cultural Drift Indicators

| Indicator                                      | Threshold          | Alert Level |
| ---------------------------------------------- | ------------------ | ----------- |
| Staff pressure to compromise                   | Any report         | ⚠️ Warning  |
| Mission-aligned staff departure                | >2/quarter         | ⚠️ Warning  |
| Staff survey: mission treated as mandatory     | <90% agree         | ⚠️ Warning  |
| Staff survey: can refuse without career impact | <80% agree         | 🚨 Critical |
| Internal discourse dismissing constraints      | Repeated instances | ⚠️ Warning  |

### Linguistic Drift Indicators

| Indicator                              | Detection Method     | Alert Level |
| -------------------------------------- | -------------------- | ----------- |
| "Evidence-based" → "Data-informed"     | Document analysis    | ⚠️ Warning  |
| "Mandatory" → "Best practice"          | Communication review | ⚠️ Warning  |
| "Oversight" → "Advisory"               | Governance docs      | 🚨 Critical |
| "Refusal" → "Conservative"             | Framing shift        | ⚠️ Warning  |
| "Constraints" → "Process" (dismissive) | Cultural signals     | ⚠️ Warning  |

---

## Drift Response Protocols

### Warning Level Response (⚠️)

**Timeline**: 48-72 hours

**Actions**:

1. Oversight board notification (automatic)
2. Root cause investigation initiated
3. Remediation plan required within 48 hours
4. Monitoring frequency increased
5. Follow-up verification within 7 days

**Documentation**:

- Drift indicator logged
- Investigation findings recorded
- Remediation plan documented
- Outcome tracked

---

### Critical Level Response (🚨)

**Timeline**: Immediate (4-24 hours)

**Actions**:

1. Immediate oversight board notification
2. Emergency board session if needed
3. Automatic escalation if governance violation
4. Operations may be constrained pending resolution
5. Independent review triggered
6. Public disclosure consideration
7. Personnel accountability review

**Documentation**:

- Incident report filed
- Full chain of causation documented
- Accountability determined
- Preventive measures implemented
- Public disclosure if material

---

## Anti-Patterns in Drift Detection

### Pattern: Monitoring Metrics That Don't Matter

**Symptom**: Tracking vanity metrics that look good but don't detect drift

**Example**: "Number of decisions made" vs. "% decisions with adequate evidence"

**Fix**: Focus on mission-critical indicators, not operational throughput

---

### Pattern: Alert Fatigue

**Symptom**: So many alerts that critical ones are missed

**Fix**: Strict threshold discipline; only alert on material issues

---

### Pattern: Lag Indicators Only

**Symptom**: Detecting drift after it's already causing harm

**Example**: Only monitoring compliance violations (after-the-fact) vs. staff pressure reports (leading indicator)

**Fix**: Balance lagging and leading indicators

---

### Pattern: Data Without Wisdom

**Symptom**: Overwhelming data, no synthesis or action

**Fix**: Dashboard with clear signals, automated escalation, forced response

---

### Pattern: Siloed Detection

**Symptom**: Each monitor independent; no synthesis of patterns

**Fix**: Integrated view across all drift types

---

## Drift Detection Checklist

### Technical Infrastructure

- [ ] Automated monitoring systems deployed
- [ ] Alert thresholds configured
- [ ] Oversight board dashboard operational
- [ ] Audit trail immutability verified
- [ ] Anomaly detection algorithms calibrated

### Audit Mechanisms

- [ ] Quarterly audit schedule established
- [ ] Independent auditor contracted
- [ ] Audit scope defined and documented
- [ ] Remediation protocols defined
- [ ] Annual deep audit planned

### Human Intelligence

- [ ] Anonymous reporting channel active
- [ ] Staff surveys scheduled and conducted
- [ ] Exit interview protocols include drift questions
- [ ] Oversight board direct engagement scheduled
- [ ] External stakeholder feedback collected

### Response Protocols

- [ ] Warning-level response protocol documented
- [ ] Critical-level response protocol documented
- [ ] Escalation chains defined and tested
- [ ] Remediation timeframes established
- [ ] Accountability mechanisms in place

### Ongoing Maintenance

- [ ] Baseline metrics established
- [ ] Monitoring systems tested regularly
- [ ] Alert thresholds reviewed annually
- [ ] Detection gaps identified and addressed
- [ ] False positive/negative analysis conducted

---

## Success Metrics

Drift detection is effective when:

- ✅ Drift is identified in early stages (leading indicators)
- ✅ Alerts lead to timely investigation and remediation
- ✅ Zero undetected mission compromises
- ✅ Staff trust the monitoring and reporting systems
- ✅ Oversight board has real-time visibility
- ✅ Trend analysis prevents drift before it starts
- ✅ External audits confirm internal monitoring accuracy

---

## Related Documents

- [Mission Lock](mission-lock.md) - What monitoring protects
- [Governance Firewalls](governance-firewalls.md) - Who responds to drift detection
- [Succession Protocols](succession-protocols.md) - Enhanced monitoring during transitions
- [Escape Hatches](escape-hatches.md) - What to do if drift is uncontrollable
