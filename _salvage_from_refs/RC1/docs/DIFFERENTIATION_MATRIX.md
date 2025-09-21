# Differentiation Matrix (Shared vs Unique vs Fusion)

This translates your research into build targets and messaging.

| Capability | Shared (20+) | Unique (1–5) | IntelGraph Fusion (What we ship) |
|---|---|---|---|
| Threat Intelligence | ✓ |  | TI as entities/IOCs with temporal validity + confidence; automated enrichment via connectors. |
| Data Integration | ✓ |  | Connector SDK with declarative mappings; streaming + batch; schema‑on‑read. |
| AI/ML | ✓ |  | GraphRAG + agentic runbooks; model cards + XAI. |
| Visualization | ✓ |  | 2D/3D graph views, timeline, path explainers; evidence panels with provenance. |
| OSINT Gathering | ✓ |  | Pluggable sources (Wiki demo at MVP); roadmap: dark web feeds, social APIs. |
| Real‑Time Monitoring | ✓ |  | Stream ingestion → entity/edge updates, alerting on pattern matches. |
| Risk/Compliance | ✓ |  | Policies as graph constraints; rule packs for KYC/AML, sanctions. |
| Graph Database | ✓ | **Neo4j** index‑free adjacency | Neo4j backend, optional JanusGraph later. |
| Graph Query Language |  | **Cypher (Neo4j)** | Cypher + GraphQL gateway. |
| GraphRAG / GenAI |  | **Neo4j** | Native GraphRAG over subgraphs; retrieval rationale paths. |
| Agentic AI |  | **Splunk** | Runbooks as DAGs calling graph queries + tools; replayable. |
| Custom Crawling |  | **Maltego** | Connector SDK + crawling profiles. |
| Digital Forensics |  | Siren, Maltego | DFIR adapters later; artifact entity types defined now. |
| Dynamic Exploration |  | Quantexa | Incremental expansion + similarity edges. |
| Imperfect Data Tools |  | Quantexa | Confidence + lineage; anomaly heuristics tolerate gaps. |
| OpenTelemetry |  | Splunk | OTel collector → entity mapping (host, process, user). |