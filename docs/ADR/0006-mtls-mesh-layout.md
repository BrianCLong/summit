# ADR 0006: Enforce mTLS via SPIFFE/SPIRE Service Mesh

- **Context:** Tenancy boundaries and regulatory controls require workload identity and encrypted east-west traffic from day-1.
- **Decision:** Deploy SPIFFE/SPIRE as mesh CA issuing SVIDs to gateway and services; enforce Envoy sidecars with automatic certificate rotation and OPA authorization filters.
- **SLO Impact:** Slight latency overhead (<5ms) still keeps p95 API latency within 1.5s target while enabling rapid revocation to protect availability.
- **Failure Domain:** Mesh control plane runs active/standby per region; compromise or outage is confined to a single cell and can fail open for read-only traffic under emergency policy.
- **Consequences:** Increases operational complexity and requires tight integration with CI/CD to manage identities, but materially reduces spoofing and elevation risks.
