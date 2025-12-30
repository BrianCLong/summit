# Origin Certificate

## Contents
- Candidate origin set with node identifiers and activation estimates.
- Uncertainty measures (posterior probabilities, confidence intervals, likelihood ratios).
- Explanation subgraph constrained by explanation budget.
- Merkle root over evidence nodes and timestamps.
- Replay token (seed, schema/index versions, snapshot id, time window).
- Attestation quote when executed inside TEE.
- Optional counterfactual suppression plan summary.

## Verification
- Transparency log entry stores certificate hash, replay token, and attestation status.
- Replay service re-runs inverse inference under same budgets and validates commitments.
