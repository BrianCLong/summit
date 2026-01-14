# Summit-Flavored Memory Design Checklist

This checklist defines the operational requirements for implementing the [Persistent Memory Fabric](./persistent-memory-fabric.md). It operationalizes core memory principles—governance, unification, and selectivity—ensuring the system serves as a governed resource rather than a data dump.

## 1. Interfaces & Architecture

- [ ] **Unified Agent Interface**: Expose both Short-Term (STM) and Long-Term (LTM) memory through a single API surface to the agent (e.g., `memory.query(context)`).
- [ ] **Explicit Operations**: Implement memory interactions as discrete, traceable tool calls:
  - `store(content, tags, horizon)`
  - `retrieve(query, filters)`
  - `update(id, delta)`
  - `summarize(context_window)`
  - `delete(id, reason)`
- [ ] **Horizon Abstraction**: Ensure the interface abstracts the underlying store (Redis for STM, Vector/Graph for LTM) while allowing the agent to specify intent (e.g., "remember this for the project duration").
- [ ] **Traceability**: All memory operations must emit structured logs including the actor, intent, and resulting IO for downstream auditing and "Perspective Prism" analytics.

## 2. Schemas & Data Structures

- [ ] **Structured Storage**: Avoid raw text dumps. Use strict schemas for LTM entries:
  - **Vectors**: For semantic similarity search.
  - **Metadata**: `timestamp`, `source_agent`, `provenance_id`, `tags`.
  - **Graph Relations**: `related_entity_id`, `relationship_type` (e.g., "blocks", "depends_on").
- [ ] **Entity-Task-Outcome Model**:
  - **Entities**: Users, Systems, key concepts.
  - **Tasks**: Goals, active plans, current state.
  - **Outcomes**: Success/Failure status, "lessons learned" summaries.
- [ ] **Governance Metadata**: Every memory item must include:
  - `access_policy`: Who/what can read this.
  - `retention_policy`: When this should be pruned (e.g., "end of session", "permanent").
  - `audit_hash`: Link to the "Chronicle Delta Ledger" or similar provenance artifact.

## 3. Policies & Governance

### Ingestion (Write)
- [ ] **Selective Addition**: Only store experiences that are:
  - **High-Quality**: Verified correct outputs or approved plans.
  - **Representative**: Patterns likely to recur, not one-off noise.
  - **Novel**: Information not already present in LTM.
- [ ] **Agent-Driven Decisioning**: The agent (not a background heuristic) determines *when* to write to LTM based on task success or explicit user instruction.

### Maintenance (Pruning)
- [ ] **Regular Pruning**: Implement scheduled jobs to remove:
  - **Misaligned Experiences**: Contexts that led to poor outcomes or errors.
  - **Stale Data**: Information superseded by newer updates (e.g., old drafts).
  - **Low-Utility Items**: Memories rarely retrieved or with low relevance scores.
- [ ] **Redaction & Compliance**: Enforce immediate deletion/tombstoning of sensitive data upon request or policy violation detection.

### Retrieval (Read)
- [ ] **Hybrid Search**: Support queries combining semantic similarity (Vector) with structural filters (Graph/SQL) to prevent hallucination on specific facts.
- [ ] **Context Budgeting**: Optimize retrieval size to maximize task success while minimizing token usage (penalize "context stuffing").

## 4. Observability & Safety

- [ ] **Memory Audits**: Periodic automated reviews of stored memories to detect drift, bias, or toxic patterns.
- [ ] **Access Logs**: strict logging of *who* accessed *what* memory and *why*, integrated with the "Fabric Intelligence Plane".
- [ ] **Fail-Safe Modes**: Mechanisms to disable LTM retrieval if memory poisoning or corruption is detected.
