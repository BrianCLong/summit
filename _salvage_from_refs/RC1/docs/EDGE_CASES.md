# Edge Case Handling Guide

- **Imperfect/Disparate Data:** Confidence scores on entities/edges; lineage/provenance on every write; query planners prefer high‑confidence paths, degrade gracefully.
- **Large‑Scale Data:** Shard by entity type or region; use Neo4j fabric or read replicas; batch loaders; compress properties (e.g., bloom filters for seen IOCs).
- **Mission‑Critical HA:** Active‑active topology, 99.95% SLO target; rolling upgrades; chaos scenarios documented.
- **Niche Detection (deepfakes, disinfo):** Specialized connectors + runbooks; model risk register; human verification steps.
- **Resource‑Constrained:** One‑click Streamlit UX; preset templates; on‑device mini‑models optional.
- **Regulatory/Compliance:** ABAC policies + DP guards; data retention TTLs.
- **AI Edges & Failures:** Model cards, eval sets, drift monitors; fallback to symbolic rules if model confidence < threshold.