# Patent Claims: Summit Influence Operations Defense Suite

## Independent Claims

### Claim 1: Provenance-First Influence Detection
A computer-implemented method for detecting coordinated influence operations, comprising:
1.  **Ingesting** a plurality of communication artifacts from disparate sources;
2.  **Decomposing** said artifacts into a plurality of atomic claims;
3.  **Assigning** each atomic claim a unique provenance identifier bound to an immutable evidence bundle;
4.  **Constructing** a propagation graph wherein nodes represent said atomic claims and edges represent observed or inferred transmission paths;
5.  **Computing** an influence-likelihood score for a cluster of nodes based on a deviation between observed propagation patterns and a baseline provenance-consistent diffusion model.

### Claim 2: Narrative Acceleration Detection
A method for early warning of influence surges, comprising:
1.  **Extracting** narrative clusters from a time-sliced interaction graph;
2.  **Computing** a first-derivative "narrative velocity" based on the rate of expansion of a cluster's volume and reach;
3.  **Computing** a second-derivative "narrative curvature" based on the rate of change in the cluster's semantic direction or participant diversity;
4.  **Triggering** an alert when said narrative curvature exceeds a predefined threshold under a constraint of cross-source corroboration.

### Claim 3: Non-Semantic Coordination Detection
A system for detecting coordinated behavior without semantic analysis, comprising:
1.  A **Feature Extractor** configured to capture temporal alignment signatures and repost topology metadata from a multi-layer interaction graph;
2.  A **Coordination Scorer** configured to compute a similarity coefficient between interaction patterns of a plurality of entities using non-semantic features including synchronized posting windows and link co-bursting;
3.  A **Policy Engine** configured to classify a group of entities as coordinated when the similarity coefficient exceeds a threshold, independent of the linguistic content of their communications.

### Claim 4: Process-Legitimacy Attack Fingerprinting
A method for identifying institutional interference, comprising:
1.  **Classifying** discourse into a taxonomy of procedural-legitimacy frames, wherein said frames represent recurring procedural challenges to institutional authority;
2.  **Mapping** the occurrence of said frames onto an event timeline;
3.  **Identifying** anomalous persistence or recurrence of specific frame sequences that correlate with external geopolitical or social events;
4.  **Generating** a fingerprint of an institutional interference campaign based on said frame sequences.

### Claim 5: Explainable Influence Risk Assessment
A method for generating auditable influence risk scores, comprising:
1.  **Aggregating** evidence from a plurality of graph-based influence detectors;
2.  **Computing** an aggregate risk score for a target entity or cluster;
3.  **Extracting** a minimal causally sufficient subgraph (a "causal envelope") that contains the smallest set of nodes and edges required to support the risk score;
4.  **Persisting** said risk score with a cryptographic link to the causal envelope and the underlying evidence bundles.

## Dependent Claims

*   **Claim 6**: The method of Claim 1, wherein the immutable evidence bundle includes a hash of the original source content and a timestamp of ingestion.
*   **Claim 7**: The method of Claim 2, wherein the semantic direction is measured using a centroid shift in a high-dimensional embedding space.
*   **Claim 8**: The system of Claim 3, wherein the repost topology metadata includes "reply-order shadowing" patterns across multiple platforms.
*   **Claim 9**: The method of Claim 4, wherein the procedural-legitimacy frames include "recursive review demands" and "evidence-integrity challenges."
*   **Claim 10**: The method of Claim 5, further comprising a "Policy Gate" that prevents the export of the risk score if the evidence completeness within the causal envelope falls below a threshold.
