# Gossip Auditors

Independent auditors fetch signed tree heads and log ranges from the transparency log. They recompute Merkle roots and alert on any inconsistency or missing entry.

## Protocol
- Periodically GET latest STH
- Retrieve new entries and verify inclusion proofs
- Publish health metrics and alerts

Fork or gap detection triggers notifications to operators and Slack webhooks.
