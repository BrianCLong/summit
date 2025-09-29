# Sprint 11 Test Plan

## Scenarios
1. **Multi-region failover**
   - Simulate primary outage and promote secondary.
2. **mTLS/JWKS rotation**
   - Verify mTLS handshake required and JWKS rotates every 24h.
3. **Residency gates**
   - Replication blocked for tenants outside allowlist.
4. **Chaos drills**
   - Network partition, disk throttle, Neo4j leader loss.
5. **Performance**
   - Confirm p95 latency and failover RTO/RPO metrics.

## Tools
- Jest, Playwright, custom chaos scripts.

## Exit Criteria
- All scenarios pass in staging with audit logs.
