# Standards: Self-Evolving Agents

## Taxonomy (ITEM:CLAIM-01)
Agents are classified by:
- **What** to evolve: Models, Memory, Tools, Architecture.
- **When** to evolve: Intra-run vs Inter-run.
- **How** to evolve: Feedback-driven operators.

## Safety & Governance (ITEM:CLAIM-02, ITEM:CLAIM-08)
- **Controlled Self-Evolution**: Bounded operators only.
- **Deny-by-Default**: Every mutation operator must be explicitly allowlisted.
- **Reproduction**: Evidence must be deterministic and byte-identical under fixed seeds.

## Adaptive Orchestration (ITEM:CLAIM-03)
- **Concierge Router**: DMoE implementation for sub-agent selection.
- **LRU Eviction**: Specialist cache management.
- **Meta-cognition Engine**: Capability gap detection.

## Data Flywheel (ITEM:CLAIM-04)
-Production loop for continuous refinement based on evaluation signals.
