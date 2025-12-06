# Use Case: DIA - Foundational Military Intelligence & Order of Battle

## Mission Context
The Defense Intelligence Agency (DIA) manages the foundational military intelligence for the DoD. Maintaining an accurate, real-time Order of Battle (OB) for adversaries is critical for warfighter readiness.

## Challenge
*   **Stale Data:** Traditional OB databases are manually updated and often lag behind reality.
*   **Grey Zone Warfare:** Adversaries use paramilitary and irregular forces that don't fit into rigid military hierarchies.
*   **Equipment Identification:** Rapid proliferation of new weapons systems requires constant updating of equipment libraries.

## Summit Solution: Dynamic Order of Battle Management

Summit maintains a living, graph-based Order of Battle that updates dynamically based on incoming reporting.

### Key Capabilities Applied
1.  **Hierarchical Graph Modeling:** Natively models complex military hierarchies (Corps -> Division -> Brigade) and non-standard command structures.
2.  **Equipment Tracking:** Links units to specific equipment holdings (e.g., T-90 Tanks, S-400 Batteries) and tracks their readiness status.
3.  **Readiness Assessment:** Aggregates maintenance logs, training reports (OSINT), and deployment cycles to estimate unit combat effectiveness.

## Operational Workflow

1.  **Ingestion:** Summit ingests daily situation reports, satellite imagery analysis, and social media feeds regarding a specific theater.
2.  **Entity Extraction:** The "Content Analyzer" extracts unit names (e.g., "4th Guards Tank Division") and equipment sightings from unstructured text.
3.  **Graph Update:** The system suggests updates to the OB graph: "High confidence that 4th GTD has deployed to Field Garrison X."
4.  **Supply Chain Vulnerability:** An analyst queries the graph to find the sole supplier of spare parts for the unit's communications gear, identifying a potential non-kinetic target.
5.  **War Gaming Support:** The graph exports the current OB state directly into simulation systems for war gaming scenarios.

## Impact
*   **Real-Time Fidelity:** Moves OB from a quarterly product to a daily living picture.
*   **Logistics Intelligence:** Exposes the "tail" behind the "tooth," revealing supply chain vulnerabilities.
*   **Irregular Warfare Support:** Capable of modeling militia groups and insurgent cells alongside conventional forces.
