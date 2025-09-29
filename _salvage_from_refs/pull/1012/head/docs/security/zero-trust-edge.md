# Zero-Trust Edge

- mTLS enforced by `requireMtls` in the gateway.
- JWT tokens validated by `ZeroTrustGuard` middleware which attaches `tenantId`.
- JWKS rotated every 24h with drift warning at 20h via `JwksRotator`.
- Policy caches salted per tenant.

Integration hook: attach `ZeroTrustGuard` in Express before GraphQL handler.
