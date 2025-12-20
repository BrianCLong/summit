# ADR 0008: Centralise Policy Governance with OPA Bundles

- **Context:** Regulated deployments must guarantee consistent authorization and tenancy guardrails across all entry points.
- **Decision:** Use OPA as the policy engine for gateway and services, delivering signed bundles via GitOps; policy changes require dual approval and automated regression tests.
- **SLO Impact:** Prevents authorization drift that could trigger mass incident while keeping policy evaluation latency <20ms to stay under the 1.5s p95 goal.
- **Failure Domain:** Each region mirrors bundles from versioned storage; policy sync failure isolates to the region and falls back to last-known-good bundle to avoid global outages.
- **Consequences:** Demands rigorous policy CI and signer management, but provides auditable enforcement for tenancy, residency, and offline export controls.
