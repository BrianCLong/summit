# Zero-Trust Mesh (Prompt #68)

- **Feature flag:** `ZTM_ENABLED` (default: false)
- **Capabilities:** SPIFFE/SPIRE SVID issuance/rotation; sidecars with mTLS everywhere; policy claim injectors; cert hot-reload
- **Defaults:** cert TTL 24h; rotate at 12h; deny-by-default outbound; break-glass dual-control
- **Tests:** mTLS conformance; chaos drills (CA rotate, node drain); handshake p95 ≤50ms; policy claim coverage
