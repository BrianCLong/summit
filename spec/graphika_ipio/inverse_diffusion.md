# Inverse Diffusion Workflow

## Steps
1. Receive time-bounded interaction events for a narrative cluster.
2. Build temporal propagation graph with actor/content nodes and time-stamped edges.
3. Fit diffusion model (IC/LT/Hawkes) using observed activation sequences.
4. Optimize inverse inference:
   - Minimize activation-time reconstruction loss.
   - Subject to cardinality budget for minimal origin sets.
   - Enforce computation budget constraints.
5. Quantify uncertainty: posterior over origin nodes, origin set size intervals, likelihood ratios for alternatives.
6. Generate origin certificate with explanation subgraph under explanation budget and Merkle commitment to evidence nodes.
7. Register certificate with transparency log and hand-off replay token.

## Counterfactuals
- Counterfactual suppression plans remove candidate origin nodes to estimate impact on propagation.
- Alternative origin sets surfaced when near-optimal to inform governance.
