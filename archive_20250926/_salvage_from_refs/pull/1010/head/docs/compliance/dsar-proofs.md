# DSAR Proof Handling

`dsar_proofs.py` removes ZK proof artifacts linked to a data subject.

1. Locate proofs by subject identifier.
2. Purge artifacts and update transparency ledger.
3. Emit a signed JSON receipt for the requester.
