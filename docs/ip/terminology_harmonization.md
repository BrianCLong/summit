# Terminology Harmonization (IP Drafting)

This document defines the core terms used in the defense claims (C91–C120 and S91–S120) to ensure antecedent basis and consistency.

- **Source Record**: A structured data object representing a primary ingested item, comprising a source identifier, collection timestamp, and collection method identifier.
- **Lineage Node**: A vertex in the narrative operating graph or source lineage graph representing either a source record or a derived state/transformation.
- **Lineage Manifest**: A structured record enumerating the sources, transformations, and model versions contributing to a candidate defense action.
- **Bundle Hash**: A cryptographic digest of a versioned collection of policies, models, or tools, used for integrity verification and attestation.
- **Attestation Record**: A cryptographically signed statement asserting the validity and approval of a specific bundle hash for use in defined environments.
- **Rollout Stage**: A discrete phase in a staged deployment process (e.g., test, production) governed by validation metrics and rollout criteria.
- **Robustness Score**: A quantitative metric representing the resilience of a defense action against simulated adversarial counter-narratives.
- **Red-Team Agent**: An automated or human-guided agent configured to generate adversarial scenarios for simulation and robustness evaluation.
- **Replay Manifest**: A bound record of a counterfactual simulation, including inputs, transition functions, and predicted outcomes, linked to a snapshot hash.
- **Snapshot Hash**: A cryptographic digest of the state of the narrative operating graph at a specific point in time.
