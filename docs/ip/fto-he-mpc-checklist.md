# FTO checklist: Homomorphic Encryption (HE) + MPC stack

Purpose: clear freedom-to-operate risks before Phase 2 partner pilots that use HE/MPC/ZK components.

## Scope inventory

- HE: libraries (e.g., SEAL/CKKS/BFV), encryption parameters, result caching, encrypted embedding flows.
- MPC: protocol families (additive/secret sharing), batching strategies, threshold choices.
- ZK: membership proofs, computation correctness proofs for training/aggregation.
- Integration: Tendermint or similar consensus; DP budgeting layer; audit logging.

## Search and review

- Patent search queries: combine “homomorphic”/“CKKS”/“encrypted gradient”/“federated learning”, “MPC threat correlation”, “ZK proof of aggregation correctness”.
- Data sources: USPTO, EPO, WIPO, Lens, IEEE/ACM; include open-source repos with patent grants.
- Flag licenses: Apache-2.0 (grant), GPL/AGPL (copyleft), commercial/field-of-use limits.

## Risk triage

- Classify findings: green (compatible), yellow (design-around or license), red (blocking).
- Document specific claims at risk and overlapping embodiments.
- Propose mitigations: param changes, protocol swap, component isolation, or license path.

## Controls and gates

- Counsel review of yellow/red items before pilot data flows.
- Partner pilot go/no-go depends on cleared HE/MPC stack and export-control review.
- Record decisions in risk register; update weekly until pilots complete.
