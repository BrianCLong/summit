# IntelGraph

**Synthetic Fusion for Intelligence Analysis.**

IntelGraph unifies OSINT, graph analytics, GenAI/GraphRAG, and agentic runbooks to deliver end‑to‑end Threat‑to‑Response (TDIR) in one open, explainable platform.

### Why now

Fragmented tools force swivel‑chair investigations. IntelGraph fuses **Shared** features (TI, SIEM integration, visualization, entity resolution, etc.) with **Unique** edges (GraphRAG, Agentic AI, index‑free adjacency, dynamic exploration) into a cohesive analyst experience.

### MVP Scope (30 days)

- Neo4j persistence (temporal edges + confidence)
- Streamlit UI (neighborhood, multi‑hop path, timeline)
- OSINT connector framework (Wikipedia demo)
- GenAI‑assisted Q&A over graph (GraphRAG prototype)

See `docs/ROADMAP.md` for next phases and `docs/ARCHITECTURE.md` for system design.

### Persona Guides

- [IntelGraph Investigator & Analyst Guide](guides/intelgraph-user-guide.md) – end-to-end walkthroughs for graph queries, data ingestion, and visualization workflows.
- [Maestro Conductor Build & Orchestration Guide](guides/maestro-conductor-user-guide.md) – build, deploy, and governance playbooks across Kubernetes, Helm, and ArgoCD.

## Documentation Structure

- `docs/` – Active guides, architecture references, and onboarding material
- `docs/archive/` – Historical documents retained for reference only

Refer to [`docs/archive/README.md`](archive/README.md) for archive guidelines.
