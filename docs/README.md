# Summit: Intelligent Automation Stack

**Deployable-first IntelGraph + Automation with Governance, Observability, and Provenance.**

Summit (formerly IntelGraph) unifies OSINT, graph analytics, GenAI/GraphRAG, and agentic runbooks into a single, deployable platform. It is designed for organizations that need rigorous auditability, "human-in-the-loop" decision making, and rapid time-to-value.

### What is Summit?

Summit is a **deployable-first stack** that combines:
- **IntelGraph**: A knowledge graph engine (Neo4j) for storing entities, relationships, and temporal data.
- **Maestro**: An orchestration layer for managing agentic workflows and evidence gathering.
- **Provenance Ledger**: A cryptographically verifiable log of all automated and human decisions.
- **Observability**: Built-in OpenTelemetry, Prometheus, and Grafana integration.

### The Golden Path

Get from zero to insight in minutes:

1. **Investigation**: Start a new case or mission.
2. **Entities**: Ingest or manually create people, organizations, and assets.
3. **Relationships**: Define how entities connect (e.g., `WORKS_FOR`, `LOCATED_IN`).
4. **Copilot**: Use the AI assistant to traverse the graph and suggest connections.
5. **Results**: Generate an evidence-backed report with a single click.

### Quick Start

```bash
# 1. Clone
git clone https://github.com/BrianCLong/summit.git

# 2. Bootstrap (Setup env & dependencies)
make bootstrap

# 3. Run Stack
make up

# 4. Verify
make smoke
```

See [Get Started](/get-started/quickstart) for detailed instructions.

### Why Summit?

| Feature | Benefit |
| :--- | :--- |
| **Deployable-First** | Clone and run. No SaaS lock-in. You own the data. |
| **GraphRAG** | AI that understands _structure_, not just text chunks. |
| **Governance** | Every AI decision is logged, auditable, and reversible. |
| **Agentic** | Runbooks that execute themselves, with human oversight. |

---

### Documentation

- **[Get Started](/get-started/quickstart)**: Installation and "Hello World".
- **[Governance & Provenance](/governance/provenance)**: How we ensure trust and auditability.
- **[Architecture](/maestro/ARCHITECTURE)**: Deep dive into the system internals.
- **[API Reference](/intelgraph/api/core/1.0.0)**: GraphQL and REST endpoints.
