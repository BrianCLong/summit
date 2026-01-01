# Narrative Collision Detection: Identifying Truth Through Conflict

## Overview

Disinformation rarely presents as isolated "false facts." It arrives as coherent, plausible stories—**narratives**—that explain observed events in a misleading way. Summit's **Narrative Collision Detection** system is designed to identify when competing explanations exist for the same data, monitoring how these narratives interact, converge, or diverge.

**Narrative Framing:** "When stories harden too quickly, something is wrong."

---

## The Narrative Collision Graph

The core artifact is the **Narrative Collision Graph**, a specialized knowledge graph where:
*   **Nodes** are distinct Narratives (explanatory frames).
*   **Edges** represent Conflict (mutually exclusive claims) or Support (shared evidence).

### Detection Signals

Summit monitors the graph for three specific collision patterns that indicate manipulation.

#### 1. Premature Convergence (The "Forced Consensus")
*   **Pattern:** Multiple independent sources suddenly coalesce around a single, highly specific explanation within a very short window, minimizing uncertainty before evidence is available.
*   **Adversarial Intent:** To "set the narrative" before the truth can emerge (e.g., "The crash was definitely pilot error" reported minutes after impact).
*   **System Response:** **Lock Decision Window.** Prevent consensus-based actions until diversity returns or evidence catches up.

#### 2. Artificial Divergence (The "Muddy Waters")
*   **Pattern:** An explosion of contradictory, low-evidence narratives flooding the space simultaneously.
*   **Adversarial Intent:** To induce paralysis by overwhelming analysts with "alternative facts" (e.g., 50 different conspiracy theories released at once).
*   **System Response:** **Filter by Integrity.** Aggressively prune low-integrity nodes to reveal the core conflict.

#### 3. Suppressed Alternatives (The "Silent Dog")
*   **Pattern:** A plausible explanation (supported by evidence) is systematically ignored or actively downranked by a cluster of high-volume sources.
*   **Adversarial Intent:** To "bury" the truth through omission rather than direct refutation.
*   **System Response:** **Boost Neglected Signals.** Artificially upweight the suppressed narrative to ensure analyst visibility.

---

## Measuring Narrative Collision

We quantify collision using **Explanatory Diversity ($D_{exp}$)**.

*   **Low Diversity ($D_{exp} \to 0$):** Monoculture. Everyone agrees. (Safe if evidence is high; suspicious if evidence is low).
*   **High Diversity ($D_{exp} \to 1$):** Chaos. No consensus.
*   **Healthy Diversity:** A few well-supported competing hypotheses.

### The "Too Fast" Heuristic

$$ \text{Anomaly} = \frac{\Delta \text{Consensus}}{\Delta \text{Time}} \times \frac{1}{\text{Evidence}} $$

If Consensus rises rapidly while Evidence remains low, the Anomaly score spikes. This is a **Narrative Attack**.

---

## Operational Workflow

1.  **Ingest:** Stream data from multiple sources.
2.  **Cluster:** Group reports into Narrative Clusters based on semantic similarity and causal claims.
3.  **Detect:** Check for collision patterns (Forced Consensus, Muddy Waters).
4.  **Visualize:** Present the "Collision Graph" to analysts, highlighting:
    *   "The Mainstream View" (High volume)
    *   "The Challenger View" (High evidence, lower volume)
    *   "The Noise" (Low evidence, high volume)

## Conclusion

By detecting *collisions* rather than just *facts*, Summit identifies the *structure* of a disinformation campaign. We don't just ask "Is this true?"; we ask "Why is everyone saying this *now*?"
