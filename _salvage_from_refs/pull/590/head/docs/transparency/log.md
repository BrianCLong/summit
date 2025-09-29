# Entitlement Transparency Log

Entitlements are recorded in an append-only Merkle log.

- Each issue and revoke event adds a hashed leaf
- Clients verify inclusion against a Signed Tree Head (STH)
- Revocations require a log entry and proof before denial
