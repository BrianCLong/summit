# Probabilistic Actor Attribution & Confidence Model

## 1. Overview

Summit uses a **Probabilistic Attribution Model** rather than binary "bot/human" labels. This approach acknowledges the ambiguity of modern hybrid actors and provides defensible confidence intervals for downstream enforcement.

## 2. Confidence Scoring Algorithm

The `AttributionConfidenceScore` (0.0 - 1.0) is a weighted aggregate of three signals:

### 2.1. Technical Signals (40%)

* IP Reputation
* Device Fingerprint Entropy
* Automation Headers
* Client-Side TLS Fingerprinting (JA3/JA4)

### 2.2. Behavioral Signals (40%)

* Temporal Consistency (24h activity)
* Graph Topology (Clustering coefficient)
* Content Velocity vs. Organic Baselines

### 2.3. Narrative Signals (20%)

* Semantic adherence to known disinformation narratives.
* Coordination with confirmed swarm clusters.

## 3. Confidence Decay Logic

Attribution is not static. Confidence decays over time as actors evolve TTPs.

* **Half-Life:** A confidence score decays by 50% every 30 days unless reinforced by new evidence.
* **Formula:** $S_t = S_0 \cdot e^{-\lambda t}$
* **Purpose:** Prevents "stale" blocklists and forces continuous re-evaluation of threat actors.

## 4. Evidence-Grade Provenance Bundles

For high-confidence attributions (>0.9), Summit generates a cryptographically signed **Provenance Bundle** containing:

1. **Trace Data:** Raw logs of the triggering events.
2. **Logic Snapshot:** Version hash of the detection model used.
3. **Governance Policy:** Reference to the specific policy violated.
4. **Chain of Custody:** Timestamped signatures from Ingestion -> Analysis -> Verdict.

## 5. Mapping to Compliance Frameworks

| Summit Control | SOC 2 Criteria | ISO 27001 | NIST CSF |
| :--- | :--- | :--- | :--- |
| Provenance Bundle | CC6.8 (Integrity) | A.12.1.2 | PR.DS-6 |
| Confidence Decay | CC4.1 (Quality) | A.14.2.8 | DE.CM-3 |
| Attribution Log | CC2.2 (Comm.) | A.16.1.7 | RS.AN-3 |
