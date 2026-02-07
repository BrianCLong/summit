# Standards: Self-Evolving Agents

## Taxonomy (ITEM:CLAIM-01)
Organized by **what/when/how** to evolve:
- **Models**: Fine-tuning or parameter updates.
- **Memory**: Rule updates or surgical history pruning.
- **Tools**: Dynamic selection or reordering.
- **Architecture**: Concierge/DMoE runtime restructuring.

## Mechanism Menu
- **Intra-test-time adaptation**: Adapting during a single task run.
- **Inter-test-time adaptation**: Adapting based on historical performance across tasks.

## Safety & Scalability (ITEM:CLAIM-02)
- Bounds on evolution steps.
- Deterministic evidence requirements.
- Drift detection and rollback triggers.
