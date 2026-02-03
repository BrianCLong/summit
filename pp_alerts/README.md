# Privacy-Preserving Alerts (pp_alerts)

This module implements a privacy-preserving graph neural network pipeline for network intrusion detection (NIGNN). It separates graph topology (metadata-sensitive) from sensitive feature values (highly sensitive), using additive secret sharing to protect the latter.

## Architecture

*   **Topology**: Stored as pseudonymous nodes and edges.
*   **Features**: Stored as additive secret shares distributed across trustees.
*   **Governance**: Deny-by-default gates prevent plaintext sensitive fields from entering the pipeline.

## Evidence

Evidence artifacts are generated in `evidence/` and registered in `evidence/index.json`.

## References

*   A Privacy-Preserving Graph Neural Network for Network Intrusion Detection (IEEE TDSC)
