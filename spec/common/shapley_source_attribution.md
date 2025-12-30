# Shapley-Style Source Attribution

This document outlines the Shapley-style attribution mechanics for intelligence decision outputs, including budgeting and counterfactual support.

## Inputs

- **Decision request:** entity identifier, decision function identifier, policy context, and time window.
- **Signals:** normalized threat indicators from multiple sources with provenance metadata and schema versions.

## Attribution Procedure

- **Decision evaluation:** run the decision function over all signals to obtain the baseline decision output.
- **Marginal contribution scoring:** approximate Shapley values using a sampling budget limiting permutations; include caching keyed by entity and replay token.
- **Counterfactuals:** compute removal-based outputs for selected sources to expose concentration risk.
- **Proof budget:** bound evidence bytes or count to extract a minimal support set.

## Artifacts

- **Attribution artifact:** decision output, marginal contribution scores, minimal support set, replay token (policy version, snapshot, index version), and Merkle root over signal hashes.
- **Audit hooks:** optional TEE attestation quote and signed policy decision tokens binding subject context and purpose.

## Governance

- **Alerts:** emit when a single source exceeds a concentration threshold.
- **Reuse:** cache marginal scores by entity + replay token to avoid recomputation.
