# TRACER Tool

CLI wrapper to submit narrative clusters for temporal role attribution.

- Inputs: narrative cluster ID, time window, topic coherence threshold, capacity/budget settings.
- Outputs: role certificate JSON, support subgraph, Merkle root, replay token.
- Options: `--counterfactual actorId` to compute delta roles after removal.
