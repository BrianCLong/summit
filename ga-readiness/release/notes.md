# Release Notes - v1.0.0 (GA)

**Release Date:** 2025-10-31
**Tag:** `v1.0.0`

## Highlights
*   **DeepAgent 1.0:** Autonomous research with provenance tracking.
*   **PsyOps Defense:** Real-time disinformation detection.
*   **GraphRAG:** Knowledge-graph augmented generation for high-fidelity answers.

## Breaking Changes
*   API: `/api/v1/search` now requires `tenant_id` header.
*   Ingest: Legacy JSON format deprecated; strictly enforced schema validation enabled.

## Known Issues
*   **Neo4j Write Latency:** Bulk ingestion of >1M nodes may see spikes. Recommendation: Use batch size < 5000.
*   **IE11 Support:** Dropped.

## Sign-Off
*   [ ] Engineering Lead
*   [ ] Product Manager
*   [ ] Security Officer
