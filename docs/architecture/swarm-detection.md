# Swarm Detection Architecture: Coordination Physics

## 1. Core Philosophy: Coordination Physics

Traditional detection relies on content analysis (truthfulness, toxicity), which LLMs can easily bypass. Summit shifts the detection paradigm to **Coordination Physics**—analyzing the *energy*, *entropy*, and *topology* of information flow.

**Premise:** Coordinated behavior, even when obfuscated, leaves statistical artifacts that differ from organic human behavior. We detect the *mechanism of coordination*, not the content.

## 2. Key Detection Signals (Graph Invariants)

### 2.1. Swarm-Level Entropy (The "Flat-Top" Signal)

* **Concept:** Organic human engagement is bursty (Poisson distribution). Automated/managed engagement is smoothed to maximize ROI or avoid rate limits.
* **Metric:** `swarming_entropy_coefficient`
* **Logic:** If the variance of inter-arrival times for a narrative is significantly lower than organic baseline, flag as artificial.

### 2.2. Narrative Persistence Vectors

* **Concept:** Organic outrage decays naturally. Synthetic narratives are "reheated" to maintain visibility.
* **Metric:** `narrative_decay_inversion`
* **Logic:** Detecting negative decay slopes that suddenly flatten or reverse without an external "exogenous shock" (news event).

### 2.3. Cross-Account Semantic Drift Bounds

* **Concept:** LLMs paraphrasing a single command will produce high semantic similarity but low lexical overlap.
* **Metric:** `semantic_lexical_divergence`
* **Logic:** High cosine similarity (embeddings) + Low Jaccard similarity (n-grams) = "The Parrot Paradox" (AI Paraphrasing).

### 2.4. Identity Half-Life Anomalies

* **Concept:** Sleeper accounts have distinct activity gaps.
* **Metric:** `dormancy_activation_ratio`
* **Logic:** Accounts with >6 months of silence that suddenly activate with high-velocity political content in coordination with others.

## 3. Detection Pipeline Architecture

### 3.1. Ingestion & Graph Projection

* Raw events (posts, likes) are projected into a temporal graph.
* Nodes: Actors, Artifacts.
* Edges: Interaction (weighted by velocity).

### 3.2. Windowed Feature Extraction

* Sliding windows (1h, 6h, 24h) calculate local entropy and topology metrics.
* GNN (Graph Neural Network) layers aggregate neighbor features to detect "soft" clusters.

### 3.3. Anomaly Scoring

* Ensemble model (Isolation Forest + GNN Classifier) generates a `coordination_probability` score [0-1].

## 4. Output Schema

Detectors output machine-verifiable JSON containing:

* `swarm_id`: Unique cluster ID.
* `confidence`: Probability of artificiality.
* `invariant_violation`: Specific physical law violated (e.g., "Low Entropy Arrival").
* `evidence`: List of artifact IDs and their timestamps.
