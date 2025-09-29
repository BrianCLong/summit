# Threat Model (STRIDE)

- **Spoofing:** token theft → short‑lived JWT + rotation; mTLS between services.
- **Tampering:** signed evidence refs; WORM bucket option; audit trail in Neo4j.
- **Repudiation:** immutable runbook logs; user/action timestamps.
- **Information Disclosure:** ABAC policies; row‑level filters in resolvers.
- **DoS:** rate limits per connector; query guards (max depth, node/rel caps).
- **Elevation of Privilege:** admin‑only schema mutations; least‑privilege service accounts.