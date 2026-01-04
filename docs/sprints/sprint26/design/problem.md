# Problem: The Fog of Information War

## User Journey
The primary persona is **Analyst "Cipher"**, an IntelGraph Intelligence Analyst specializing in Influence Operations.

### Scenario
1.  **Trigger:** Cipher receives an alert about a rapidly spreading narrative: "Country X is contaminating water supplies."
2.  **Investigation:** Cipher opens the **Analyst UI** and queries the `InfoMap` service with a seed node (e.g., a specific Twitter handle or news URL).
3.  **Expansion:** The system visualizes the immediate neighborhood (Tier 1 nodes).
4.  **Deep Mapping:** Cipher requests a "Deep Map" (3-hop expansion). The system must rapidly ingest or retrieve connected nodes (blogs, forums, amplifiers).
5.  **Analysis:** The system highlights "Bridge Nodes" that connect disparate clusters (e.g., a fringe blog linking to a mainstream news site).
6.  **Action:** Cipher tags the cluster as "Coordinated Inauthentic Behavior" (CIB) and exports the graph for reporting.

## Job To Be Done
"Help me rapidly visualize the structural pathways of a narrative so I can identify the bridge nodes enabling its transition from fringe to mainstream."

## Constraints
*   **Latency:** The graph expansion must happen in < 10 seconds for a 3-hop query (approx 5k nodes).
*   **Privacy:** No individual user PII from social platforms can be stored without explicit purpose (GDPR). Social nodes must be aggregated or anonymized (e.g., "User Cluster A").
*   **Licensing:** Data ingestion must respect `robots.txt` and API terms of service.
