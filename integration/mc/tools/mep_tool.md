# MEP Tool

CLI for partitioning OSINT scan results into evidence shards.

- Inputs: scan ID, policy specification, recipient list, egress budgets.
- Outputs: shard manifest, per-recipient evidence shards, policy decision tokens, replay token.
- Options: `--alt-policy` to generate counterfactual partitions and report information loss.
