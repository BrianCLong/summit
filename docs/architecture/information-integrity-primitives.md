# Information Integrity Primitives

**Version:** 1.0
**Status:** Active
**Owner:** Intelligence Foundry Architecture

This document defines the core primitives for Summit's Information Integrity stack, designed to detect and mitigate AI swarm activity, synthetic consensus, and narrative attacks. These primitives operate at the graph and lineage level, moving beyond content-based analysis.

## 1. Graph-Level Anomaly Invariant (INT-PRM-001)

### Description
A cryptographic assertion that a subgraph's topology (connectivity, density, clustering coefficient) matches expected organic growth patterns. Violations indicate "synthetic consensus" or manufactured amplification.

### Inputs
*   **Subgraph Snapshot**: A set of nodes (Actors, Content) and edges (Interactions) within a time window.
*   **Baseline Model**: The expected topological distribution for the specific community context.

### Deterministic Outputs
*   **Topology Hash**: Stable hash of the subgraph structure.
*   **Anomaly Score**: Normalized distance (0-1) from the baseline model.
*   **Verdict**: `ORGANIC` | `SYNTHETIC` | `INDETERMINATE`.

### Use Case
Detecting "astroturfing" where a bot swarm creates a dense cluster of mutual interaction that looks distinct from organic discussion webs.

---

## 2. Identity Lineage Object (INT-PRM-002)

### Description
A persistent, cross-temporal record of an actor's behavior, designed to track "persona persistence" and detect "identity drift" (e.g., a sleeping account suddenly waking up as a political pundit).

### Inputs
*   **Actor ID**: Platform-agnostic identifier.
*   **Behavioral Signals**: Time-series data of posting frequency, topic distribution, and linguistic fingerprints.
*   **Provenance Events**: History of account creation, verification, and major profile changes.

### Deterministic Outputs
*   **Lineage Hash**: Chain-of-custody hash for the identity's history.
*   **Drift Vector**: Magnitude of behavioral change over delta-t.
*   **Authenticity Verdict**: `VERIFIED` | `SUSPICIOUS_DRIFT` | `COMPROMISED`.

### Use Case
Identifying "sleeper agents" or sold accounts used in swarm operations.

---

## 3. Narrative Propagation Vector (INT-PRM-003)

### Description
A model for tracking the *flow* of a specific narrative across the graph, treating information as a systemic risk factor. It measures velocity, acceleration, and cross-domain hops.

### Inputs
*   **Narrative Markers**: Semantic embeddings or keywords defining the narrative.
*   **Graph Context**: The network through which the narrative is moving.
*   **Temporal Buckets**: Time slices for velocity calculation.

### Deterministic Outputs
*   **Propagation Signature**: Vector describing spread characteristics (e.g., `[velocity, acceleration, branching_factor]`).
*   **Cascade Probability**: Predicted likelihood of the narrative jumping to a new domain (e.g., Social -> Mainstream Media).

### Use Case
Predicting and preempting "viral misinformation" before it achieves systemic scale.

---

## 4. Coordination Signature (INT-PRM-004)

### Description
A composite signal detecting synchronized activity across seemingly unrelated actors, the hallmark of AI swarm orchestration.

### Inputs
*   **Action Window**: A tight temporal window (e.g., 500ms).
*   **Actor Set**: The group of actors performing actions.
*   **Content Similarity Matrix**: Pairwise similarity of content generated.

### Deterministic Outputs
*   **Synchronization Score**: Measure of temporal clustering.
*   **Semantic Alignment Score**: Measure of content homogeneity.
*   **Swarm Probability**: `Low` | `Medium` | `High` | `CRITICAL`.

### Use Case
Flagging "bot swarms" that post different content but at the exact same millisecond, or variations of the same message tailored to evade deduplication.
