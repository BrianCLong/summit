# Role Certificate Structure

- **Actor-role assignments:** selected based on role scores.
- **Support subgraph:** minimal nodes/edges contributing to assignments under explanation budget.
- **Commitment:** Merkle root over support identifiers; optional TEE attestation quote.
- **Replay token:** snapshot ID, schema version, index version, seed.
- **Counterfactual:** optional delta in role scores after removing a candidate actor.
