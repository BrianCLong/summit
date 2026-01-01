# Information Integrity Scoring (Adversarial-Aware)

## Innovation Pillar 1

> **"Trust Is Contextual, Integrity Is Adversarial."**

## Executive Summary

Confidence scores measure **how certain a system is about a claim**. Integrity scores measure **how resistant that claim is to adversarial manipulation**.

Under attack, high confidence is meaningless without high integrity.

Summit introduces **Integrity Scores** as an orthogonal dimension to confidence, explicitly accounting for adversarial pressure and manipulation risk.

---

## The Confidence-Integrity Matrix

Traditional systems operate on a single axis:

```
Low Confidence ←→ High Confidence
```

Summit operates on two axes:

```
                High Integrity
                      │
                      │
Low Confidence ───────┼─────── High Confidence
                      │
                      │
                Low Integrity
```

This creates **four quadrants** with different operational implications:

### Quadrant 1: High Confidence, High Integrity
- **Interpretation**: Strong belief, resistant to manipulation
- **Action**: Proceed with confidence
- **Example**: Cryptographically signed data from established source with independent verification

### Quadrant 2: High Confidence, Low Integrity
- **Interpretation**: Strong belief, vulnerable to manipulation
- **Action**: Escalate scrutiny, seek independent verification
- **Example**: Coordinated narrative from multiple sources with no independent confirmation
- **Warning**: This is where sophisticated attacks succeed

### Quadrant 3: Low Confidence, High Integrity
- **Interpretation**: Uncertain but trustworthy process
- **Action**: Acceptable for low-stakes decisions, seek more information for high-stakes
- **Example**: Preliminary analysis from verified source with transparent uncertainty

### Quadrant 4: Low Confidence, Low Integrity
- **Interpretation**: Uncertain and untrustworthy
- **Action**: Discard or treat as noise
- **Example**: Unverified rumors from unknown sources

---

## Integrity Score Components

Integrity scores are computed from **five factors**:

### 1. Source Volatility (SV)
**Measures**: Historical stability of the source's reporting patterns

```
SV = 1 - (variance(source_behavior) / expected_variance)
```

**Factors**:
- Frequency of contradictory statements
- Rate of claim retractions
- Consistency of reporting format
- Stability of update cadence

**Rationale**: Compromised or manipulated sources exhibit behavioral anomalies

**Score Range**: [0.0, 1.0]
- 1.0 = Highly stable, consistent source
- 0.0 = Erratic, unreliable source

### 2. Correlation Independence (CI)
**Measures**: Degree to which claims are independently verified

```
CI = unique_sources / total_sources
```

**Factors**:
- Number of independent verification paths
- Diversity of verification methods
- Absence of circular citation
- Geographic/organizational diversity of sources

**Rationale**: Coordinated disinformation appears as high correlation without true independence

**Score Range**: [0.0, 1.0]
- 1.0 = Fully independent verification from diverse sources
- 0.0 = Single source or circular verification

### 3. Historical Adversarial Behavior (HAB)
**Measures**: Source's history as an attack vector or target

```
HAB = 1 - (successful_attacks_via_source / total_attacks_detected)
```

**Factors**:
- Number of times source was compromised
- Number of times source originated false information
- Time since last known compromise
- Recovery and remediation quality after incidents

**Rationale**: Sources with adversarial history require elevated scrutiny

**Score Range**: [0.0, 1.0]
- 1.0 = No adversarial history, clean record
- 0.0 = Frequent vector for attacks or disinformation

### 4. Narrative Shift Velocity (NSV)
**Measures**: Rate of change in source's explanatory framework

```
NSV = 1 - (narrative_change_rate / expected_change_rate)
```

**Factors**:
- Speed of adopting new narratives
- Frequency of explanatory framework changes
- Alignment with coordinated narrative shifts
- Premature certainty on developing situations

**Rationale**: Sudden narrative shifts often indicate coordinated manipulation

**Score Range**: [0.0, 1.0]
- 1.0 = Stable, evidence-driven narrative evolution
- 0.0 = Erratic, suspiciously rapid narrative changes

### 5. Verification Depth (VD)
**Measures**: Quality of evidence chain supporting the claim

```
VD = verified_links / total_links_in_chain
```

**Factors**:
- Cryptographic verification of source identity
- Audit trail completeness
- Evidence provenance tracking
- Independent reproducibility of claims

**Rationale**: Deep verification chains resist manipulation

**Score Range**: [0.0, 1.0]
- 1.0 = Complete cryptographic verification chain
- 0.0 = Unverified, no evidence trail

---

## Composite Integrity Score Calculation

The **final Integrity Score (IS)** is computed as a weighted geometric mean:

```
IS = (SV^w1 × CI^w2 × HAB^w3 × NSV^w4 × VD^w5)^(1/(w1+w2+w3+w4+w5))
```

**Default weights** (tunable per deployment):
- w1 (Source Volatility) = 0.15
- w2 (Correlation Independence) = 0.30
- w3 (Historical Adversarial Behavior) = 0.20
- w4 (Narrative Shift Velocity) = 0.15
- w5 (Verification Depth) = 0.20

**Rationale for geometric mean**: A single catastrophic failure in any component should significantly reduce overall integrity, unlike arithmetic mean which can mask critical weaknesses.

---

## Operational Thresholds

Summit defines **three integrity zones**:

### High Integrity Zone (IS ≥ 0.70)
- **Interpretation**: Information resistant to known adversarial techniques
- **Actions**:
  - Normal processing
  - Standard decision authority
  - Routine logging

### Medium Integrity Zone (0.40 ≤ IS < 0.70)
- **Interpretation**: Potential manipulation risk
- **Actions**:
  - Enhanced scrutiny required
  - Seek independent verification
  - Elevated logging and audit
  - Human-in-the-loop for high-impact decisions

### Low Integrity Zone (IS < 0.40)
- **Interpretation**: High manipulation risk
- **Actions**:
  - Treat as potentially adversarial
  - Mandatory independent verification
  - Flag for operator review
  - Quarantine from automated decision chains
  - Detailed forensic logging

---

## Integration with Confidence Scores

Summit maintains **both** confidence and integrity as first-class metadata:

```json
{
  "claim": "Service X experienced 40% latency increase at 14:23 UTC",
  "confidence": 0.92,
  "integrity": 0.58,
  "integrity_breakdown": {
    "source_volatility": 0.85,
    "correlation_independence": 0.42,
    "historical_adversarial_behavior": 0.90,
    "narrative_shift_velocity": 0.65,
    "verification_depth": 0.35
  },
  "recommended_action": "ESCALATE_SCRUTINY",
  "rationale": "High confidence but medium integrity due to low correlation independence (0.42) and weak verification depth (0.35)"
}
```

---

## Decision Rules

### Rule 1: Confidence Without Integrity Triggers Escalation
```
IF confidence > 0.80 AND integrity < 0.60 THEN
  ESCALATE for independent verification
  LOG as potential coordination attack
```

### Rule 2: Integrity Gates Critical Decisions
```
IF decision_impact = CRITICAL THEN
  REQUIRE integrity > 0.70 OR human_override
```

### Rule 3: Integrity Anomalies Trigger Investigation
```
IF integrity_score < (baseline - 2×stddev) THEN
  INITIATE adversarial investigation
  NOTIFY security operations
```

### Rule 4: Integrity Decay Over Time
```
integrity_effective = integrity_base × exp(-λ × time_since_verification)
```
Where λ is tuned based on information volatility

---

## Adversarial Scenarios Addressed

### Scenario 1: Coordinated Disinformation Campaign
**Attack**: Multiple sources converge on false narrative
- High confidence (agreement across sources)
- Low integrity (low correlation independence, high narrative shift velocity)
- **Result**: Flagged for scrutiny despite high confidence

### Scenario 2: Compromised Trusted Source
**Attack**: Previously reliable source begins distributing false information
- High confidence (trusted source)
- Low integrity (historical adversarial behavior declining, source volatility increasing)
- **Result**: Detected via integrity degradation before major impact

### Scenario 3: Timing Attack with Plausible Delay
**Attack**: Critical information withheld until decision window closes
- Medium confidence (incomplete information)
- Medium integrity (verification depth low due to time pressure)
- **Result**: Temporal relevance rules (see `temporal-truth.md`) override integrity requirements

### Scenario 4: Authority Laundering
**Attack**: False claims attributed to credible sources
- High confidence (attributed to authority)
- Low integrity (verification depth fails on attribution chain)
- **Result**: Caught by verification depth component

---

## Implementation Considerations

### Data Requirements
- **Historical source behavior**: Minimum 30 days of baseline data
- **Attack database**: Known adversarial incidents and sources
- **Verification infrastructure**: Cryptographic signing, audit trails
- **Correlation tracking**: Cross-source relationship mapping

### Performance
- Integrity scores computed **asynchronously** to avoid blocking critical path
- Cached with TTL based on information stability
- Recomputed on demand for high-impact decisions
- Incremental updates as new information arrives

### Tuning
- Weights adjusted based on threat environment
- Thresholds calibrated to organizational risk tolerance
- Component formulas adapted to domain-specific risks
- Regular red-team testing to validate effectiveness

---

## Monitoring and Alerting

### Integrity Degradation Alerts
```
ALERT: integrity_score < threshold
ALERT: integrity_drop_rate > acceptable_velocity
ALERT: correlation_independence approaching zero (coordination attack)
ALERT: source_volatility sudden spike (compromise indicator)
```

### Integrity Dashboard Metrics
- Distribution of integrity scores across all active information
- Integrity score trends over time per source
- Correlation between integrity predictions and actual adversarial events
- False positive/negative rates for integrity-based escalations

---

## Case Study: Integrity Preventing Cascade Failure

### Scenario
At 09:15, monitoring system reports database outage with 95% confidence.
- Multiple internal sources confirm
- Automated remediation begins
- Customer notifications prepared

### Traditional Response
Act immediately on high confidence → begin failover

### Integrity-Aware Response
```
Confidence: 0.95
Integrity: 0.43 (breakdown)
  - correlation_independence: 0.20 (all sources share same data path)
  - verification_depth: 0.35 (no independent health check)
  - narrative_shift_velocity: 0.50 (very rapid consensus)

ACTION: Hold automated response, dispatch human verification
```

### Outcome
Human investigation reveals:
- Monitoring system itself was compromised
- Database was fully operational
- Attack designed to trigger expensive failover

**Integrity scoring prevented**: Unnecessary failover, customer alarm, and operational disruption

---

## Future Enhancements

### Planned Additions
1. **Adversarial ML integration**: Use trained models to detect subtle manipulation patterns
2. **Provenance graphs**: Visual representation of verification chains
3. **Integrity prediction**: Forecast integrity degradation before it occurs
4. **Cross-organization integrity sharing**: Anonymized adversarial intelligence

### Research Directions
- Optimal weight tuning via reinforcement learning
- Integration with narrative collision detection for compound scoring
- Integrity-aware automated decision thresholds
- Economic modeling of integrity verification costs vs. risk reduction

---

## Relationship to Other Pillars

- **Narrative Collision Detection**: Informs correlation independence and narrative shift velocity
- **Authority Continuity**: Feeds historical adversarial behavior component
- **Temporal Truth**: Provides time-decay function for integrity scores
- **Blast Radius Containment**: Uses integrity scores to determine quarantine necessity

---

## Success Metrics

Integrity scoring effectiveness measured by:

- **Attack detection rate**: % of manipulation attempts flagged via integrity
- **False alarm rate**: % of legitimate information incorrectly flagged
- **Lead time**: Average time between integrity flag and confirmed attack
- **Prevented incidents**: High-confidence, low-integrity cases that avoided harm

---

## Conclusion

Confidence alone is a lagging indicator under adversarial conditions.

Integrity scoring provides **leading indicators** of manipulation, creating defensive depth before attacks succeed.

This is not theoretical. This is operationally deployable today.

---

**Document Status**: Canonical
**Last Updated**: 2026-01-01
**Owner**: Summit Truth Operations Team
**Related Threat Classes**: Poisoning, Narrative, Authority
