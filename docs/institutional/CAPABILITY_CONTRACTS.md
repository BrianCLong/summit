# Capability & Guarantee Contracts

This document defines the explicit contracts between the platform and the consuming organization. These are engineering guarantees, not marketing promises.

## 1. Capability Contracts

### A. Analytics & Intelligence
*   **Contract:** Deterministic Reproduction.
*   **Definition:** Given the same input data, model version, and seed, the system will produce identical analytic outputs.
*   **Limitation:** Non-deterministic LLM calls are wrapped in retry/consensus logic to bound variance, but perfect zero-temperature reproducibility depends on the provider model.

### B. Autonomy (Tiered)
*   **Contract:** Bounded Execution.
*   **Definition:** Autonomous agents operate within strict, pre-defined spatial, temporal, and fiscal bounds.
*   **Tiers:**
    *   *Tier 0 (Passive):* Analysis only. No state mutation.
    *   *Tier 1 (Assisted):* Proposes actions for human approval.
    *   *Tier 2 (Delegated):* Executes standard pre-approved runbooks.
    *   *Tier 3 (Adaptive):* Dynamic planning within strict policy guardrails. (Requires explicit "Emergency" authorization).

### C. Simulation
*   **Contract:** Best-Effort Fidelity.
*   **Definition:** Simulations are predictive models based on available data. They are probabilistic forecasts, not certainties.
*   **Metric:** All simulations output a `confidence_score` and `variance_range`.

### D. Plugins & Extensions
*   **Contract:** Sandboxed Isolation.
*   **Definition:** Plugins execute in isolated containers (WASM/Docker) with no direct access to the host kernel or raw database credentials.
*   **Constraint:** Plugins communicate strictly via defined APIs.

### E. Governance
*   **Contract:** Immutable History.
*   **Definition:** The Provenance Ledger is append-only. No administrator can retroactively modify the audit log without breaking cryptographic chains.

---

## 2. Service Level Guarantees (SLGs)

### Guaranteed (SLA-Backed)
*   **Data Integrity:** No silent data corruption. All writes are ACID compliant.
*   **Audit Completeness:** 100% of write operations generate a ledger entry.
*   **Policy Enforcement:** 100% of requests pass through the Policy Decision Point (PDP).

### Best-Effort
*   **LLM Latency:** Dependent on upstream providers (OpenAI, Anthropic, Local).
*   **Real-time Ingestion:** Subject to network conditions and backpressure limits.

### Unsupported
*   **Undocumented APIs:** Private internal methods are subject to change without notice.
*   **Direct DB Writes:** Bypassing the application layer voids all warranties and support.

---

## 3. Support & Maintenance

*   **LTS Releases:** Supported for 24 months with security patches.
*   **Standard Releases:** Supported for 6 months.
*   **Critical Vulnerabilities:** Patched within 48 hours of disclosure for all supported versions.
