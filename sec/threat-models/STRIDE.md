# STRIDE Summary (IntelGraph)
- Spoofing: OIDC strict audience/issuer; mTLS for internal gRPC; JWKS pinning.
- Tampering: Provenance manifests signed (JWS); immutability via append-only logs.
- Repudiation: Correlated audit IDs; reason-for-access required.
- Information Disclosure: ABAC + `@requiresAuthority`; license registry on export hooks.
- Denial of Service: CostGuard + per-IP rate limiters; circuit breakers.
- Elevation of Privilege: RBAC separation; step-up auth (WebAuthn) for exports.
