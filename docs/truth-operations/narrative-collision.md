# Narrative Collision Detection

## Innovation Pillar 2

> **"When stories harden too quickly, something is wrong."**

## Executive Summary

Disinformation rarely arrives as false facts. It arrives as **plausible stories**—coherent explanations that fit the available evidence but lead to incorrect conclusions.

Traditional fact-checking focuses on **claims**. Narrative collision detection focuses on **explanations**.

Summit tracks competing narratives, monitors convergence patterns, and alerts when explanatory diversity collapses suspiciously fast.

---

## The Narrative Problem

### Facts vs. Narratives

**Fact**: "Server latency increased by 300ms at 14:23 UTC"

- Verifiable
- Binary (true/false)
- Resistant to interpretation

**Narrative**: "The latency increase was caused by a DDoS attack"

- Explanatory
- Probabilistic (many possible causes)
- Highly interpretable

### Why Narratives Matter

Operational decisions are driven by **causal understanding**, not raw facts:

- Which team responds?
- What mitigation is appropriate?
- How severe is the threat?
- What are the downstream risks?

**Corrupting the narrative controls the response**, even with accurate facts.

---

## Adversarial Narrative Techniques

### Technique 1: Premature Convergence

**Attack**: Push a single explanation before alternatives are explored

**Example**:

- 14:25: "It's a DDoS attack" (2 minutes after incident)
- 14:26: Multiple sources confirm DDoS narrative
- 14:30: Full DDoS response initiated
- 14:45: Actual cause found (database index corruption)

**Impact**: Wrong response team, delayed resolution, wasted resources

### Technique 2: Alternative Suppression

**Attack**: Actively discredit competing explanations

**Example**:

- Source A: "Could be network issue"
- Source B: "Unlikely, network metrics are normal" (false)
- Source C: "Definitely not network"
- Result: Network hypothesis abandoned despite being correct

### Technique 3: Coordinated Messaging

**Attack**: Multiple sources adopt same narrative simultaneously

**Example**:

- 10:00: Incident occurs
- 10:05: Three sources independently suggest "configuration error"
- 10:10: Seven more sources confirm configuration narrative
- 10:15: No other explanations being discussed

**Red flag**: Unnatural consensus speed

### Technique 4: False Coherence

**Attack**: Provide internally consistent but incomplete story

**Example**:

- "User reports slow login" → "Database query timeout" → "High CPU on DB server" → "Recent code deployment"
- Story is coherent and each link is true
- **Missing**: The actual cause (network packet loss) is outside this narrative

**Danger**: Coherent stories feel complete even when they're not

---

## Narrative Collision Graph

Summit constructs a **dynamic graph** tracking competing explanations:

### Graph Structure

```
[Observed Event]
       │
       ├──→ [Narrative A] (Support: 7 sources, Coherence: 0.85, Age: 15min)
       │         ├──→ [Sub-explanation A1]
       │         └──→ [Sub-explanation A2]
       │
       ├──→ [Narrative B] (Support: 3 sources, Coherence: 0.60, Age: 22min)
       │         └──→ [Sub-explanation B1]
       │
       └──→ [Narrative C] (Support: 1 source, Coherence: 0.40, Age: 5min)
                 └──→ [Sub-explanation C1]
```

### Node Attributes

**Event Node**:

- Timestamp
- Observable facts
- Unexplained elements
- Certainty level

**Narrative Node**:

- Supporting sources (count and list)
- Coherence score (internal consistency)
- Completeness score (what % of facts explained)
- Age (time since first proposed)
- Convergence velocity (rate of support growth)
- Geographic/organizational diversity of supporters
- Suppression score (active dismissal of alternatives)

---

## Narrative Metrics

### 1. Explanatory Diversity (ED)

**Measures**: Number of actively considered explanations

```
ED = count(narratives with support ≥ threshold)
```

**Healthy State**: Multiple competing narratives during early investigation
**Warning Sign**: ED drops to 1 very quickly

**Thresholds**:

- ED ≥ 3: Healthy exploration
- ED = 2: Convergence beginning
- ED = 1: Single narrative dominance (potential attack)

### 2. Convergence Velocity (CV)

**Measures**: Speed of consensus formation

```
CV = Δ(dominant_narrative_support) / Δt
```

**Healthy State**: Gradual convergence as evidence accumulates
**Warning Sign**: Sudden spike in support for single narrative

**Thresholds**:

- CV < 2 sources/hour: Natural convergence
- CV = 2-5 sources/hour: Monitor
- CV > 5 sources/hour: Potential coordinated attack

### 3. Unexplained Elements Ratio (UER)

**Measures**: How much of the evidence remains unexplained

```
UER = count(unexplained_facts) / count(total_facts)
```

**Healthy State**: UER decreases as investigation progresses
**Warning Sign**: Dominant narrative accepted while UER remains high

**Thresholds**:

- UER > 0.30: Investigation ongoing, premature to conclude
- UER = 0.10-0.30: Reasonable to form working hypothesis
- UER < 0.10: Strong explanatory power

### 4. Suppression Score (SS)

**Measures**: Active dismissal of alternative explanations

```
SS = count(explicit_rejections_of_alternatives) / count(alternative_proposals)
```

**Healthy State**: Alternatives dismissed with evidence
**Warning Sign**: Alternatives dismissed without investigation

**Thresholds**:

- SS < 0.30: Healthy debate
- SS = 0.30-0.60: Increasing dismissal
- SS > 0.60: Active suppression (attack indicator)

### 5. Narrative Diversity Index (NDI)

**Measures**: Distribution of support across narratives (entropy-based)

```
NDI = -Σ(p_i × log(p_i))
where p_i = support_i / total_support
```

**Healthy State**: NDI decreases gradually as evidence accumulates
**Warning Sign**: NDI drops suddenly (coordinated convergence)

---

## Collision Detection Rules

### Rule 1: Premature Convergence Alert

```
IF (time_since_event < T_min)
   AND (ED = 1)
   AND (UER > threshold)
THEN
   ALERT: "Premature narrative convergence detected"
   ACTION: Force alternative hypothesis generation
```

Default: T_min = 30 minutes for major incidents

### Rule 2: Coordinated Narrative Attack

```
IF (CV > velocity_threshold)
   AND (NDI_drop > entropy_threshold)
   AND (source_diversity < diversity_threshold)
THEN
   ALERT: "Potential coordinated narrative attack"
   ACTION: Escalate to security operations
```

### Rule 3: Unexplained Elements Warning

```
IF (UER > 0.30)
   AND (dominant_narrative_support > 0.80)
THEN
   ALERT: "High confidence narrative with significant unexplained elements"
   ACTION: Require explicit justification for unexplained facts
```

### Rule 4: Alternative Suppression Detection

```
IF (SS > 0.60)
   AND (suppressed_alternatives include plausible explanations)
THEN
   ALERT: "Active suppression of alternative explanations"
   ACTION: Mandate alternative exploration
```

---

## Defensive Protocols

### Protocol 1: Mandatory Alternative Hypothesis (MAH)

**Trigger**: Single narrative dominance before minimum exploration time

**Action**:

1. System automatically generates ≥2 alternative explanations
2. Each alternative must be explicitly investigated
3. Dismissal requires documented evidence
4. Cannot proceed until MAH satisfied

**Rationale**: Forces cognitive diversity even under time pressure

### Protocol 2: Narrative Red Team

**Trigger**: Critical decisions based on single narrative with UER > 0.20

**Action**:

1. Assign dedicated analyst to argue against dominant narrative
2. Red team must identify weaknesses and propose alternatives
3. Cannot finalize decision until red team concerns addressed

**Rationale**: Institutionalizes skepticism

### Protocol 3: Convergence Rate Limiting

**Trigger**: CV exceeds threshold

**Action**:

1. Slow down consensus formation artificially
2. Require time-delayed verification from independent sources
3. Flag rapid adopters for potential compromise

**Rationale**: Prevents coordinated rushes to judgment

### Protocol 4: Unexplained Elements Tracking

**Trigger**: Always active

**Action**:

1. Maintain explicit list of facts not explained by current narratives
2. Display prominently in decision interfaces
3. Require acknowledgment before acting on narrative

**Rationale**: Preserves uncertainty awareness

---

## Integration with Integrity Scoring

Narrative collision metrics **feed** integrity scoring:

- **Convergence Velocity** → influences Narrative Shift Velocity (NSV) component
- **Source Diversity** → influences Correlation Independence (CI) component
- **Suppression Score** → influences Historical Adversarial Behavior (HAB) component

Cross-pillar integration:

```json
{
  "event": "Production outage at 14:23 UTC",
  "dominant_narrative": "DDoS attack in progress",
  "confidence": 0.88,
  "integrity": 0.42,
  "narrative_metrics": {
    "explanatory_diversity": 1,
    "convergence_velocity": 6.2,
    "unexplained_elements_ratio": 0.35,
    "suppression_score": 0.75,
    "narrative_diversity_index": 0.15
  },
  "alert": "COORDINATED_NARRATIVE_ATTACK_SUSPECTED",
  "recommended_action": "MANDATE_ALTERNATIVE_EXPLORATION"
}
```

---

## Case Study: Narrative Attack on Financial System

### Timeline

**09:00**: Market volatility increases
**09:05**: Narrative A emerges: "Automated trading algorithm error"

- Plausible (algorithms cause flash crashes)
- Supported by 4 trading desks
- Coherence score: 0.82

**09:08**: Narrative A support grows to 12 sources

- Convergence velocity: 8 sources/hour (exceeds threshold)
- Unexplained elements ratio: 0.40 (high)
- Narrative diversity index: 0.20 (low)

**09:10**: Summit Alerts

```
ALERT: Premature convergence detected
ALERT: High unexplained elements ratio
ALERT: Convergence velocity exceeds safe threshold

ACTION: Mandatory Alternative Hypothesis protocol activated
ACTION: Red team assigned
```

**09:15**: Red team investigates, finds:

- Algorithm behavior was normal
- Actual cause: Coordinated sell orders from compromised accounts
- Narrative A was cover story to delay detection

**09:20**: Correct response initiated (freeze compromised accounts)

### Impact

**Without narrative collision detection**:

- Algorithm blamed, disabled
- Actual attack continues
- Estimated loss: $50M+

**With narrative collision detection**:

- Attack identified 15 minutes earlier
- Correct mitigation applied
- Estimated loss: $5M
- **90% reduction in damage**

---

## Visualization and Operator Interface

### Narrative Graph Display

Operators see:

- Real-time graph of competing narratives
- Color-coded by support level
- Warning indicators for:
  - Premature convergence (red)
  - High unexplained elements (yellow)
  - Active suppression (orange)
- Timeline showing narrative evolution

### Unexplained Elements Dashboard

Prominent display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  UNEXPLAINED ELEMENTS (4 remaining)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ⚠ Why did latency spike occur exactly at 14:23?
  ⚠ Why only affecting US-East region?
  ⚠ Why did automatic failover not trigger?
  ⚠ Why is CPU usage normal if this is compute-bound?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Narrative Timeline

Shows evolution of explanatory diversity:

```
09:00 ████████████ (4 narratives)
09:15 ██████       (2 narratives)
09:30 ██           (1 narrative) ⚠ CONVERGENCE ALERT
09:45 ██           (1 narrative) ⚠ HIGH UER WARNING
```

---

## Implementation Architecture

### Data Collection

- Parse incident reports for explanatory statements
- Classify statements as narrative vs. fact
- Track source and timestamp for each narrative proposal
- Identify relationships between narratives (support, contradiction, refinement)

### Analysis Pipeline

```
Raw Reports
    ↓
Narrative Extraction (NLP)
    ↓
Narrative Clustering
    ↓
Metric Calculation (ED, CV, UER, SS, NDI)
    ↓
Collision Detection Rules
    ↓
Alert Generation
    ↓
Operator Interface
```

### Storage Schema

```json
{
  "event_id": "evt_2026_001_345",
  "narratives": [
    {
      "narrative_id": "nar_001",
      "explanation": "DDoS attack from botnet",
      "sources": ["src_a", "src_b", "src_c"],
      "first_proposed": "2026-01-01T14:25:00Z",
      "support_timeline": [...],
      "coherence_score": 0.85,
      "completeness_score": 0.65,
      "suppression_score": 0.30
    }
  ],
  "unexplained_elements": [
    "Why failover didn't trigger",
    "Geographic pattern of failures"
  ],
  "metrics_timeline": [...]
}
```

---

## Advanced Features

### Narrative Prediction

Train models to predict:

- Which narratives will dominate
- Which facts will remain unexplained
- Attack vs. organic convergence patterns

### Narrative Genealogy

Track:

- How narratives evolve and mutate
- Which sources propagate which variants
- Narrative "patient zero" identification

### Cross-Incident Pattern Matching

Detect:

- Recurring narrative attack patterns
- Same adversary across different incidents
- Systematic narrative biases

---

## Success Metrics

Effectiveness measured by:

- **False consensus prevention**: Cases where premature convergence was blocked
- **Alternative discovery rate**: % of incidents where MAH found correct explanation
- **Attack detection lead time**: Time between narrative alert and confirmed manipulation
- **Decision quality improvement**: Comparison of outcomes with vs. without narrative collision detection

---

## Relationship to Other Pillars

- **Integrity Scoring**: Narrative metrics influence integrity components
- **Authority Continuity**: Tracks which authorities propose which narratives
- **Temporal Truth**: Balances narrative exploration time vs. decision urgency
- **Blast Radius Containment**: Isolates decisions based on suspicious narratives

---

## Conclusion

Facts can be verified. Narratives must be contested.

Narrative collision detection transforms Summit from a passive information processor into an **active epistemic defender**.

This capability is particularly critical for:

- National security (where adversaries weaponize explanations)
- Financial systems (where false narratives move markets)
- Infrastructure operations (where wrong diagnoses cause cascading failures)

The question is not whether narratives will be attacked.
The question is whether your system can detect it.

---

**Document Status**: Canonical
**Last Updated**: 2026-01-01
**Owner**: Summit Truth Operations Team
**Related Threat Classes**: Narrative Attacks, Authority Attacks
