# R2 Phishing Cluster Discovery

## Objective
Detect and mitigate phishing clusters using graph analysis.

## Steps

1. **Identify Cluster**: Query the graph for high-density, low-tenure node clusters connected to known bad actors.
   - *Proof*: Execute `check_cluster_density.py` and log the output.
2. **Freeze Assets**: Apply a freeze policy to all nodes in the identified cluster.
   - *Proof*: Verify freeze status via the Policy API.
3. **Notify Users**: Send security notifications to affected users.
   - *Proof*: Check notification service logs for delivery confirmation.
4. **Archive Evidence**: Export the subgraph and generated proofs to the Provenance Ledger.
   - *Proof*: Verify receipt in the `provenance/` directory.
