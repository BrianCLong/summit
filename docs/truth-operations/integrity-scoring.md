# Integrity Scoring: Adversarial-Aware Trust

## Overview

In a hostile information environment, **confidence is insufficient**. A model might be 99% confident in a conclusion derived from poisoned data. Summit introduces **Integrity Scores**, a metric orthogonal to confidence that measures the *trustworthiness* of the information's path and origin under adversarial pressure.

**Narrative Framing:** "Trust Is Contextual, Integrity Is Adversarial."

---

## The Integrity Score Model

The Integrity Score ($I$) is a composite metric ranging from 0.0 (Known Compromise) to 1.0 (Cryptographically Verified Ground Truth). Unlike confidence ($C$), which measures *predictive probability*, Integrity ($I$) measures *resilience to manipulation*.

### Core Components

The Integrity Score is calculated based on four primary vectors:

#### 1. Source Volatility ($V_s$)
*   **Definition:** Measures the stability of a source's reporting patterns over time.
*   **Adversarial Indicator:** Sudden bursts of high-volume output from a previously low-volume source often indicate account compromise or bot activation.
*   **Scoring:** High volatility penalizes the score.

#### 2. Cross-Source Correlation ($C_{corr}$)
*   **Definition:** The degree to which a piece of information is corroborated by independent, disjoint sources.
*   **Adversarial Indicator:** "Echo chamber" effects where multiple ostensibly independent sources report the exact same phrasing simultaneously (indicating a coordinated campaign).
*   **Scoring:** Independent corroboration boosts the score; suspicious coordination (identical timestamps/phrasing) penalizes it.

#### 3. Historical Adversarial Behavior ($H_{adv}$)
*   **Definition:** A reputation score based on past interactions.
*   **Adversarial Indicator:** Previous instances of spreading debunked narratives or participating in noise attacks.
*   **Scoring:** A "three strikes" model where past offenses heavily weigh down current integrity.

#### 4. Narrative Shift Velocity ($N_{vel}$)
*   **Definition:** The rate at which a source changes its explanatory frame.
*   **Adversarial Indicator:** Rapidly "trying on" different stories to see what sticks (e.g., "It didn't happen" -> "It happened but was an accident" -> "It happened and they deserved it").
*   **Scoring:** High shift velocity indicates low integrity.

---

## Scoring Logic & Thresholds

### Calculation (Simplified)

$$ I = \frac{ (1 - V_s) + C_{corr} + H_{adv} + (1 - N_{vel}) }{4} $$

*Note: In production, this is a weighted vector sum with non-linear penalties for critical failures (e.g., if $H_{adv} = 0$, then $I \approx 0$).*

### Operational Tiers

| Integrity Score | Tier | operational Handling |
| :--- | :--- | :--- |
| **0.90 - 1.00** | **Ironclad** | Auto-approve for high-stakes decisions. |
| **0.70 - 0.89** | **Verified** | Standard processing; human review for outliers. |
| **0.40 - 0.69** | **Contested** | **Quarantine required.** Must be corroborated before use. |
| **0.00 - 0.39** | **Hostile** | **Discard or Contain.** Treat as active disinformation. |

---

## Integrity vs. Confidence

It is critical to distinguish Integrity from Confidence.

*   **High Confidence, High Integrity:** "The sun rose today." (Reliable fact, reliable source).
*   **Low Confidence, High Integrity:** "It might rain tomorrow." (Uncertain future, honest reporting).
*   **High Confidence, Low Integrity:** "You have won the lottery!" (Definite claim, malicious intent). **This is the danger zone.**
*   **Low Confidence, Low Integrity:** "Aliens might be stealing your socks." (Nonsense).

**Summit's Policy:** Decisions require a minimum *Integrity Threshold*, regardless of Confidence. We would rather miss an opportunity (low confidence) than act on a lie (low integrity).

---

## Implementation

### Metadata Schema

Every information object in Summit carries an `integrity_metadata` block:

```json
{
  "integrity_score": 0.65,
  "vectors": {
    "volatility": 0.2,
    "correlation": 0.8,
    "history": 0.9,
    "narrative_velocity": 0.7
  },
  "flags": ["suspected_coordination", "high_velocity"],
  "tier": "CONTESTED"
}
```

### Response Protocol

When Integrity drops below the threshold (e.g., < 0.5):
1.  **Escalate Scrutiny:** Trigger deep-scan verification (expensive compute).
2.  **Tag Provenance:** Mark all downstream derivatives as "tainted".
3.  **Alert Analysts:** "High-confidence claim from low-integrity source detected."

## Conclusion

Integrity Scoring turns trust from a binary assumption into a quantified, defensible metric, allowing Summit to operate safely in environments filled with confident lies.
