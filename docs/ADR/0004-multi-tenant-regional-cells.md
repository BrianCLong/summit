# ADR 0004: Adopt Multi-Tenant SaaS with Regional Cells

- **Context:** We must launch day-1 with a regulated SaaS default that still honours data residency and isolation mandates.
- **Decision:** Operate a shared control plane per region with tenant isolation at API, topic, and schema boundaries; enable optional dedicated data-plane slices for high-side tenants within the same cell.
- **SLO Impact:** Maintains API success rate 99.9% by keeping shared control plane horizontally scalable; isolates latency regressions so p95 <1.5s remains per-cell not global.
- **Failure Domain:** Blast radius constrained to a single regional cell—control plane degradation does not cascade to other regions because no cross-cell sync is required for live traffic.
- **Consequences:** Simplifies onboarding and interoperability, but requires rigorous tenancy testing and policy enforcement to prevent data leakage.
