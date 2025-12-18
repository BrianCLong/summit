# Use Case: NGA - GEOINT Fusion & Pattern of Life Analysis

## Mission Context
The National Geospatial-Intelligence Agency (NGA) provides world-class geospatial intelligence. The challenge is moving beyond static imagery analysis to dynamic "Activity-Based Intelligence" (ABI) that incorporates non-spatial data to explain *why* activity is occurring.

## Challenge
*   **Data Overload:** Too many sensors, too few eyes. Analysts cannot watch every pixel 24/7.
*   **Context Gap:** Imagery shows a truck moving; it doesn't say *who* is in it or *what* mission they are on.
*   **Temporal Blindness:** Static maps fail to capture complex temporal patterns.

## Summit Solution: Spatiotemporal Knowledge Graph

Summit integrates geospatial data (points, polygons, tracks) directly into the knowledge graph, allowing for queries that combine space, time, and semantic relationship.

### Key Capabilities Applied
1.  **Geospatial Indexing:** Native support for geospatial queries within the graph (e.g., "Find all meetings within 500m of this facility").
2.  **Timeline Visualization:** The "Triple Pane" view synchronizes map movements with a temporal event log, revealing cause-and-effect.
3.  **Multi-INT Correlation:** Overlaying SIGINT emits or OSINT social media posts onto the geospatial layer to confirm activity seen in imagery.

## Operational Workflow

1.  **Tip-and-Cue:** An automated alert from an OSINT feed (e.g., social media report of an explosion) triggers a tasking request for satellite imagery.
2.  **Pattern Analysis:** Summit ingests AIS (shipping) and ADSB (flight) data. The "Anomaly Detector" flags a vessel that has gone "dark" (AIS off) near a sanctioned port.
3.  **Network Resolution:** The analyst clicks on the vessel in the Map view. The Graph view immediately expands to show the shell company that owns it, the beneficial owners, and their links to a sanctioned regime.
4.  **Reporting:** The analyst generates a multimedia report combining the map overlay, the corporate ownership graph, and the timeline of the vessel's track.

## Impact
*   **Contextualized GEOINT:** Transforms pixels into proven identities and intent.
*   **Automated Watch:** AI agents monitor regions of interest for anomalous patterns, alerting analysts only when specific criteria are met.
*   **Supply Chain Visibility:** Unmasks illicit maritime and air logistics networks.
