# Shard Format

Evidence shards are scoped payloads representing policy-compliant subsets of scan outputs.

## Structure

- **Metadata:** recipient scope ID, policy decision token, shard version.
- **Payload:** selective disclosure content (redacted, aggregated, hashed).
- **Commitment:** hash of payload with per-recipient salt.
